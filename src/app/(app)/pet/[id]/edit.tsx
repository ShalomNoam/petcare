import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { Button, ErrorView, HeroHeader, Loading, Screen } from '@/components';
import { goBack } from '@/lib/nav';
import { db } from '@/data';
import { useQuery } from '@/data/useQuery';
import { PetForm } from '@/features/PetForm';
import { updatePet } from '@/features/savePet';
import { useAuth } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { refreshNotifications } from '@/lib/notifications';

export default function EditPet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: pet, loading, error } = useQuery(() => db().getPet(id), [id]);

  if (loading) return <Loading />;
  if (error || !pet) return <ErrorView message={error ?? 'החיה לא נמצאה'} />;

  async function remove() {
    const ok = await confirm(
      `למחוק את ${pet!.name}?`,
      'כל התיק יימחק: פרטים, היסטוריה, מסמכים ותזכורות. אי אפשר לבטל.',
      'מחיקה',
      true,
    );
    if (!ok) return;
    await db().deletePet(pet!.id);
    await refreshNotifications();
    router.dismissAll();
    router.replace('/');
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen header={<HeroHeader onBack={goBack} title={`עריכת ${pet.name}`} />}>
        <PetForm
          initial={pet}
          submitLabel="שמירה"
          onSubmit={async (v) => {
            await updatePet(user!.id, pet, v);
            goBack();
          }}
        />
        <Button label={`מחיקת ${pet.name} והתיק`} variant="ghost" icon="trash-outline" onPress={remove} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
