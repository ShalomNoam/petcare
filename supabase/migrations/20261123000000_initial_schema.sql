-- ============================================================================
-- תיק חיה – initial schema (stage 1: owners only)
--
-- Security model:
--   * Every table has Row Level Security enabled.
--   * A user can only see and change rows of pets they own.
--   * Files live in the private "pet-files" bucket under "<user_id>/...",
--     and users can only touch their own folder.
--   * Deleting a user (auth.users) cascades to all their data.
--     Storage files are removed by the delete-account Edge Function (step 8).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  phone        text,
  first_name   text check (char_length(first_name) between 1 and 60),
  -- Israeli ID (ת"ז) – optional, 9 digits
  national_id  text check (national_id ~ '^[0-9]{9}$'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'Owner profile. One row per auth user, created automatically on signup.';

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile row automatically when a user signs up with phone + SMS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- pets
-- ---------------------------------------------------------------------------

create table public.pets (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 60),
  species      text not null check (species in ('dog', 'cat', 'rabbit', 'bird', 'other')),
  breed        text,
  sex          text not null check (sex in ('male', 'female', 'unknown')),
  birth_date   date,
  photo_path   text,               -- path inside the pet-files bucket
  chip_number  text,
  neutered     boolean,            -- null = unknown
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index pets_owner_id_idx on public.pets (owner_id);

create trigger pets_updated_at before update on public.pets
  for each row execute function public.set_updated_at();

-- True when the current user owns the pet. SECURITY DEFINER so policies on
-- child tables don't recurse through the pets policy.
create or replace function public.owns_pet(p_pet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.pets
    where id = p_pet_id and owner_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- documents – the original file is always kept
-- ---------------------------------------------------------------------------

create table public.documents (
  id                 uuid primary key default gen_random_uuid(),
  pet_id             uuid not null references public.pets (id) on delete cascade,
  file_path          text not null,         -- "<user_id>/<pet_id>/<uuid>.<ext>"
  mime_type          text not null,
  title              text,
  doc_type           text check (doc_type in ('visit_summary', 'blood_test', 'prescription', 'vaccination_record', 'surgery_report', 'other')),
  doc_date           date,
  -- AI extraction lifecycle: nothing enters the record until the owner confirms.
  extraction_status  text not null default 'none'
                     check (extraction_status in ('none', 'processing', 'ready', 'failed', 'confirmed')),
  extracted          jsonb,                 -- raw structured result from the AI
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index documents_pet_id_idx on public.documents (pet_id);

create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

create or replace function public.owns_document(p_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.documents d
    join public.pets p on p.id = d.pet_id
    where d.id = p_document_id and p.owner_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Medical record tables.
-- Each row has `source` ('owner' = typed by the owner → "מדווח על ידי הבעלים",
-- 'document' = came from an uploaded document) and `document_id` linking to it.
-- ---------------------------------------------------------------------------

-- Important alerts: shown at the top of the record in a strong color.
create table public.alerts (
  id           uuid primary key default gen_random_uuid(),
  pet_id       uuid not null references public.pets (id) on delete cascade,
  kind         text not null check (kind in ('allergy', 'chronic', 'anesthesia', 'behavior', 'other')),
  title        text not null check (char_length(title) between 1 and 200),
  details      text,
  source       text not null default 'owner' check (source in ('owner', 'document')),
  document_id  uuid references public.documents (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Regular medications.
create table public.medications (
  id           uuid primary key default gen_random_uuid(),
  pet_id       uuid not null references public.pets (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 200),
  dosage       text,
  frequency    text,
  start_date   date,
  end_date     date,
  active       boolean not null default true,
  notes        text,
  source       text not null default 'owner' check (source in ('owner', 'document')),
  document_id  uuid references public.documents (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

-- History: surgeries, hospitalizations, visits and diagnoses (timeline).
create table public.events (
  id           uuid primary key default gen_random_uuid(),
  pet_id       uuid not null references public.pets (id) on delete cascade,
  kind         text not null check (kind in ('surgery', 'hospitalization', 'visit', 'diagnosis')),
  event_date   date not null,
  title        text not null check (char_length(title) between 1 and 200),
  diagnosis    text,
  clinic       text,
  notes        text,
  source       text not null default 'owner' check (source in ('owner', 'document')),
  document_id  uuid references public.documents (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Vaccines and preventive treatments (deworming, flea & tick).
create table public.vaccinations (
  id           uuid primary key default gen_random_uuid(),
  pet_id       uuid not null references public.pets (id) on delete cascade,
  kind         text not null default 'vaccine' check (kind in ('vaccine', 'deworming', 'flea_tick')),
  name         text not null check (char_length(name) between 1 and 200),
  given_on     date not null,
  next_due     date,
  source       text not null default 'owner' check (source in ('owner', 'document')),
  document_id  uuid references public.documents (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (next_due is null or next_due >= given_on)
);

-- Weight over time.
create table public.weights (
  id           uuid primary key default gen_random_uuid(),
  pet_id       uuid not null references public.pets (id) on delete cascade,
  kg           numeric(6, 2) not null check (kg > 0 and kg < 1000),
  measured_on  date not null,
  source       text not null default 'owner' check (source in ('owner', 'document')),
  document_id  uuid references public.documents (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Reminders (local notifications are scheduled on the device; this is the source of truth).
create table public.reminders (
  id               uuid primary key default gen_random_uuid(),
  pet_id           uuid not null references public.pets (id) on delete cascade,
  kind             text not null check (kind in ('vaccine', 'deworming', 'flea_tick', 'medication', 'appointment', 'other')),
  title            text not null check (char_length(title) between 1 and 200),
  due_at           timestamptz not null,
  repeat_interval  text not null default 'none' check (repeat_interval in ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  origin           text not null default 'manual' check (origin in ('auto', 'manual')),
  -- For auto reminders: which record created it (e.g. a vaccination's next_due).
  vaccination_id   uuid references public.vaccinations (id) on delete cascade,
  medication_id    uuid references public.medications (id) on delete cascade,
  done             boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- AI consultation chat, per pet.
create table public.chat_messages (
  id            uuid primary key default gen_random_uuid(),
  pet_id        uuid not null references public.pets (id) on delete cascade,
  role          text not null check (role in ('user', 'assistant')),
  content       text not null,
  -- Set on assistant answers about a symptom: urgent (red) / soon (yellow) / monitor (teal)
  triage_level  text check (triage_level in ('urgent', 'soon', 'monitor')),
  created_at    timestamptz not null default now()
);

-- Indexes on pet_id (used by every RLS check and every screen query)
create index alerts_pet_id_idx        on public.alerts (pet_id);
create index medications_pet_id_idx   on public.medications (pet_id);
create index events_pet_id_date_idx   on public.events (pet_id, event_date desc);
create index vaccinations_pet_id_idx  on public.vaccinations (pet_id);
create index weights_pet_id_date_idx  on public.weights (pet_id, measured_on desc);
create index reminders_pet_id_idx     on public.reminders (pet_id);
create index reminders_due_at_idx     on public.reminders (due_at) where not done;
create index chat_messages_pet_idx    on public.chat_messages (pet_id, created_at);

-- updated_at triggers
create trigger alerts_updated_at       before update on public.alerts       for each row execute function public.set_updated_at();
create trigger medications_updated_at  before update on public.medications  for each row execute function public.set_updated_at();
create trigger events_updated_at       before update on public.events       for each row execute function public.set_updated_at();
create trigger vaccinations_updated_at before update on public.vaccinations for each row execute function public.set_updated_at();
create trigger weights_updated_at      before update on public.weights      for each row execute function public.set_updated_at();
create trigger reminders_updated_at    before update on public.reminders    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles      enable row level security;
alter table public.pets          enable row level security;
alter table public.documents     enable row level security;
alter table public.alerts        enable row level security;
alter table public.medications   enable row level security;
alter table public.events        enable row level security;
alter table public.vaccinations  enable row level security;
alter table public.weights       enable row level security;
alter table public.reminders     enable row level security;
alter table public.chat_messages enable row level security;

-- profiles: own row only (created by trigger, so no insert policy; deleted via auth cascade)
create policy "profiles: read own"   on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- pets: owner only
create policy "pets: read own"   on public.pets for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "pets: insert own" on public.pets for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "pets: update own" on public.pets for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "pets: delete own" on public.pets for delete to authenticated
  using (owner_id = (select auth.uid()));

-- documents: through the pet; the file must sit in the user's own folder
create policy "documents: read own"   on public.documents for select to authenticated
  using (public.owns_pet(pet_id));
create policy "documents: insert own" on public.documents for insert to authenticated
  with check (public.owns_pet(pet_id) and split_part(file_path, '/', 1) = (select auth.uid())::text);
create policy "documents: update own" on public.documents for update to authenticated
  using (public.owns_pet(pet_id))
  with check (public.owns_pet(pet_id) and split_part(file_path, '/', 1) = (select auth.uid())::text);
create policy "documents: delete own" on public.documents for delete to authenticated
  using (public.owns_pet(pet_id));

-- Medical tables: same four policies, all through owns_pet(); a linked
-- document must also belong to the user.
do $$
declare
  t text;
begin
  foreach t in array array['alerts', 'medications', 'events', 'vaccinations', 'weights'] loop
    execute format('create policy "%1$s: read own" on public.%1$I for select to authenticated using (public.owns_pet(pet_id))', t);
    execute format('create policy "%1$s: insert own" on public.%1$I for insert to authenticated with check (public.owns_pet(pet_id) and (document_id is null or public.owns_document(document_id)))', t);
    execute format('create policy "%1$s: update own" on public.%1$I for update to authenticated using (public.owns_pet(pet_id)) with check (public.owns_pet(pet_id) and (document_id is null or public.owns_document(document_id)))', t);
    execute format('create policy "%1$s: delete own" on public.%1$I for delete to authenticated using (public.owns_pet(pet_id))', t);
  end loop;
end;
$$;

create policy "reminders: read own"   on public.reminders for select to authenticated using (public.owns_pet(pet_id));
create policy "reminders: insert own" on public.reminders for insert to authenticated with check (public.owns_pet(pet_id));
create policy "reminders: update own" on public.reminders for update to authenticated using (public.owns_pet(pet_id)) with check (public.owns_pet(pet_id));
create policy "reminders: delete own" on public.reminders for delete to authenticated using (public.owns_pet(pet_id));

-- chat: the app reads history and may clear it; messages are written by the
-- vet-chat Edge Function (service role) so the triage level can't be forged.
create policy "chat: read own"   on public.chat_messages for select to authenticated using (public.owns_pet(pet_id));
create policy "chat: delete own" on public.chat_messages for delete to authenticated using (public.owns_pet(pet_id));

-- ---------------------------------------------------------------------------
-- Grants: signed-in users only. Anonymous users get nothing.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on
  public.pets, public.documents, public.alerts, public.medications, public.events,
  public.vaccinations, public.weights, public.reminders
  to authenticated;
grant select, delete on public.chat_messages to authenticated;

revoke execute on function public.owns_pet(uuid), public.owns_document(uuid), public.handle_new_user() from public, anon;
grant execute on function public.owns_pet(uuid), public.owns_document(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket, each user limited to their own folder "<uid>/..."
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pet-files', 'pet-files', false, 20971520, -- 20 MB
  array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy "pet-files: read own folder" on storage.objects for select to authenticated
  using (bucket_id = 'pet-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "pet-files: upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'pet-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "pet-files: update own folder" on storage.objects for update to authenticated
  using (bucket_id = 'pet-files' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'pet-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "pet-files: delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'pet-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
