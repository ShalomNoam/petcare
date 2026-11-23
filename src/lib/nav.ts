import { router } from 'expo-router';

/** Back if there is history (normal flow), otherwise home (deep link / refresh). */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
