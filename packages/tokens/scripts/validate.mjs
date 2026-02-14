import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_PATH = path.join(ROOT, 'packages/tokens/src/tokens.ipsoi.json');

const HEX_RE = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
const RGBA_RE = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0|1|0?\.\d+)\s*\)$/;
const PX_RE = /^\d+(\.\d+)?px$/;
const MS_RE = /^\d+(\.\d+)?ms$/;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function valueOf(token, pathLabel) {
  assert(token && typeof token === 'object', `Missing token object: ${pathLabel}`);
  assert('$value' in token, `Missing $value: ${pathLabel}`);
  return token.$value;
}

function isColorValue(value) {
  return HEX_RE.test(value) || RGBA_RE.test(value);
}

function run() {
  const source = readJson(SRC_PATH);
  assert(source?.ipsoi, 'Missing root group: ipsoi');

  const color = source.ipsoi.color;
  const radius = source.ipsoi.radius;
  const motion = source.ipsoi.motion;

  assert(color && radius && motion, 'Missing required groups: ipsoi.color|radius|motion');

  for (const [key, token] of Object.entries(color)) {
    const value = valueOf(token, `ipsoi.color.${key}`);
    assert(typeof value === 'string', `Color token must be string: ipsoi.color.${key}`);
    assert(isColorValue(value), `Unsupported color format: ipsoi.color.${key}=${value}`);
  }

  const radiusFull = valueOf(radius.full, 'ipsoi.radius.full');
  assert(typeof radiusFull === 'string' && PX_RE.test(radiusFull), 'radius.full must be px unit (e.g. 8px)');

  for (const k of ['durationFast', 'durationNormal']) {
    const val = valueOf(motion[k], `ipsoi.motion.${k}`);
    assert(typeof val === 'string' && MS_RE.test(val), `${k} must be ms unit (e.g. 150ms)`);
  }

  console.log('Token validation passed');
}

run();
