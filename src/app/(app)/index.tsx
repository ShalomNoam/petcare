/** Home – "החיות שלי": a card per pet + the nearest reminder. */
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, ErrorView, HeroHeader, Icon, IconButton, Loading, PetAvatar, Pill, Screen } from '@/components';
import { db, type Pet, type Reminder } from '@/data';
import { useQuery } from '@/data/useQuery';
import { useAuth } from '@/lib/auth';
import { daysUntil, formatAge, relativeDays } from '@/lib/format';
import { speciesLabel } from '@/lib/labels';
import { refreshNotifications } from '@/lib/notifications';
import { colors, space } from '@/theme';

export default function Home() {
  const { profile, demo } = useAuth();
  const { data, loading, error, reload } = useQuery(async () => {
    const [pets, reminders] = await Promise.all([db().listPets(), db().listAll('reminders')]);
    return { pets, reminders };
  }, []);

  // Re-arm local notifications once per app start (they're derived from the DB).
  useEffect(() => {
    refreshNotifications();
  }, []);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const pets = data?.pets ?? [];
  // The nearest one-off reminder (vaccine, treatment, appointment); daily meds only if there is nothing else.
  const nextFor = (petId: string): Reminder | undefined => {
    const open = (data?.reminders ?? [])
      .filter((r) => r.pet_id === petId && !r.done && daysUntil(r.due_at) >= 0)
      .sort((a, b) => a.due_at.localeCompare(b.due_at));
    return open.find((r) => r.repeat_interval !== 'daily') ?? open[0];
  };

  return (
    <Screen
      header={
        <HeroHeader
          eyebrow={profile?.first_name ? `שלום ${profile.first_name}` : undefined}
          title="החיות שלי"
          topAction={
            <View style={styles.topActions}>
              <IconButton icon="notifications-outline" label="תזכורות" onPress={() => router.push('/reminders')} />
              <IconButton icon="settings-outline" label="הגדרות" onPress={() => router.push('/settings')} />
            </View>
          }
        >
          {demo && <Pill label="מצב הדגמה · המידע נשמר רק בטלפון" tone="onBrand" icon="flask-outline" />}
        </HeroHeader>
      }
    >
      {pets.length === 0 ? (
        <Card size="xl" style={styles.empty}>
          <AppText variant="number" tone="brand">
            01
          </AppText>
          <AppText variant="h1">הוסף את החיה הראשונה שלך</AppText>
          <AppText tone="muted">שם, סוג ותמונה. פחות מדקה, ואז אפשר להתחיל לבנות את התיק.</AppText>
          <Button label="הוספת חיה" withArrow onPress={() => router.push('/pet/new')} />
        </Card>
      ) : (
        <>
          {pets.map((pet) => (
            <PetCard key={pet.id} pet={pet} next={nextFor(pet.id)} />
          ))}
          <Button label="הוספת חיה" variant="secondary" icon="add" onPress={() => router.push('/pet/new')} />
        </>
      )}
    </Screen>
  );
}

function PetCard({ pet, next }: { pet: Pet; next?: Reminder }) {
  const age = formatAge(pet.birth_date);
  const subtitle = [speciesLabel[pet.species], pet.breed, age].filter(Boolean).join(' · ');
  const soon = next && daysUntil(next.due_at) <= 7;

  return (
    <Card
      size="xl"
      onPress={() => router.push({ pathname: '/pet/[id]', params: { id: pet.id } })}
      accessibilityLabel={`${pet.name}, ${subtitle}${next ? `. תזכורת: ${next.title} ${relativeDays(next.due_at)}` : ''}`}
    >
      <View style={styles.petRow}>
        <PetAvatar pet={pet} size={72} />
        <View style={styles.petText}>
          <AppText variant="h1">{pet.name}</AppText>
          <AppText tone="muted">{subtitle}</AppText>
        </View>
        <Icon name="chevronForward" color={colors.brand} />
      </View>
      {next && (
        <View style={styles.nextRow}>
          <Pill label={`${next.title} · ${relativeDays(next.due_at)}`} tone={soon ? 'sun' : 'neutral'} icon="alarm-outline" />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  topActions: { flexDirection: 'row', gap: space.s1 },
  empty: { gap: space.s2 },
  petRow: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  petText: { flex: 1, gap: 2 },
  nextRow: { marginTop: space.s2, flexDirection: 'row' },
});
