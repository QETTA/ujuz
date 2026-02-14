import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_PATH = path.join(ROOT, 'packages/tokens/src/tokens.ipsoi.json');
const DIST_DIR = path.join(ROOT, 'packages/tokens/dist');

const COLOR_TOKEN_KEYS = [
  'brand50', 'brand100', 'brand200', 'brand300', 'brand400', 'brand500', 'brand600', 'brand700', 'brand800', 'brand900',
  'surface', 'surfaceElevated', 'surfaceInset', 'surfaceGlass',
  'border', 'borderSubtle',
  'textPrimary', 'textSecondary', 'textTertiary', 'textInverse',
  'success', 'warning', 'danger', 'info',
  'gradeA', 'gradeB', 'gradeC', 'gradeD', 'gradeE', 'gradeF',
  'darkSurface', 'darkSurfaceElevated', 'darkSurfaceInset', 'darkSurfaceGlass',
  'darkBorder', 'darkBorderSubtle',
  'darkTextPrimary', 'darkTextSecondary', 'darkTextTertiary', 'darkTextInverse',
];

const CSS_VAR_SPECS = [
  ['--ipsoi-color-brand-50', 'brand50'],
  ['--ipsoi-color-brand-100', 'brand100'],
  ['--ipsoi-color-brand-200', 'brand200'],
  ['--ipsoi-color-brand-300', 'brand300'],
  ['--ipsoi-color-brand-400', 'brand400'],
  ['--ipsoi-color-brand-500', 'brand500'],
  ['--ipsoi-color-brand-600', 'brand600'],
  ['--ipsoi-color-brand-700', 'brand700'],
  ['--ipsoi-color-brand-800', 'brand800'],
  ['--ipsoi-color-brand-900', 'brand900'],
  ['--ipsoi-color-surface', 'surface'],
  ['--ipsoi-color-surface-elevated', 'surfaceElevated'],
  ['--ipsoi-color-surface-inset', 'surfaceInset'],
  ['--ipsoi-color-surface-glass', 'surfaceGlass'],
  ['--ipsoi-color-border', 'border'],
  ['--ipsoi-color-border-subtle', 'borderSubtle'],
  ['--ipsoi-color-text-primary', 'textPrimary'],
  ['--ipsoi-color-text-secondary', 'textSecondary'],
  ['--ipsoi-color-text-tertiary', 'textTertiary'],
  ['--ipsoi-color-text-inverse', 'textInverse'],
  ['--ipsoi-color-success', 'success'],
  ['--ipsoi-color-warning', 'warning'],
  ['--ipsoi-color-danger', 'danger'],
  ['--ipsoi-color-info', 'info'],
  ['--ipsoi-color-grade-a', 'gradeA'],
  ['--ipsoi-color-grade-b', 'gradeB'],
  ['--ipsoi-color-grade-c', 'gradeC'],
  ['--ipsoi-color-grade-d', 'gradeD'],
  ['--ipsoi-color-grade-e', 'gradeE'],
  ['--ipsoi-color-grade-f', 'gradeF'],
];

const DARK_CSS_VAR_SPECS = [
  ['--ipsoi-color-surface', 'darkSurface'],
  ['--ipsoi-color-surface-elevated', 'darkSurfaceElevated'],
  ['--ipsoi-color-surface-inset', 'darkSurfaceInset'],
  ['--ipsoi-color-surface-glass', 'darkSurfaceGlass'],
  ['--ipsoi-color-border', 'darkBorder'],
  ['--ipsoi-color-border-subtle', 'darkBorderSubtle'],
  ['--ipsoi-color-text-primary', 'darkTextPrimary'],
  ['--ipsoi-color-text-secondary', 'darkTextSecondary'],
  ['--ipsoi-color-text-tertiary', 'darkTextTertiary'],
  ['--ipsoi-color-text-inverse', 'darkTextInverse'],
];

const THEME_VAR_SPECS = [
  ['--color-brand-50', '--ipsoi-color-brand-50'],
  ['--color-brand-100', '--ipsoi-color-brand-100'],
  ['--color-brand-200', '--ipsoi-color-brand-200'],
  ['--color-brand-300', '--ipsoi-color-brand-300'],
  ['--color-brand-400', '--ipsoi-color-brand-400'],
  ['--color-brand-500', '--ipsoi-color-brand-500'],
  ['--color-brand-600', '--ipsoi-color-brand-600'],
  ['--color-brand-700', '--ipsoi-color-brand-700'],
  ['--color-brand-800', '--ipsoi-color-brand-800'],
  ['--color-brand-900', '--ipsoi-color-brand-900'],
  ['--color-surface', '--ipsoi-color-surface'],
  ['--color-surface-elevated', '--ipsoi-color-surface-elevated'],
  ['--color-surface-inset', '--ipsoi-color-surface-inset'],
  ['--color-surface-glass', '--ipsoi-color-surface-glass'],
  ['--color-border', '--ipsoi-color-border'],
  ['--color-border-subtle', '--ipsoi-color-border-subtle'],
  ['--color-text-primary', '--ipsoi-color-text-primary'],
  ['--color-text-secondary', '--ipsoi-color-text-secondary'],
  ['--color-text-tertiary', '--ipsoi-color-text-tertiary'],
  ['--color-text-inverse', '--ipsoi-color-text-inverse'],
  ['--color-success', '--ipsoi-color-success'],
  ['--color-warning', '--ipsoi-color-warning'],
  ['--color-danger', '--ipsoi-color-danger'],
  ['--color-info', '--ipsoi-color-info'],
  ['--color-grade-a', '--ipsoi-color-grade-a'],
  ['--color-grade-b', '--ipsoi-color-grade-b'],
  ['--color-grade-c', '--ipsoi-color-grade-c'],
  ['--color-grade-d', '--ipsoi-color-grade-d'],
  ['--color-grade-e', '--ipsoi-color-grade-e'],
  ['--color-grade-f', '--ipsoi-color-grade-f'],
  ['--radius-full', '--ipsoi-radius-full'],
  ['--duration-fast', '--ipsoi-duration-fast'],
  ['--duration-normal', '--ipsoi-duration-normal'],
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assertTokenShape(source) {
  if (!source?.ipsoi?.color || !source?.ipsoi?.radius || !source?.ipsoi?.motion) {
    throw new Error('Invalid token shape: expected ipsoi.color, ipsoi.radius, ipsoi.motion');
  }

  for (const key of COLOR_TOKEN_KEYS) {
    const token = source.ipsoi.color[key];
    if (!token || typeof token.$value !== 'string') {
      throw new Error(`Missing or invalid color token: ipsoi.color.${key}`);
    }
  }

  for (const key of ['full']) {
    const token = source.ipsoi.radius[key];
    if (!token || typeof token.$value !== 'string') {
      throw new Error(`Missing or invalid radius token: ipsoi.radius.${key}`);
    }
  }

  for (const key of ['durationFast', 'durationNormal']) {
    const token = source.ipsoi.motion[key];
    if (!token || typeof token.$value !== 'string') {
      throw new Error(`Missing or invalid motion token: ipsoi.motion.${key}`);
    }
  }
}

function formatCssBlock(selector, lines) {
  return `${selector} {\n${lines.map((line) => `  ${line}`).join('\n')}\n}`;
}

function buildTokensCss(source) {
  const color = source.ipsoi.color;
  const radius = source.ipsoi.radius;
  const motion = source.ipsoi.motion;

  const rootVars = CSS_VAR_SPECS.map(([varName, key]) => `${varName}: ${color[key].$value};`);
  rootVars.push(`--ipsoi-radius-full: ${radius.full.$value};`);
  rootVars.push(`--ipsoi-duration-fast: ${motion.durationFast.$value};`);
  rootVars.push(`--ipsoi-duration-normal: ${motion.durationNormal.$value};`);

  const darkVars = DARK_CSS_VAR_SPECS.map(([varName, key]) => `${varName}: ${color[key].$value};`);

  return [
    '/* AUTO-GENERATED by packages/tokens/scripts/build.mjs */',
    formatCssBlock(':root', rootVars),
    '',
    formatCssBlock("[data-theme='dark']", darkVars),
    '',
  ].join('\n');
}

function buildThemeCss() {
  const lines = THEME_VAR_SPECS.map(([themeVar, sourceVar]) => `${themeVar}: var(${sourceVar});`);
  return [
    '/* AUTO-GENERATED by packages/tokens/scripts/build.mjs */',
    formatCssBlock('@theme', lines),
    '',
  ].join('\n');
}

function buildMobileThemeCjs(source) {
  const color = source.ipsoi.color;
  return `/* AUTO-GENERATED by packages/tokens/scripts/build.mjs */
const colors = {
  brand: {
    50: '${color.brand50.$value}',
    100: '${color.brand100.$value}',
    200: '${color.brand200.$value}',
    300: '${color.brand300.$value}',
    400: '${color.brand400.$value}',
    500: '${color.brand500.$value}',
    600: '${color.brand600.$value}',
    700: '${color.brand700.$value}',
    800: '${color.brand800.$value}',
    900: '${color.brand900.$value}'
  },
  surface: {
    DEFAULT: '${color.surface.$value}',
    elevated: '${color.surfaceElevated.$value}',
    inset: '${color.surfaceInset.$value}',
    glass: '${color.surfaceGlass.$value}'
  },
  border: {
    DEFAULT: '${color.border.$value}',
    subtle: '${color.borderSubtle.$value}'
  },
  text: {
    primary: '${color.textPrimary.$value}',
    secondary: '${color.textSecondary.$value}',
    tertiary: '${color.textTertiary.$value}',
    inverse: '${color.textInverse.$value}'
  },
  status: {
    success: '${color.success.$value}',
    warning: '${color.warning.$value}',
    danger: '${color.danger.$value}',
    info: '${color.info.$value}'
  },
  grade: {
    a: '${color.gradeA.$value}',
    b: '${color.gradeB.$value}',
    c: '${color.gradeC.$value}',
    d: '${color.gradeD.$value}',
    e: '${color.gradeE.$value}',
    f: '${color.gradeF.$value}'
  }
};

const darkColors = {
  surface: {
    DEFAULT: '${color.darkSurface.$value}',
    elevated: '${color.darkSurfaceElevated.$value}',
    inset: '${color.darkSurfaceInset.$value}',
    glass: '${color.darkSurfaceGlass.$value}'
  },
  border: {
    DEFAULT: '${color.darkBorder.$value}',
    subtle: '${color.darkBorderSubtle.$value}'
  },
  text: {
    primary: '${color.darkTextPrimary.$value}',
    secondary: '${color.darkTextSecondary.$value}',
    tertiary: '${color.darkTextTertiary.$value}',
    inverse: '${color.darkTextInverse.$value}'
  }
};

module.exports = { colors, darkColors };
`;
}

function writeOutput(relativePath, content) {
  fs.writeFileSync(path.join(DIST_DIR, relativePath), content, 'utf8');
}

function run() {
  const source = readJson(SRC_PATH);
  assertTokenShape(source);

  fs.mkdirSync(DIST_DIR, { recursive: true });

  writeOutput('tokens.css', buildTokensCss(source));
  writeOutput('theme.css', buildThemeCss());
  writeOutput('mobile-tailwind-theme.cjs', buildMobileThemeCjs(source));

  console.log(`Built shared tokens in ${DIST_DIR}`);
}

run();
