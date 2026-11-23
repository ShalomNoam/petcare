/**
 * RLS tests for the schema migration, run against an in-process Postgres
 * (PGlite) with a minimal stand-in for Supabase's auth/storage schemas.
 *
 *   npm run test:db
 *
 * Verifies: user A can never read, change or attach to user B's data,
 * anonymous users see nothing, signup creates a profile, and deleting a user
 * cascades all their rows.
 */
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', 'migrations');

// Minimal Supabase environment: roles, auth.users/auth.uid(), storage tables.
const SUPABASE_STUB = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), phone text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

create schema storage;
create table storage.buckets (
  id text primary key, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id), name text
);
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects to authenticated, service_role;
grant select on storage.buckets to authenticated;

grant usage on schema public to anon, authenticated, service_role;
`;

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';

let db;

/** Run SQL as a signed-in user (or anon when uid is null). */
async function as(uid, sql, params) {
  await db.exec(uid ? `set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);` : `set role anon; select set_config('request.jwt.claim.sub', '', false);`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role;');
  }
}

async function rejects(promise, label) {
  await assert.rejects(promise, /row-level security|permission denied/, label);
}

before(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const file of readdirSync(migrationsDir).sort()) {
    await db.exec(readFileSync(join(migrationsDir, file), 'utf8'));
  }
  // Two users sign up
  await db.query('insert into auth.users (id, phone) values ($1, $2), ($3, $4)', [A, '972500000001', B, '972500000002']);
});

after(async () => db?.close());

describe('signup', () => {
  test('creates a profile with the phone number', async () => {
    const { rows } = await as(A, 'select id, phone from public.profiles');
    assert.deepEqual(rows, [{ id: A, phone: '972500000001' }]);
  });

  test('user can update own name and optional ID, not someone else', async () => {
    await as(A, `update public.profiles set first_name = 'נועם', national_id = '123456789'`);
    const { rows } = await db.query('select first_name from public.profiles where id = $1', [B]);
    assert.equal(rows[0].first_name, null);
  });

  test('national ID must be 9 digits', async () => {
    await assert.rejects(as(A, `update public.profiles set national_id = '12'`), /check constraint/);
  });
});

describe('pets and records isolation', () => {
  let petA;
  let docA;

  before(async () => {
    petA = (await as(A, `insert into public.pets (name, species, sex) values ('רקסי', 'dog', 'male') returning id`)).rows[0].id;
    await as(B, `insert into public.pets (name, species, sex) values ('מיצי', 'cat', 'female')`);
    docA = (await as(A, `insert into public.documents (pet_id, file_path, mime_type) values ($1, $2, 'application/pdf') returning id`, [petA, `${A}/${petA}/a.pdf`])).rows[0].id;
    await as(A, `insert into public.vaccinations (pet_id, name, given_on, next_due, source, document_id) values ($1, 'כלבת', '2026-01-01', '2027-01-01', 'document', $2)`, [petA, docA]);
    await as(A, `insert into public.alerts (pet_id, kind, title) values ($1, 'allergy', 'אלרגיה לעוף')`, [petA]);
  });

  test('each user sees only their own pets', async () => {
    assert.deepEqual((await as(A, 'select name from public.pets')).rows, [{ name: 'רקסי' }]);
    assert.deepEqual((await as(B, 'select name from public.pets')).rows, [{ name: 'מיצי' }]);
  });

  test('owner_id defaults to the current user', async () => {
    const { rows } = await db.query('select owner_id from public.pets where id = $1', [petA]);
    assert.equal(rows[0].owner_id, A);
  });

  test("B cannot see A's records", async () => {
    for (const t of ['documents', 'alerts', 'vaccinations', 'medications', 'events', 'weights', 'reminders', 'chat_messages']) {
      const { rows } = await as(B, `select * from public.${t}`);
      assert.equal(rows.length, 0, t);
    }
  });

  test("B cannot create a pet in A's name", async () => {
    await rejects(as(B, `insert into public.pets (owner_id, name, species, sex) values ($1, 'x', 'dog', 'male')`, [A]));
  });

  test("B cannot add records to A's pet", async () => {
    await rejects(as(B, `insert into public.alerts (pet_id, kind, title) values ($1, 'other', 'x')`, [petA]));
    await rejects(as(B, `insert into public.reminders (pet_id, kind, title, due_at) values ($1, 'other', 'x', now())`, [petA]));
  });

  test("B cannot update or delete A's rows (0 rows affected)", async () => {
    const upd = await as(B, `update public.pets set name = 'hacked' where id = $1`, [petA]);
    const del = await as(B, `delete from public.alerts where pet_id = $1`, [petA]);
    assert.equal(upd.affectedRows, 0);
    assert.equal(del.affectedRows, 0);
    const { rows } = await db.query('select name from public.pets where id = $1', [petA]);
    assert.equal(rows[0].name, 'רקסי');
  });

  test("B cannot move their pet's record to link A's document", async () => {
    const petB = (await as(B, 'select id from public.pets')).rows[0].id;
    await rejects(as(B, `insert into public.weights (pet_id, kg, measured_on, source, document_id) values ($1, 4, '2026-01-01', 'document', $2)`, [petB, docA]));
  });

  test("document file path must be in the user's own folder", async () => {
    await rejects(as(A, `insert into public.documents (pet_id, file_path, mime_type) values ($1, $2, 'image/jpeg')`, [petA, `${B}/x.jpg`]));
  });

  test('chat messages cannot be written from the app (only by the Edge Function)', async () => {
    await assert.rejects(as(A, `insert into public.chat_messages (pet_id, role, content, triage_level) values ($1, 'assistant', 'x', 'monitor')`, [petA]), /permission denied|row-level security/);
  });

  test('anonymous users see nothing', async () => {
    await assert.rejects(as(null, 'select * from public.pets'), /permission denied/);
  });
});

describe('storage', () => {
  test('users can only upload into their own folder', async () => {
    await as(A, `insert into storage.objects (bucket_id, name) values ('pet-files', $1)`, [`${A}/pet/photo.jpg`]);
    await rejects(as(A, `insert into storage.objects (bucket_id, name) values ('pet-files', $1)`, [`${B}/pet/photo.jpg`]));
  });

  test("users cannot list someone else's files", async () => {
    assert.equal((await as(B, 'select * from storage.objects')).rows.length, 0);
    assert.equal((await as(A, 'select * from storage.objects')).rows.length, 1);
  });
});

describe('account deletion', () => {
  test('deleting the auth user cascades all their data', async () => {
    await db.query('delete from auth.users where id = $1', [A]);
    for (const t of ['profiles', 'pets', 'documents', 'alerts', 'vaccinations']) {
      const { rows } = await db.query(`select count(*)::int as n from public.${t}`);
      // Only B's profile + pet remain
      const expected = t === 'profiles' || t === 'pets' ? 1 : 0;
      assert.equal(rows[0].n, expected, t);
    }
  });
});
