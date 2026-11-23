/**
 * מצב הצגה לווטרינר: one clean page, large text, to show on the phone during a visit.
 * Alerts first, then medications, surgeries, recent vaccinations and documents.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, ErrorView, IconButton, Loading, PetAvatar, Screen } from '@/components';
import { goBack } from '@/lib/nav';
import { db } from '@/data';
import { useQuery } from '@/data/useQuery';
import { formatAge, formatDate, formatKg } from '@/lib/format';
import { alertKindLabel, docTypeLabel, eventKindLabel, sexLabel, speciesLabel, vaccinationKindLabel } from '@/lib/labels';
import { ltrIsolate } from '@/lib/phone';
import { colors, radius, space } from '@/theme';

async function load(id: string) {
  const [pet, alerts, medications, events, vaccinations, weights, documents] = await Promise.all([
    db().getPet(id),
    db().list('alerts', id),
    db().list('medications', id),
    db().list('events', id),
    db().list('vaccinations', id),
    db().list('weights', id),
    db().list('documents', id),
  ]);
  return { pet, alerts, medications: medications.filter((m) => m.active), events, vaccinations, weights, documents };
}

export default function Present() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error } = useQuery(() => load(id), [id]);

  if (loading && !data) return <Loading />;
  if (error || !data?.pet) return <ErrorView message={error ?? 'החיה לא נמצאה'} />;
  const { pet, alerts, medications, events, vaccinations, weights, documents } = data;

  const surgeries = events.filter((e) => e.kind === 'surgery' || e.kind === 'hospitalization');
  const diagnoses = events.filter((e) => e.kind === 'diagnosis' || (e.kind === 'visit' && e.diagnosis));
  // Latest of each vaccine/treatment name
  const latestVax = [...new Map(vaccinations.map((v) => [`${v.kind}:${v.name}`, v])).values()].slice(0, 8);
  const weight = weights[0];
  const ownerNote = (source: string) => (source === 'owner' ? ' · מדווח ע"י הבעלים' : '');

  return (
    <Screen
      header={
        <View style={[styles.head, { paddingTop: insets.top + space.s2 }]}>
          <View style={styles.topBar}>
            <IconButton icon="close" label="סגירת מצב הצגה" onPress={goBack} tone="plain" />
            <AppText variant="label" tone="muted">
              תקציר רפואי · {formatDate(new Date().toISOString().slice(0, 10))}
            </AppText>
          </View>
          <View style={styles.idRow}>
            <PetAvatar pet={pet} size={96} />
            <View style={styles.idText}>
              <AppText variant="hero">{pet.name}</AppText>
              <AppText variant="presentBody">
                {[speciesLabel[pet.species], pet.breed, sexLabel(pet.sex, pet.species), formatAge(pet.birth_date)].filter(Boolean).join(' · ')}
              </AppText>
            </View>
          </View>
          <View style={styles.facts}>
            <Fact label="משקל אחרון" value={weight ? `${formatKg(weight.kg)} (${formatDate(weight.measured_on)})` : '—'} />
            <Fact label="מעוקר/מסורס" value={pet.neutered === null ? 'לא ידוע' : pet.neutered ? 'כן' : 'לא'} />
            <Fact label="שבב" value={pet.chip_number ? ltrIsolate(pet.chip_number) : '—'} />
            <Fact label="תאריך לידה" value={pet.birth_date ? formatDate(pet.birth_date) : '—'} />
          </View>
        </View>
      }
    >
      <View style={styles.alerts} accessibilityRole="summary">
        <AppText variant="presentTitle" tone="white">
          ⚠ התראות חשובות
        </AppText>
        {alerts.length === 0 ? (
          <AppText variant="presentBody" tone="white">
            אין התראות רשומות
          </AppText>
        ) : (
          alerts.map((a) => (
            <AppText key={a.id} variant="presentBody" tone="white">
              • {alertKindLabel[a.kind]}: {a.title}
              {a.details ? ` – ${a.details}` : ''}
            </AppText>
          ))
        )}
      </View>

      <Block title="תרופות קבועות" empty="אין תרופות קבועות">
        {medications.map((m) => (
          <Line key={m.id} main={m.name} sub={[m.dosage, m.frequency, m.start_date && `מ-${formatDate(m.start_date)}`].filter(Boolean).join(' · ') + ownerNote(m.source)} />
        ))}
      </Block>

      <Block title="ניתוחים ואשפוזים" empty="אין ניתוחים או אשפוזים רשומים">
        {surgeries.map((e) => (
          <Line key={e.id} main={`${formatDate(e.event_date)} · ${e.title}`} sub={[eventKindLabel[e.kind], e.diagnosis, e.clinic].filter(Boolean).join(' · ') + ownerNote(e.source)} />
        ))}
      </Block>

      {diagnoses.length > 0 && (
        <Block title="אבחנות" empty="">
          {diagnoses.slice(0, 8).map((e) => (
            <Line key={e.id} main={`${formatDate(e.event_date)} · ${e.diagnosis ?? e.title}`} sub={[e.kind === 'visit' ? e.title : null, e.clinic].filter(Boolean).join(' · ') + ownerNote(e.source)} />
          ))}
        </Block>
      )}

      <Block title="חיסונים וטיפולים אחרונים" empty="אין חיסונים רשומים">
        {latestVax.map((v) => (
          <Line key={v.id} main={`${v.name} · ${formatDate(v.given_on)}`} sub={[vaccinationKindLabel[v.kind], v.next_due && `הבא: ${formatDate(v.next_due)}`].filter(Boolean).join(' · ') + ownerNote(v.source)} />
        ))}
      </Block>

      <Block title="מסמכים" empty="אין מסמכים">
        {documents.map((d) => (
          <Line
            key={d.id}
            main={d.title ?? (d.doc_type ? docTypeLabel[d.doc_type] : 'מסמך')}
            sub={d.doc_date ? formatDate(d.doc_date) : 'הקובץ המקורי זמין בתיק'}
            onPress={() => router.push({ pathname: '/pet/[id]/document/[docId]', params: { id, docId: d.id } })}
          />
        ))}
      </Block>

      <AppText variant="small" tone="muted" center>
        {'פרטים שמסומנים "מדווח ע״י הבעלים" הוקלדו על ידי הבעלים ולא הגיעו ממסמך רפואי.'}
      </AppText>
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="small" tone="muted">
        {label}
      </AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}

function Block({ title, empty, children }: { title: string; empty: string; children: ReactNode[] | ReactNode }) {
  const has = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <View style={styles.block}>
      <AppText variant="presentTitle" tone="brand" accessibilityRole="header">
        {title}
      </AppText>
      {has ? children : <AppText variant="presentBody" tone="muted">{empty}</AppText>}
    </View>
  );
}

function Line({ main, sub, onPress }: { main: string; sub?: string; onPress?: () => void }) {
  return (
    <View style={styles.line}>
      <AppText variant="presentBody" onPress={onPress} accessibilityRole={onPress ? 'link' : undefined}>
        {main}
      </AppText>
      {!!sub && (
        <AppText variant="body" tone="muted">
          {sub}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { backgroundColor: colors.panel, paddingHorizontal: space.s3, paddingBottom: space.s3, gap: space.s2, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  idText: { flex: 1, gap: space.half },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s1 },
  fact: { backgroundColor: colors.page, borderRadius: radius.md, paddingVertical: space.s1, paddingHorizontal: space.s2, minWidth: '47%', flexGrow: 1 },
  alerts: { backgroundColor: colors.danger, borderRadius: radius.xl, padding: space.s3, gap: space.s1 },
  block: { backgroundColor: colors.panel, borderRadius: radius.xl, padding: space.s3, gap: space.s2 },
  line: { gap: 2, borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: space.s1 },
});
