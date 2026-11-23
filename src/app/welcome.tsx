import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { AppText, Button, Card, HeroHeader, Screen, TextField } from '@/components';
import { useAuth } from '@/lib/auth';
import { isValidIsraeliId } from '@/lib/phone';
import { db } from '@/data';
import { space } from '@/theme';

/** After the first sign-in: first name (required) and Israeli ID (optional). */
export default function Welcome() {
  const { user, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save() {
    const name = firstName.trim();
    const id = nationalId.trim();
    const nameOk = name.length > 0;
    const idOk = isValidIsraeliId(id);
    setNameError(nameOk ? null : 'איך קוראים לך?');
    setIdError(idOk ? null : 'מספר תעודת הזהות לא תקין');
    if (!nameOk || !idOk || !user) return;

    setSaving(true);
    setSaveError(null);
    try {
      await db().updateProfile(user.id, { first_name: name, national_id: id ? id.padStart(9, '0') : null });
    } catch {
      setSaving(false);
      setSaveError('השמירה נכשלה. בדוק את החיבור ונסה שוב.');
      return;
    }
    await refreshProfile(); // the route guard then moves to the app
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen header={<HeroHeader eyebrow="נעים להכיר" title="איך קוראים לך?" subtitle="עוד רגע מוסיפים את החיה הראשונה." />}>
        <Card size="xl" style={styles.card}>
          <TextField
            label="שם פרטי"
            placeholder="למשל: נועה"
            textContentType="givenName"
            autoComplete="given-name"
            value={firstName}
            onChangeText={setFirstName}
            error={nameError}
            maxLength={60}
          />
          <TextField
            label="תעודת זהות"
            optional
            hint="משמש כמזהה נוסף. אפשר להשאיר ריק."
            keyboardType="number-pad"
            ltr
            value={nationalId}
            onChangeText={(t) => setNationalId(t.replace(/\D/g, ''))}
            error={idError}
            maxLength={9}
          />
          {saveError && (
            <AppText variant="small" tone="danger">
              {saveError}
            </AppText>
          )}
          <Button label="המשך" withArrow loading={saving} onPress={save} />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: space.s3 },
});
