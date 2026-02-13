/**
 * UJUz — Cross-Platform Component Interfaces
 *
 * Documents the prop contracts for components that will need
 * platform-specific implementations in React Native.
 *
 * Web: implemented with next/navigation + HTML elements
 * React Native: implemented with @react-navigation + RN primitives
 */

// ── Navigation ───────────────────────────────────────────

export interface TopBarInterface {
  title?: string;
  showBack?: boolean;
  /** Custom back handler. Falls back to router.back() on web. */
  onBack?: () => void;
  action?: React.ReactNode;
  transparent?: boolean;
}

export interface BottomNavInterface {
  /** Current active route path for highlighting */
  currentPath: string;
}

// ── Pressable (RN convention: onPress instead of onClick) ──

export interface PressableInterface {
  onPress?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

// ── Text Input (RN convention: onChangeText) ─────────────

export interface TextInputInterface {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

// ── Cards ────────────────────────────────────────────────

export interface CardInterface {
  onPress?: () => void;
  children: React.ReactNode;
}

// ── Mapping Notes ────────────────────────────────────────
//
// Web → RN prop mapping:
//   onClick     → onPress
//   onChange(e)  → onChangeText(text)
//   className   → className (NativeWind v4 supports this)
//   href (Link) → screen name + params (Expo Router)
//
// Components requiring full rewrite for RN:
//   - BottomNav → @react-navigation/bottom-tabs
//   - TopBar    → @react-navigation/native-stack header
//   - ThemeProvider → Appearance API + AsyncStorage
//   - FilterSheet  → @gorhom/bottom-sheet
//   - useIntersection → FlatList.onEndReached
