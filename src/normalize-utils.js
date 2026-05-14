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
// the adapters and importers. These are full, unbounded raw content.
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

// Derived but still human-readable content the adapters/importers keep even at
// `summary`-level capture: prompt/assistant truncations, workspace paths,
// branch names, session titles. The protocol treats `summary` as acceptable,
// but the user-facing privacy toggle is intentionally stricter — when it's on,
// nothing a person can read should surface, only hashes / ids / counts / enums.
export const DERIVED_CONTENT_KEYS = new Set([
  'assistant_summary',
  'git_branch',
  'prompt_summary',
  'task_summary',
  'title',
  'workspace_dir'
]);

// Everything hidden at display/read time when privacy mode is on.
const DISPLAY_REDACT_KEYS = new Set([...RAW_CONTENT_KEYS, ...DERIVED_CONTENT_KEYS]);

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

function stripKeys(payload, keys) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  let changed = false;
  const next = {};
  for (const [key, value] of Object.entries(payload)) {
    if (keys.has(key)) {
      changed = true;
      continue;
    }
    next[key] = value;
  }
  return changed ? next : payload;
}

// Drop only the unbounded raw-content keys from a payload. Returns the same
// object reference when nothing was stripped.
export function stripRawFields(payload) {
  return stripKeys(payload, RAW_CONTENT_KEYS);
}

// Display/read-time redaction for a single event: strips raw content AND the
// derived human-readable keys (summaries, paths, branch, title), then marks
// privacy as metadata-level. Used by the API data layer and the trace explorer
// so an event captured under privacy-off is hidden everywhere once privacy
// mode is on. Returns the same reference when nothing changed.
export function redactEventForDisplay(event) {
  if (!event || typeof event !== 'object') return event;
  const strippedPayload = stripKeys(event.payload, DISPLAY_REDACT_KEYS);
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
