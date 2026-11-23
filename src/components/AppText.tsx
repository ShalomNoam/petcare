import { Text, type TextProps } from 'react-native';

import { colors, type TextVariant, type as typeStyles } from '@/theme';

type Tone = 'ink' | 'muted' | 'brand' | 'white' | 'onBrandMuted' | 'danger';

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  tone?: Tone;
  center?: boolean;
};

/**
 * All text in the app goes through this component, so fonts, sizes and
 * colors always come from the theme. Alignment is left to the layout
 * direction (RTL → right) unless `center` is set.
 */
export function AppText({ variant = 'body', tone = 'ink', center, style, ...rest }: AppTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      style={[
        typeStyles[variant],
        // Hebrew paragraph direction even for digit-only text (dates, weights).
        { color: colors[tone], writingDirection: 'rtl' },
        center && { textAlign: 'center' },
        style,
      ]}
      {...rest}
    />
  );
}
