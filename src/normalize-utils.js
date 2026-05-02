import { createHash } from 'node:crypto';

export function hash(value) {
  return `sha256:${createHash('sha256').update(String(value ?? '')).digest('hex')}`;
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
  return /\b(test|spec|vitest|jest|pytest|go test|cargo test|pnpm test|npm test|yarn test|node --test|build|lint|typecheck)\b/.test(String(command ?? ''));
}

export function textSummary(value, maxLength = 160) {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3)}...`;
}
