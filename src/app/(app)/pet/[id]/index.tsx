/** תיק החיה – the full record, in numbered sections. */
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  EmptyLine,
  ErrorView,
  HeroHeader,
  Icon,
  IconButton,
  Loading,
  PetAvatar,
  Pill,
  RecordRow,
  Screen,
  SectionHeader,
  SourceTag,
} from '@/components';
import { db, type Alert as PetAlert } from '@/data';
import { goBack } from '@/lib/nav';
import { useQuery } from '@/data/useQuery';
import type { FormTable } from '@/features/recordForms';
import { daysUntil, formatAge, formatDate, formatKg, formatTime, relativeDays } from '@/lib/format';
import {
  alertKindLabel,
  docTypeLabel,
  eventKindLabel,
  reminderKindLabel,
  repeatLabel,
  sexLabel,
  speciesLabel,
  vaccinationKindLabel,
} from '@/lib/labels';
import { ltrIsolate } from '@/lib/phone';
import { colors, radius, sizes, space } from '@/theme';

async function loadRecord(id: string) {
  const [pet, alerts, medications, events, vaccinations, weights, documents, reminders] = await Promise.all([
    db().getPet(id),
    db().list('alerts', id),
    db().list('medications', id),
    db().list('events', id),
    db().list('vaccinations', id),
    db().list('weights', id),
    db().list('documents', id),
    db().list('reminders', id),
  ]);
  return { pet, alerts, medications, events, vaccinations, weights, documents, reminders };
}

export default function PetRecord() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useQuery(() => loadRecord(id), [id]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data?.pet) return <ErrorView message="החיה לא נמצאה" />;

  const { pet, alerts, medications, events, vaccinations, weights, documents, reminders } = data;
  const age = formatAge(pet.birth_date);
  const add = (table: FormTable) => () => router.push({ pathname: '/pet/[id]/record', params: { id, table } });
  const edit = (table: FormTable, recordId: string) => () =>
    router.push({ pathname: '/pet/[id]/record', params: { id, table, recordId } });

  const openReminders = reminders.filter((r) => !r.done);
  const pendingDocs = documents.filter((d) => d.extraction_status === 'ready');

  return (
    <Screen
      header={
        <HeroHeader
          onBack={goBack}
          topAction={<IconButton icon="create-outline" label="עריכת פרטים" onPress={() => router.push({ pathname: '/pet/[id]/edit', params: { id } })} />}
          eyebrow={[speciesLabel[pet.species], age].filter(Boolean).join(' · ')}
          title={pet.name}
        >
          <View style={styles.heroRow}>
            <PetAvatar pet={pet} size={sizes.avatarLarge} ring />
            <View style={styles.heroPills}>
              <Pill label={sexLabel(pet.sex, pet.species)} tone="onBrand" />
              {pet.neutered !== null && <Pill label={pet.neutered ? (pet.sex === 'female' ? 'מעוקרת' : 'מסורס') : 'לא מעוקר/מסורס'} tone="onBrand" />}
              {pet.breed && <Pill label={pet.breed} tone="onBrand" />}
            </View>
          </View>
          <Button label="צילום מסמך" variant="onBrand" withArrow icon="camera-outline" onPress={() => router.push({ pathname: '/pet/[id]/scan', params: { id } })} />
        </HeroHeader>
      }
    >
      {alerts.length > 0 && <AlertsBanner alerts={alerts} />}

      <View style={styles.quick}>
        <QuickAction icon="medkit-outline" label="הצגה לווטרינר" onPress={() => router.push({ pathname: '/pet/[id]/present', params: { id } })} />
        <QuickAction icon="chatbubbles-outline" label="התייעצות AI" onPress={() => router.push({ pathname: '/pet/[id]/chat', params: { id } })} />
      </View>

      {pendingDocs.map((d) => (
        <Card key={d.id} tone="panel" style={styles.pending} onPress={() => router.push({ pathname: '/pet/[id]/review/[docId]', params: { id, docId: d.id } })} accessibilityLabel="מסמך מחכה לאישור">
          <Pill label="מחכה לאישור" tone="sun" icon="sparkles-outline" />
          <AppText variant="bodyStrong">ה-AI קרא את {d.title ?? 'המסמך'}. בדוק ואשר מה ייכנס לתיק.</AppText>
        </Card>
      ))}

      <Section n={1} title="פרטים">
        <Detail label="סוג" value={speciesLabel[pet.species]} />
        <Detail label="גזע" value={pet.breed} />
        <Detail label="מין" value={sexLabel(pet.sex, pet.species)} />
        <Detail label="תאריך לידה" value={pet.birth_date ? `${formatDate(pet.birth_date)}${age ? ` (${age})` : ''}` : null} />
        <Detail label="מספר שבב" value={pet.chip_number ? ltrIsolate(pet.chip_number) : null} />
        <Detail label="מעוקר / מסורס" value={pet.neutered === null ? null : pet.neutered ? 'כן' : 'לא'} last />
      </Section>

      <Section n={2} title="התראות חשובות" onAdd={add('alerts')}>
        {alerts.length === 0 && <EmptyLine text="אלרגיות, מחלות כרוניות, תגובה להרדמה, התנהגות." />}
        {alerts.map((a, i) => (
          <RecordRow key={a.id} overline={alertKindLabel[a.kind]} title={a.title} subtitle={a.details} onPress={edit('alerts', a.id)} last={i === alerts.length - 1}
            tags={<SourceTag source={a.source} documentId={a.document_id} petId={id} />} />
        ))}
      </Section>

      <Section n={3} title="תרופות קבועות" onAdd={add('medications')}>
        {medications.length === 0 && <EmptyLine text="אין תרופות קבועות." />}
        {medications.map((m, i) => (
          <RecordRow
            key={m.id}
            title={m.name}
            subtitle={[m.dosage, m.frequency, m.start_date && `מ-${formatDate(m.start_date)}`].filter(Boolean).join(' · ')}
            onPress={edit('medications', m.id)}
            last={i === medications.length - 1}
            tags={
              <>
                {!m.active && <Pill label="הופסקה" tone="outline" />}
                <SourceTag source={m.source} documentId={m.document_id} petId={id} />
              </>
            }
          />
        ))}
      </Section>

      <Section n={4} title="היסטוריה" subtitle="ניתוחים, אשפוזים, ביקורים ואבחנות" onAdd={add('events')}>
        {events.length === 0 && <EmptyLine text="עוד אין אירועים בציר הזמן." />}
        {events.map((e, i) => (
          <RecordRow
            key={e.id}
            timeline
            last={i === events.length - 1}
            overline={`${formatDate(e.event_date)} · ${eventKindLabel[e.kind]}`}
            title={e.title}
            subtitle={[e.diagnosis, e.clinic].filter(Boolean).join(' · ')}
            onPress={edit('events', e.id)}
            tags={<SourceTag source={e.source} documentId={e.document_id} petId={id} />}
          />
        ))}
      </Section>

      <Section n={5} title="חיסונים וטיפולים" onAdd={add('vaccinations')}>
        {vaccinations.length === 0 && <EmptyLine text="חיסונים, תילוע וטיפול נגד פרעושים וקרציות." />}
        {vaccinations.map((v, i) => {
          const dueIn = v.next_due ? daysUntil(v.next_due) : null;
          return (
            <RecordRow
              key={v.id}
              overline={`${formatDate(v.given_on)} · ${vaccinationKindLabel[v.kind]}`}
              title={v.name}
              onPress={edit('vaccinations', v.id)}
              last={i === vaccinations.length - 1}
              tags={
                <>
                  {v.next_due && dueIn !== null && (
                    <Pill
                      label={dueIn < 0 ? `באיחור · ${formatDate(v.next_due)}` : `הבא ${relativeDays(v.next_due)}`}
                      tone={dueIn < 0 ? 'danger' : dueIn <= 14 ? 'sun' : 'neutral'}
                      icon="calendar-outline"
                    />
                  )}
                  <SourceTag source={v.source} documentId={v.document_id} petId={id} />
                </>
              }
            />
          );
        })}
      </Section>

      <Section n={6} title="משקל" onAdd={add('weights')}>
        {weights.length === 0 && <EmptyLine text="עוד לא נרשם משקל." />}
        {weights.length > 0 && <WeightChart weights={weights.map((w) => w.kg).reverse()} />}
        {weights.map((w, i) => (
          <RecordRow key={w.id} overline={formatDate(w.measured_on)} title={formatKg(w.kg)} onPress={edit('weights', w.id)} last={i === weights.length - 1}
            tags={<SourceTag source={w.source} documentId={w.document_id} petId={id} />} />
        ))}
      </Section>

      <Section n={7} title="מסמכים" onAdd={() => router.push({ pathname: '/pet/[id]/scan', params: { id } })} addLabel="הוספת מסמך">
        {documents.length === 0 && <EmptyLine text="מצלמים סיכום ביקור, מרשם או פנקס חיסונים, וה-AI ממלא את התיק." />}
        {documents.map((d, i) => (
          <RecordRow
            key={d.id}
            overline={d.doc_date ? formatDate(d.doc_date) : formatDate(d.created_at.slice(0, 10))}
            title={d.title ?? (d.doc_type ? docTypeLabel[d.doc_type] : 'מסמך')}
            onPress={() => router.push({ pathname: '/pet/[id]/document/[docId]', params: { id, docId: d.id } })}
            last={i === documents.length - 1}
            tags={
              d.extraction_status === 'ready' ? <Pill label="מחכה לאישור" tone="sun" /> :
              d.extraction_status === 'processing' ? <Pill label="בקריאה" tone="neutral" /> :
              d.extraction_status === 'failed' ? <Pill label="הקריאה נכשלה" tone="danger" /> : undefined
            }
          />
        ))}
      </Section>

      <Section n={8} title="תזכורות" onAdd={add('reminders')}>
        {openReminders.length === 0 && <EmptyLine text="תזכורות נוצרות לבד ממועדי חיסונים ומתרופות קבועות." />}
        {openReminders.map((r, i) => (
          <RecordRow
            key={r.id}
            overline={`${formatDate(r.due_at.slice(0, 10))} · ${formatTime(r.due_at)} · ${repeatLabel[r.repeat_interval]}`}
            title={r.title}
            onPress={edit('reminders', r.id)}
            last={i === openReminders.length - 1}
            tags={
              <>
                <Pill label={reminderKindLabel[r.kind]} tone="neutral" />
                {r.origin === 'auto' && <Pill label="אוטומטית" tone="outline" />}
              </>
            }
          />
        ))}
      </Section>
    </Screen>
  );
}

function AlertsBanner({ alerts }: { alerts: PetAlert[] }) {
  return (
    <View style={styles.banner} accessible accessibilityRole="summary" accessibilityLabel={`התראות חשובות: ${alerts.map((a) => `${alertKindLabel[a.kind]}, ${a.title}`).join('. ')}`}>
      <View style={styles.bannerHead}>
        <Icon name="warning" color={colors.white} />
        <AppText variant="h3" tone="white">
          חשוב לדעת
        </AppText>
      </View>
      {alerts.map((a) => (
        <AppText key={a.id} variant="bodyStrong" tone="white">
          {alertKindLabel[a.kind]}: {a.title}
        </AppText>
      ))}
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: 'medkit-outline' | 'chatbubbles-outline'; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.quickBtn, pressed && { opacity: 0.85 }]}>
      <Icon name={icon} color={colors.brand} size={26} />
      <AppText variant="label" tone="brand">
        {label}
      </AppText>
    </Pressable>
  );
}

function Section({ n, title, subtitle, onAdd, addLabel, children }: { n: number; title: string; subtitle?: string; onAdd?: () => void; addLabel?: string; children: ReactNode }) {
  return (
    <Card size="xl">
      <SectionHeader
        number={n}
        title={title}
        subtitle={subtitle}
        action={onAdd ? <IconButton icon="add" label={addLabel ?? `הוספה ל${title}`} onPress={onAdd} tone="brand" /> : undefined}
      />
      {children}
    </Card>
  );
}

function Detail({ label, value, last }: { label: string; value: string | null | undefined; last?: boolean }) {
  return (
    <View style={[styles.detail, !last && styles.detailDivider]} accessible accessibilityLabel={`${label}: ${value ?? 'לא הוזן'}`}>
      <AppText tone="muted">{label}</AppText>
      <AppText variant="bodyStrong" tone={value ? 'ink' : 'muted'}>
        {value ?? '—'}
      </AppText>
    </View>
  );
}

/** Tiny bar chart of the weight history (oldest → newest). */
function WeightChart({ weights }: { weights: number[] }) {
  if (weights.length < 2) return null;
  const max = Math.max(...weights);
  const min = Math.min(...weights);
  const span = max - min || 1;
  return (
    <View style={styles.chart} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {weights.slice(-12).map((w, i, arr) => (
        <View key={i} style={[styles.bar, { height: 24 + ((w - min) / span) * 48, backgroundColor: i === arr.length - 1 ? colors.brand : colors.line }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  heroPills: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: space.s1 },
  banner: { backgroundColor: colors.danger, borderRadius: radius.xl, padding: space.s3, gap: space.s1 },
  bannerHead: { flexDirection: 'row', alignItems: 'center', gap: space.s1 },
  quick: { flexDirection: 'row', gap: space.s2 },
  quickBtn: {
    flex: 1,
    minHeight: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.half,
    padding: space.s2,
  },
  pending: { gap: space.s1, borderWidth: 2, borderColor: colors.sun },
  detail: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, gap: space.s2 },
  detailDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 80, marginBottom: space.s1 },
  bar: { flex: 1, borderRadius: 6 },
});
