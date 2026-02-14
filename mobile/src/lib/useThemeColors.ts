import { useColorScheme } from 'react-native';
import { COLORS, DARK_COLORS } from './constants';

/**
 * Returns the correct color palette based on device color scheme.
 * Use for StyleSheet.create or inline style values that can't use TW `dark:` classes.
 *
 * For NativeWind className props, use `dark:bg-dark-surface` etc. instead.
 */
export function useThemeColors() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DARK_COLORS : COLORS;
}
