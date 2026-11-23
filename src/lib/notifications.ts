/**
 * Local notifications for reminders (expo-notifications, works in Expo Go).
 *
 * Strategy: the database is the source of truth. After any change we cancel
 * everything that was scheduled and schedule again from the open reminders.
 * Simple, and it never leaves an orphan notification behind.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import type { Pet, Reminder } from '@/data/types';

const PREF_KEY = 'notifications-enabled';
const CHANNEL = 'reminders';
/** iOS keeps at most 64 pending local notifications per app. */
const MAX_SCHEDULED = 60;
/** Vaccines and treatments also get a heads-up 3 days before. */
const EARLY_KINDS = new Set(['vaccine', 'deworming', 'flea_tick', 'appointment']);

let initialized = false;

export function initNotifications() {
  if (initialized || Platform.OS === 'web') return;
  initialized = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'תזכורות',
      importance: AndroidImportance.HIGH,
    }).catch(() => {});
  }
}

export async function notificationsEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(PREF_KEY)) !== '0';
}

export async function setNotificationsEnabled(enabled: boolean): Promise<boolean> {
  await AsyncStorage.setItem(PREF_KEY, enabled ? '1' : '0');
  if (enabled) {
    const granted = await ensurePermission();
    if (!granted) return false;
  }
  await refreshNotifications();
  return true;
}

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === IosAuthorizationStatus.PROVISIONAL) return true;
  if (!current.canAskAgain) return false;
  const res = await Notifications.requestPermissionsAsync();
  return res.granted || res.ios?.status === IosAuthorizationStatus.PROVISIONAL;
}

type Planned = { date: Date; title: string; body: string; trigger: Notifications.NotificationTriggerInput };

const bodyFor: Record<Reminder['kind'], string> = {
  vaccine: 'הגיע הזמן לחיסון',
  deworming: 'הגיע הזמן לתילוע',
  flea_tick: 'הגיע הזמן לטיפול נגד פרעושים וקרציות',
  medication: 'הגיע הזמן לתרופה',
  appointment: 'יש תור לווטרינר',
  other: 'תזכורת',
};

/** Turns open reminders into concrete notifications, nearest first. Exported for tests. */
export function planNotifications(reminders: Reminder[], pets: Pick<Pet, 'id' | 'name'>[], now = new Date()): Planned[] {
  const names = new Map(pets.map((p) => [p.id, p.name]));
  const out: Planned[] = [];
  const channel = Platform.OS === 'android' ? { channelId: CHANNEL } : {};

  for (const r of reminders) {
    if (r.done) continue;
    const due = new Date(r.due_at);
    const title = `${names.get(r.pet_id) ?? ''}: ${r.title}`.replace(/^: /, '');
    const hour = due.getHours();
    const minute = due.getMinutes();
    const T = Notifications.SchedulableTriggerInputTypes;

    switch (r.repeat_interval) {
      case 'none': {
        if (due > now) out.push({ date: due, title, body: bodyFor[r.kind], trigger: { type: T.DATE, date: due, ...channel } });
        const early = new Date(due);
        early.setDate(early.getDate() - 3);
        if (EARLY_KINDS.has(r.kind) && early > now) {
          out.push({ date: early, title, body: `בעוד 3 ימים: ${bodyFor[r.kind]}`, trigger: { type: T.DATE, date: early, ...channel } });
        }
        break;
      }
      case 'daily':
        out.push({ date: due, title, body: bodyFor[r.kind], trigger: { type: T.DAILY, hour, minute, ...channel } });
        break;
      case 'weekly':
        out.push({ date: due, title, body: bodyFor[r.kind], trigger: { type: T.WEEKLY, weekday: due.getDay() + 1, hour, minute, ...channel } });
        break;
      case 'monthly':
        out.push({ date: due, title, body: bodyFor[r.kind], trigger: { type: T.MONTHLY, day: due.getDate(), hour, minute, ...channel } });
        break;
      case 'yearly':
        out.push({ date: due, title, body: bodyFor[r.kind], trigger: { type: T.YEARLY, month: due.getMonth(), day: due.getDate(), hour, minute, ...channel } });
        break;
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX_SCHEDULED);
}

/** Cancels all scheduled notifications and schedules them again from the database. */
export async function refreshNotifications() {
  if (Platform.OS === 'web') return;
  try {
    initNotifications();
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!(await notificationsEnabled())) return;

    // Lazy import avoids a require cycle (data → reminders → notifications → data).
    const { db } = await import('@/data');
    const [reminders, pets] = await Promise.all([db().listAll('reminders'), db().listPets()]);
    const plan = planNotifications(reminders, pets);
    if (plan.length === 0) return;
    if (!(await ensurePermission())) return;

    for (const p of plan) {
      try {
        await Notifications.scheduleNotificationAsync({ content: { title: p.title, body: p.body, sound: true }, trigger: p.trigger });
      } catch (e) {
        console.warn('Failed to schedule reminder', p.title, e);
      }
    }
  } catch (e) {
    console.warn('refreshNotifications failed', e);
  }
}

export async function cancelAllNotifications() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}
