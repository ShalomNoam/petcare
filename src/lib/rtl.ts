import Constants, { ExecutionEnvironment } from 'expo-constants';
import { I18nManager, Platform } from 'react-native';

/**
 * Hebrew-only app → RTL everywhere.
 *
 * - Dev builds / store builds: the `expo-localization` plugin in app.json
 *   (`forcesRTL: true`) makes the native layout RTL from the very first frame.
 * - We also request RTL at runtime, which persists for the next launch.
 * - Expo Go: Expo Go resets RTL preferences itself, so layout direction follows
 *   the phone's language. A phone set to Hebrew renders RTL correctly.
 */
export function ensureRTL() {
  if (Platform.OS === 'web') {
    // Browser preview only: set the document direction.
    if (typeof document !== 'undefined') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'he';
    }
    return;
  }
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** True when running in Expo Go on a phone that is not in an RTL language. */
export const rtlUnavailableInExpoGo = isExpoGo && !I18nManager.isRTL;

/** Layout direction for direction-dependent icons. Web is always RTL (see ensureRTL). */
export const isRTL = Platform.OS === 'web' ? true : I18nManager.isRTL;
