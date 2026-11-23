/** הגדרות: profile, notifications, terms, sign out, delete account and all data. */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, HeroHeader, Screen, SectionHeader, SwitchRow, TextField } from '@/components';
import { goBack } from '@/lib/nav';
import { db } from '@/data';
import { demoSeeds } from '@/data/demoData';
import { syncAutoReminders } from '@/data/reminders';
import { useAuth } from '@/lib/auth';
import { confirm, notify } from '@/lib/confirm';
import { cancelAllNotifications, notificationsEnabled, setNotificationsEnabled } from '@/lib/notifications';
import { formatILPhone, isValidIsraeliId, ltrIsolate } from '@/lib/phone';
import { space } from '@/theme';

export default function Settings() {
  const { user, profile, demo, refreshProfile, signOut } = useAuth();
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [nationalId, setNationalId] = useState(profile?.national_id ?? '');
  const [idError, setIdError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [notifOn, setNotifOn] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    notificationsEnabled().then(setNotifOn);
  }, []);

  async function saveProfile() {
    if (!user) return;
    if (!firstName.trim()) return;
    if (!isValidIsraeliId(nationalId)) {
      setIdError('מספר תעודת הזהות לא תקין');
      return;
    }
    setIdError(null);
    setSavingProfile(true);
    try {
      await db().updateProfile(user.id, { first_name: firstName.trim(), national_id: nationalId ? nationalId.padStart(9, '0') : null });
      await refreshProfile();
      notify('נשמר');
    } catch (e) {
      notify('השמירה נכשלה', e instanceof Error ? e.message : undefined);
    } finally {
      setSavingProfile(false);
    }
  }

  async function toggleNotifications(on: boolean) {
    setNotifOn(on);
    const ok = await setNotificationsEnabled(on);
    if (on && !ok) {
      setNotifOn(false);
      await setNotificationsEnabled(false);
      notify('אין הרשאה להתראות', Platform.OS === 'web' ? 'בדפדפן אין התראות. נסה בטלפון.' : 'אפשר לאשר התראות בהגדרות הטלפון.');
    }
  }

  async function loadDemoData() {
    const ok = await confirm('לטעון נתוני הדגמה?', 'יתווספו שתי חיות לדוגמה (רקסי ומיצי) עם היסטוריה, לחשבון שלך. אפשר למחוק אותן אחר כך.', 'טעינה');
    if (!ok) return;
    setSeeding(true);
    try {
      for (const seed of demoSeeds()) {
        const pet = await db().insertPet(seed.pet);
        for (const a of seed.alerts) await db().insert('alerts', { ...a, pet_id: pet.id });
        for (const m of seed.medications) await db().insert('medications', { ...m, pet_id: pet.id });
        for (const e of seed.events) await db().insert('events', { ...e, pet_id: pet.id });
        for (const v of seed.vaccinations) await db().insert('vaccinations', { ...v, pet_id: pet.id });
        for (const w of seed.weights) await db().insert('weights', { ...w, pet_id: pet.id });
        for (const r of seed.reminders) await db().insert('reminders', { ...r, pet_id: pet.id });
        await syncAutoReminders(pet.id);
      }
      router.dismissTo('/');
    } catch (e) {
      notify('הטעינה נכשלה', e instanceof Error ? e.message : undefined);
    } finally {
      setSeeding(false);
    }
  }

  async function deleteAccount() {
    const first = await confirm(
      'מחיקת החשבון וכל המידע',
      'יימחקו לצמיתות: הפרטים שלך, כל החיות, ההיסטוריה הרפואית, התזכורות, השיחות עם הסוכן וכל הקבצים והמסמכים. אי אפשר לשחזר.',
      'המשך',
      true,
    );
    if (!first) return;
    const second = await confirm('בטוח?', 'זו הפעולה האחרונה. החשבון וכל המידע יימחקו עכשיו.', 'מחיקה לצמיתות', true);
    if (!second) return;
    setDeleting(true);
    try {
      await cancelAllNotifications();
      await db().deleteAccount();
      await signOut();
    } catch (e) {
      setDeleting(false);
      notify('המחיקה נכשלה', e instanceof Error ? e.message : undefined);
    }
  }

  return (
    <Screen header={<HeroHeader onBack={goBack} title="הגדרות" />}>
      <Card size="xl" style={styles.card}>
        <SectionHeader number={1} title="הפרטים שלי" />
        {profile?.phone && <AppText tone="muted">טלפון: {ltrIsolate(formatILPhone(profile.phone))}</AppText>}
        <TextField label="שם פרטי" value={firstName} onChangeText={setFirstName} maxLength={60} />
        <TextField label="תעודת זהות" optional ltr keyboardType="number-pad" value={nationalId} onChangeText={(t) => setNationalId(t.replace(/\D/g, ''))} maxLength={9} error={idError} />
        <Button label="שמירה" variant="secondary" loading={savingProfile} onPress={saveProfile} />
      </Card>

      <Card size="xl" style={styles.card}>
        <SectionHeader number={2} title="התראות" />
        <SwitchRow label="תזכורות בטלפון" hint="חיסונים, תילוע, פרעושים וקרציות, תרופות ותורים" value={notifOn} onChange={toggleNotifications} />
        <Button label="כל התזכורות" variant="ghost" icon="alarm-outline" onPress={() => router.push('/reminders')} />
      </Card>

      <Card size="xl" style={styles.card}>
        <SectionHeader number={3} title="מידע" />
        <Button label="תנאי שימוש ופרטיות" variant="ghost" icon="document-text-outline" onPress={() => router.push('/terms')} />
        {!demo && <Button label="טעינת נתוני הדגמה" variant="ghost" icon="flask-outline" loading={seeding} onPress={loadDemoData} />}
      </Card>

      <Card size="xl" style={styles.card}>
        <SectionHeader number={4} title="חשבון" />
        <Button label={demo ? 'יציאה ממצב הדגמה' : 'התנתקות'} variant="secondary" icon="log-out-outline" onPress={signOut} />
        <View style={styles.danger}>
          <AppText variant="small" tone="muted">
            מחיקת החשבון מוחקת את כל המידע, כולל הקבצים והמסמכים. אי אפשר לבטל.
          </AppText>
          <Button label={demo ? 'מחיקת נתוני ההדגמה' : 'מחיקת החשבון וכל המידע'} variant="danger" fullWidth loading={deleting} onPress={deleteAccount} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.s2 },
  danger: { gap: space.s1, marginTop: space.s1 },
});
