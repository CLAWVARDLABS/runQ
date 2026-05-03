const DEFAULT_REDACT_KEYS = [
  /api[_-]?key/i,
  /authorization/i,
  /command/i,
  /content/i,
  /output/i,
  /password/i,
  /prompt/i,
  /secret/i,
  /stderr/i,
  /stdout/i,
  /token/i
];

const DEFAULT_SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{12,}/g,
  /(api[_-]?key|authorization|bearer|password|secret|token)\s*[:=]\s*["']?[^"'\s]+/gi
];

function shouldRedactKey(key, policy) {
  return (policy.redactKeys || DEFAULT_REDACT_KEYS).some((pattern) => pattern.test(key));
}

function redactString(value, policy) {
  const patterns = policy.secretPatterns || DEFAULT_SECRET_PATTERNS;
  return patterns.reduce((next, pattern) => next.replace(pattern, '[redacted]'), value);
}

function redactValue(key, value, policy) {
  if (value === null || value === undefined) {
    return value;
  }
  if (shouldRedactKey(key, policy)) {
    return '[redacted]';
  }
  if (typeof value === 'string') {
    return redactString(value, policy);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(key, item, policy));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [childKey, redactValue(childKey, childValue, policy)])
    );
  }
  return value;
}

function hasSensitivePrivacy(event) {
  return ['sensitive', 'secret'].includes(event.privacy?.level);
}

export function redactEvent(event, policy = {}) {
  const payload = redactValue('payload', event.payload || {}, policy);
  const redacted = hasSensitivePrivacy(event) || JSON.stringify(payload) !== JSON.stringify(event.payload || {});
  if (!redacted) {
    return event;
  }
  return {
    ...event,
    privacy: {
      ...event.privacy,
      level: policy.level || 'metadata',
      redacted: true
    },
    payload
  };
}
