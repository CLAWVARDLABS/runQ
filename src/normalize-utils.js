import { createHash } from 'node:crypto';

export function hash(value) {
  return `sha256:${createHash('sha256').update(String(value ?? '')).digest('hex')}`;
}

export function metadataHash(value) {
  if (value === undefined || value === null || value === '') return undefined;
  return hash(typeof value === 'string' ? value : JSON.stringify(value));
}

export function objectKeyCount(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return Object.keys(value).length;
}

export function eventId(parts) {
  return `evt_${hash(parts.join(':')).slice(7, 23)}`;
}

export function binaryFromCommand(command) {
  const trimmed = String(command ?? '').trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.split(/\s+/)[0];
}

export function isVerificationCommand(command) {
  const value = String(command ?? '').trim();
  return /^(npm|pnpm|yarn|bun)\s+(run\s+)?(test|build|lint|typecheck)\b/.test(value) ||
    /^node\s+--test\b/.test(value) ||
    /^cargo\s+test\b/.test(value) ||
    /^go\s+test\b/.test(value) ||
    /^(pytest|vitest|jest)\b/.test(value) ||
    /^make\s+(test|build|lint)\b/.test(value);
}

export function textSummary(value, maxLength = 160) {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3)}...`;
}

// The exact set of payload keys that `rawFields` may add when privacy mode is
// off. Kept in sync with every `rawFields(privacyMode, { ... })` call across
// the adapters and importers. `stripRawFields` uses it for *display-time*
// redaction: events captured while privacy was off still carry these keys, so
// turning privacy mode back on has to hide them in the UI even though the DB
// row itself is unchanged.
export const RAW_CONTENT_KEYS = new Set([
  'arguments',
  'assistant_content',
  'assistant_text',
  'assistant_texts',
  'command',
  'cwd',
  'error',
  'file_path',
  'from',
  'history_messages',
  'input_messages',
  'last_assistant_message',
  'output',
  'params',
  'prompt',
  'result',
  'resumed_from',
  'session_key',
  'stderr',
  'stdout',
  'tool_input',
  'tool_output',
  'tool_response',
  'transcript_path'
]);

export function rawFields(privacyMode, fields) {
  if (privacyMode !== 'off') return {};
  if (!fields || typeof fields !== 'object') return {};
  const filtered = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    filtered[key] = value;
  }
  return filtered;
}

// Drop raw-content keys from a payload for display when privacy mode is on.
// Returns the same object reference when nothing was stripped so callers can
// cheaply skip re-rendering.
export function stripRawFields(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  let changed = false;
  const next = {};
  for (const [key, value] of Object.entries(payload)) {
    if (RAW_CONTENT_KEYS.has(key)) {
      changed = true;
      continue;
    }
    next[key] = value;
  }
  return changed ? next : payload;
}

// Display/read-time redaction for a single event: strips raw-content keys and
// marks privacy as metadata-level. Used by the API data layer and the trace
// explorer so an event captured under privacy-off is still hidden everywhere
// once privacy mode is on. Returns the same reference when nothing changed.
export function redactEventForDisplay(event) {
  if (!event || typeof event !== 'object') return event;
  const strippedPayload = stripRawFields(event.payload);
  if (strippedPayload === event.payload) return event;
  return {
    ...event,
    payload: strippedPayload,
    privacy: { ...event.privacy, level: 'metadata', redacted: true }
  };
}

export function privacyLevelFor(privacyMode, redactedLevel) {
  return privacyMode === 'off' ? 'sensitive' : redactedLevel;
}

export function privacyRedactedFor(privacyMode) {
  return privacyMode !== 'off';
}
