import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { isRTL } from '@/lib/rtl';

import { colors, sizes } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Directional icons flip automatically with the layout direction.
 * "forward" means "next / go" — it points left in RTL.
 */
const directional = {
  forward: { rtl: 'arrow-back', ltr: 'arrow-forward' },
  back: { rtl: 'arrow-forward', ltr: 'arrow-back' },
  chevronForward: { rtl: 'chevron-back', ltr: 'chevron-forward' },
  chevronBack: { rtl: 'chevron-forward', ltr: 'chevron-back' },
} as const satisfies Record<string, { rtl: IoniconName; ltr: IoniconName }>;

export type IconName = IoniconName | keyof typeof directional;

type Props = {
  name: IconName;
  size?: number;
  color?: string;
};

export function Icon({ name, size = sizes.icon, color = colors.ink }: Props) {
  const resolved: IoniconName =
    name in directional
      ? directional[name as keyof typeof directional][isRTL ? 'rtl' : 'ltr']
      : (name as IoniconName);
  return <Ionicons name={resolved} size={size} color={color} accessible={false} />;
}
