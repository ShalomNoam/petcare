/**
 * Design tokens — the single source of truth for colors, sizes and type.
 * Screens must never hard-code colors or sizes; use these tokens or the shared components.
 */

export const colors = {
  brand: '#0D5C55', // deep teal – heroes, buttons, accents
  brandInk: '#083F3A',
  page: '#EEF5F2', // pale mint background
  panel: '#FFFFFF', // cards
  ink: '#14201E', // text
  muted: '#5B6B68', // secondary text
  line: '#D6E3DE', // borders
  sun: '#FFC94A', // warm highlight
  danger: '#C8412F', // "urgent"
  white: '#FFFFFF',

  // Soft tints used for pill backgrounds and triage cards
  dangerSoft: '#FBE3DF',
  dangerInk: '#9A2E20',
  sunSoft: '#FFF1CC',
  sunInk: '#7A5600',
  onBrandMuted: 'rgba(255,255,255,0.82)',
  onBrandFaint: 'rgba(255,255,255,0.14)',
  overlay: 'rgba(20,32,30,0.45)',
} as const;

export const radius = {
  pill: 999,
  xl: 28,
  lg: 22,
  md: 14,
  sm: 8,
} as const;

/** Spacing in multiples of 8 (with a half step for tight spots). */
export const space = {
  half: 4,
  s1: 8,
  s2: 16,
  s3: 24,
  s4: 32,
  s5: 40,
  s6: 48,
  s8: 64,
} as const;

export const fonts = {
  display900: 'Rubik_900Black',
  display800: 'Rubik_800ExtraBold',
  display700: 'Rubik_700Bold',
  display500: 'Rubik_500Medium',
  body400: 'Assistant_400Regular',
  body600: 'Assistant_600SemiBold',
  body700: 'Assistant_700Bold',
} as const;

/** Text styles. Minimum size is 15 for accessibility. */
export const type = {
  hero: { fontFamily: fonts.display900, fontSize: 40, lineHeight: 44, letterSpacing: -0.8 },
  h1: { fontFamily: fonts.display800, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.display800, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.display700, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  number: { fontFamily: fonts.display900, fontSize: 32, lineHeight: 34, letterSpacing: -0.5 },
  body: { fontFamily: fonts.body400, fontSize: 17, lineHeight: 25 },
  bodyStrong: { fontFamily: fonts.body600, fontSize: 17, lineHeight: 25 },
  small: { fontFamily: fonts.body400, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: fonts.display700, fontSize: 15, lineHeight: 20 },
  button: { fontFamily: fonts.display700, fontSize: 17, lineHeight: 22 },
  // Vet presentation mode – large and readable
  presentTitle: { fontFamily: fonts.display800, fontSize: 26, lineHeight: 32 },
  presentBody: { fontFamily: fonts.body600, fontSize: 21, lineHeight: 30 },
} as const;

export type TextVariant = keyof typeof type;

export const sizes = {
  minTouch: 44,
  buttonHeight: 52,
  arrowDot: 52,
  avatar: 64,
  avatarLarge: 96,
  icon: 22,
} as const;

export const theme = { colors, radius, space, fonts, type, sizes };
export default theme;
