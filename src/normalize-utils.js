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
