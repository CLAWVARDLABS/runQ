import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const CONFIG_FILENAME = 'config.json';
const PRIVACY_MODES = new Set(['on', 'off']);
const DEFAULT_PRIVACY_MODE = 'off';

function configDirFromHint(hint) {
  if (!hint) return join(process.cwd(), '.runq');
  // Accept either a directory ending in .runq or a db path inside it.
  const trimmed = String(hint);
  if (trimmed.endsWith('.runq') || trimmed.endsWith(`.runq/`) || trimmed.endsWith(`.runq\\`)) {
    return trimmed.replace(/[\\/]$/, '');
  }
  const dir = dirname(trimmed);
  if (dir.endsWith('.runq')) return dir;
  return join(process.cwd(), '.runq');
}

function configPath(hint) {
  return join(configDirFromHint(hint), CONFIG_FILENAME);
}

function readConfig(hint) {
  const path = configPath(hint);
  if (!existsSync(path)) return {};
  try {
    const raw = readFileSync(path, 'utf8');
    if (!raw.trim()) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeConfig(hint, next) {
  const path = configPath(hint);
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  renameSync(tmp, path);
}

export function getPrivacyMode(hint) {
  const config = readConfig(hint);
  const value = String(config.privacyMode ?? '').toLowerCase();
  return PRIVACY_MODES.has(value) ? value : DEFAULT_PRIVACY_MODE;
}

export function setPrivacyMode(mode, hint) {
  const next = PRIVACY_MODES.has(mode) ? mode : DEFAULT_PRIVACY_MODE;
  const current = readConfig(hint);
  writeConfig(hint, { ...current, privacyMode: next });
  return next;
}

export { DEFAULT_PRIVACY_MODE };
