/**
 * UJUz Design Tokens — Color Registry (oklch + hex dual format)
 *
 * Web: uses oklch via CSS @theme in globals.css
 * React Native: import hex values for NativeWind config
 */

interface ColorPair {
  oklch: string;
  hex: string;
}

// ── Brand Colors ─────────────────────────────────────────

export const brand = {
  50:  { oklch: 'oklch(0.97 0.02 260)', hex: '#f0f1ff' },
  100: { oklch: 'oklch(0.93 0.04 260)', hex: '#dfe2ff' },
  200: { oklch: 'oklch(0.86 0.08 260)', hex: '#bcc3ff' },
  300: { oklch: 'oklch(0.76 0.12 260)', hex: '#919dff' },
  400: { oklch: 'oklch(0.66 0.16 260)', hex: '#6b78f5' },
  500: { oklch: 'oklch(0.55 0.19 260)', hex: '#4f58e0' },
  600: { oklch: 'oklch(0.48 0.18 260)', hex: '#3f46c7' },
  700: { oklch: 'oklch(0.40 0.16 260)', hex: '#3236a8' },
  800: { oklch: 'oklch(0.33 0.12 260)', hex: '#282b85' },
  900: { oklch: 'oklch(0.26 0.08 260)', hex: '#1f2162' },
} as const satisfies Record<string, ColorPair>;

// ── Grade Colors (Admission Score A-F) ───────────────────

export const grade = {
  a: { oklch: 'oklch(0.72 0.19 145)', hex: '#2db87a' },
  b: { oklch: 'oklch(0.75 0.16 155)', hex: '#3fc48a' },
  c: { oklch: 'oklch(0.80 0.14 85)',  hex: '#b8b034' },
  d: { oklch: 'oklch(0.75 0.15 60)',  hex: '#c99a30' },
  e: { oklch: 'oklch(0.68 0.18 30)',  hex: '#d66a3a' },
  f: { oklch: 'oklch(0.62 0.20 15)',  hex: '#cf4f3a' },
} as const satisfies Record<string, ColorPair>;

// ── Status Colors ────────────────────────────────────────

export const status = {
  success: { oklch: 'oklch(0.72 0.19 145)', hex: '#2db87a' },
  warning: { oklch: 'oklch(0.80 0.16 80)',  hex: '#bfab24' },
  danger:  { oklch: 'oklch(0.62 0.22 25)',  hex: '#d44f30' },
  info:    { oklch: 'oklch(0.70 0.14 240)', hex: '#3d8fd4' },
} as const satisfies Record<string, ColorPair>;

// ── Semantic Colors (light mode) ─────────────────────────

export const semanticLight = {
  surface:         { oklch: 'oklch(1 0 0)',              hex: '#ffffff' },
  surfaceElevated: { oklch: 'oklch(0.99 0.002 260)',     hex: '#fcfcfe' },
  surfaceGlass:    { oklch: 'oklch(0.98 0.003 260 / 0.8)', hex: '#f9f9fccc' },
  surfaceInset:    { oklch: 'oklch(0.96 0.004 260)',     hex: '#f3f3f8' },
  border:          { oklch: 'oklch(0.90 0.01 260)',      hex: '#dddde8' },
  borderSubtle:    { oklch: 'oklch(0.94 0.005 260)',     hex: '#ebebf0' },
  textPrimary:     { oklch: 'oklch(0.15 0.02 260)',      hex: '#141428' },
  textSecondary:   { oklch: 'oklch(0.45 0.02 260)',      hex: '#5c5c72' },
  textTertiary:    { oklch: 'oklch(0.60 0.01 260)',      hex: '#8b8b9a' },
  textInverse:     { oklch: 'oklch(1 0 0)',              hex: '#ffffff' },
} as const satisfies Record<string, ColorPair>;

// ── Semantic Colors (dark mode) ──────────────────────────

export const semanticDark = {
  surface:         { oklch: 'oklch(0.16 0.02 260)',      hex: '#1a1a2e' },
  surfaceElevated: { oklch: 'oklch(0.20 0.02 260)',      hex: '#232338' },
  surfaceGlass:    { oklch: 'oklch(0.20 0.02 260 / 0.8)', hex: '#232338cc' },
  surfaceInset:    { oklch: 'oklch(0.13 0.02 260)',      hex: '#131324' },
  border:          { oklch: 'oklch(0.28 0.02 260)',      hex: '#353548' },
  borderSubtle:    { oklch: 'oklch(0.22 0.02 260)',      hex: '#28283c' },
  textPrimary:     { oklch: 'oklch(0.95 0.005 260)',     hex: '#eeeeF4' },
  textSecondary:   { oklch: 'oklch(0.70 0.01 260)',      hex: '#a8a8b8' },
  textTertiary:    { oklch: 'oklch(0.55 0.01 260)',      hex: '#7a7a8c' },
  textInverse:     { oklch: 'oklch(0.15 0.02 260)',      hex: '#141428' },
} as const satisfies Record<string, ColorPair>;

// ── Flat hex maps for NativeWind config ──────────────────

export function getHexColors(mode: 'light' | 'dark' = 'light') {
  const semantic = mode === 'dark' ? semanticDark : semanticLight;
  return {
    brand: Object.fromEntries(
      Object.entries(brand).map(([k, v]) => [k, v.hex]),
    ) as Record<keyof typeof brand, string>,
    grade: Object.fromEntries(
      Object.entries(grade).map(([k, v]) => [k, v.hex]),
    ) as Record<keyof typeof grade, string>,
    status: Object.fromEntries(
      Object.entries(status).map(([k, v]) => [k, v.hex]),
    ) as Record<keyof typeof status, string>,
    semantic: Object.fromEntries(
      Object.entries(semantic).map(([k, v]) => [k, v.hex]),
    ) as Record<keyof typeof semantic, string>,
  };
}
