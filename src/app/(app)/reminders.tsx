/** All upcoming reminders, across pets. */
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, ChoiceChips, EmptyLine, ErrorView, HeroHeader, Loading, Pill, Screen, SectionHeader } from '@/components';
import { goBack } from '@/lib/nav';
import { db, type Pet, type Reminder } from '@/data';
import { completeReminder } from '@/data/reminders';
import { useQuery } from '@/data/useQuery';
import { daysUntil, formatDate, formatTime, relativeDays } from '@/lib/format';
import { reminderKindLabel, repeatLabel } from '@/lib/labels';
import { colors, space } from '@/theme';

export default function Reminders() {
  const { data, loading, error, reload } = useQuery(async () => {
    const [pets, reminders] = await Promise.all([db().listPets(), db().listAll('reminders')]);
    return { pets, reminders: reminders.filter((r) => !r.done) };
  }, []);
  const [petForNew, setPetForNew] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;
  const pets = data?.pets ?? [];
  const reminders = data?.reminders ?? [];
  const petName = new Map(pets.map((p) => [p.id, p.name]));

  const overdue = reminders.filter((r) => daysUntil(r.due_at) < 0 && r.repeat_interval === 'none');
  const week = reminders.filter((r) => !overdue.includes(r) && daysUntil(r.due_at) <= 7);
  const later = reminders.filter((r) => !overdue.includes(r) && !week.includes(r));

  const addFor = (petId: string) => router.push({ pathname: '/pet/[id]/record', params: { id: petId, table: 'reminders' } });

  return (
    <Screen header={<HeroHeader onBack={goBack} title="תזכורות" subtitle="חיסונים, תילוע, פרעושים וקרציות, תרופות ותורים." />}>
      {reminders.length === 0 && (
        <Card size="xl">
          <EmptyLine text="אין תזכורות פתוחות. תזכורות נוצרות לבד ממועדי חיסונים ומתרופות קבועות." />
        </Card>
      )}
      {[
        { title: 'באיחור', items: overdue },
        { title: 'השבוע', items: week },
        { title: 'בהמשך', items: later },
      ]
        .filter((g) => g.items.length > 0)
        .map((g, i) => (
          <Group key={g.title} n={i + 1} title={g.title} items={g.items} petName={petName} onDone={reload} />
        ))}

      {pets.length > 0 && (
        <Card size="xl" style={styles.add}>
          <AppText variant="h3">תזכורת חדשה</AppText>
          {pets.length > 1 ? (
            <>
              <ChoiceChips label="לאיזו חיה?" options={pets.map((p: Pet) => ({ value: p.id, label: p.name }))} value={petForNew} onChange={setPetForNew} />
              <Button label="המשך" withArrow disabled={!petForNew} onPress={() => petForNew && addFor(petForNew)} />
            </>
          ) : (
            <Button label={`תזכורת ל${pets[0].name}`} withArrow icon="add" onPress={() => addFor(pets[0].id)} />
          )}
        </Card>
      )}
    </Screen>
  );
}

function Group({ n, title, items, petName, onDone }: { n: number; title: string; items: Reminder[]; petName: Map<string, string>; onDone: () => void }) {
  return (
    <Card size="xl">
      <SectionHeader number={n} title={title} />
      {items.map((r, i) => (
        <ReminderRow key={r.id} r={r} pet={petName.get(r.pet_id) ?? ''} last={i === items.length - 1} onDone={onDone} />
      ))}
    </Card>
  );
}

function ReminderRow({ r, pet, last, onDone }: { r: Reminder; pet: string; last: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const days = daysUntil(r.due_at);
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <View style={styles.body}>
        <AppText variant="small" tone="muted">
          {pet} · {formatDate(r.due_at.slice(0, 10))} · {formatTime(r.due_at)}
        </AppText>
        <AppText variant="bodyStrong">{r.title}</AppText>
        <View style={styles.tags}>
          <Pill label={relativeDays(r.due_at.slice(0, 10))} tone={days < 0 ? 'danger' : days <= 3 ? 'sun' : 'neutral'} icon="alarm-outline" />
          <Pill label={reminderKindLabel[r.kind]} tone="outline" />
          {r.repeat_interval !== 'none' && <Pill label={repeatLabel[r.repeat_interval]} tone="outline" />}
        </View>
      </View>
      <View style={styles.actions}>
        <Button
          label="בוצע"
          variant="secondary"
          loading={busy}
          onPress={async () => {
            setBusy(true);
            await completeReminder(r);
            onDone();
          }}
          accessibilityHint={r.repeat_interval === 'none' ? 'מסמן את התזכורת כבוצעה' : 'מעביר את התזכורת למועד הבא'}
        />
        <Button label="עריכה" variant="ghost" onPress={() => router.push({ pathname: '/pet/[id]/record', params: { id: r.pet_id, table: 'reminders', recordId: r.id } })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  add: { gap: space.s2 },
  row: { paddingVertical: space.s2, gap: space.s1 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  body: { gap: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s1, marginTop: space.half },
  actions: { flexDirection: 'row', gap: space.s1, alignItems: 'center' },
});
