import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { HeroHeader, Screen } from '@/components';
import { goBack } from '@/lib/nav';
import { PetForm } from '@/features/PetForm';
import { createPet } from '@/features/savePet';
import { useAuth } from '@/lib/auth';

export default function NewPet() {
  const { user } = useAuth();

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen header={<HeroHeader onBack={goBack} title="חיה חדשה" subtitle="פרטים בסיסיים. אפשר להשלים הכול אחר כך." />}>
        <PetForm
          submitLabel="הוספה"
          onSubmit={async (v) => {
            const pet = await createPet(user!.id, v);
            router.replace({ pathname: '/pet/[id]', params: { id: pet.id } });
          }}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
