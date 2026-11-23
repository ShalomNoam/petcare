import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, HeroHeader, Screen, TextField } from '@/components';
import { goBack } from '@/lib/nav';
import { formatILPhone, ltrIsolate } from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import { space } from '@/theme';

const RESEND_SECONDS = 30;
const CODE_LENGTH = 6;

/** Step 2 of sign-in: enter the 6-digit SMS code. */
export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  async function verify(token = code) {
    if (token.length !== CODE_LENGTH || !phone) return;
    setError(null);
    setVerifying(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    setVerifying(false);
    if (verifyError) {
      setError('הקוד לא נכון או שפג תוקפו. נסה שוב.');
      setCode('');
    }
    // On success the auth listener updates the session and the route guard moves on.
  }

  async function resend() {
    if (!phone) return;
    setSecondsLeft(RESEND_SECONDS);
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone });
    if (otpError) setError('לא הצלחנו לשלוח קוד חדש. נסה שוב בעוד רגע.');
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        header={
          <HeroHeader
            onBack={goBack}
            title="הקלד את הקוד"
            subtitle={phone ? `שלחנו קוד בן 6 ספרות למספר ${ltrIsolate(formatILPhone(phone))}` : undefined}
          />
        }
      >
        <Card size="xl" style={styles.card}>
          <TextField
            label="קוד אימות"
            placeholder="______"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            autoFocus
            ltr
            maxLength={CODE_LENGTH}
            value={code}
            onChangeText={(t) => {
              const digits = t.replace(/\D/g, '');
              setCode(digits);
              if (error) setError(null);
              if (digits.length === CODE_LENGTH) verify(digits);
            }}
            error={error}
            style={styles.code}
          />
          <Button label="אישור" withArrow loading={verifying} disabled={code.length !== CODE_LENGTH} onPress={() => verify()} />
        </Card>
        <View style={styles.resend}>
          {secondsLeft > 0 ? (
            <AppText variant="small" tone="muted" center>
              אפשר לשלוח קוד חדש בעוד {secondsLeft} שניות
            </AppText>
          ) : (
            <Button label="שלחו קוד חדש" variant="ghost" onPress={resend} />
          )}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: space.s3 },
  code: { fontSize: 26, letterSpacing: 8, textAlign: 'center' },
  resend: { alignItems: 'center' },
});
