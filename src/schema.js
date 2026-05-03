export const eventTypes = new Set([
  'session.started',
  'session.ended',
  'user.prompt.submitted',
  'agent.step.started',
  'agent.step.ended',
  'model.call.started',
  'model.call.ended',
  'tool.call.started',
  'tool.call.ended',
  'command.started',
  'command.ended',
  'permission.requested',
  'permission.resolved',
  'file.changed',
  'git.diff.summarized',
  'test.started',
  'test.ended',
  'build.started',
  'build.ended',
  'lint.started',
  'lint.ended',
  'error.raised',
  'outcome.scored',
  'satisfaction.recorded',
  'recommendation.generated',
  'recommendation.accepted',
  'recommendation.dismissed'
]);

export const frameworks = new Set([
  'claude_code',
  'codex',
  'openclaw',
  'hermes',
  'opencode',
  'gemini_cli',
  'cursor',
  'cline',
  'custom'
]);

export const sources = new Set([
  'hook',
  'otel',
  'sdk',
  'cli_wrapper',
  'mcp',
  'filesystem_watcher',
  'git_watcher',
  'manual',
  'import'
]);

export const privacyLevels = new Set([
  'metadata',
  'summary',
  'sensitive',
  'secret'
]);

const requiredFields = [
  'runq_version',
  'event_id',
  'schema_version',
  'event_type',
  'timestamp',
  'session_id',
  'run_id',
  'framework',
  'source',
  'privacy',
  'payload'
];

export function validateEvent(event) {
  const errors = [];

  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return {
      ok: false,
      errors: ['event must be an object']
    };
  }

  for (const field of requiredFields) {
    if (event[field] === undefined || event[field] === null || event[field] === '') {
      errors.push(`${field} is required`);
    }
  }

  if (event.event_type !== undefined && !eventTypes.has(event.event_type)) {
    errors.push('event_type must be a known RunQ event type');
  }

  if (event.framework !== undefined && !frameworks.has(event.framework)) {
    errors.push('framework must be a known RunQ framework');
  }

  if (event.source !== undefined && !sources.has(event.source)) {
    errors.push('source must be a known RunQ source');
  }

  if (!event.privacy || typeof event.privacy !== 'object' || Array.isArray(event.privacy)) {
    if (event.privacy !== undefined && event.privacy !== null) {
      errors.push('privacy must be an object');
    }
  } else {
    if (!privacyLevels.has(event.privacy.level)) {
      errors.push('privacy.level must be one of metadata, summary, sensitive, secret');
    }
    if (typeof event.privacy.redacted !== 'boolean') {
      errors.push('privacy.redacted must be a boolean');
    }
  }

  if (event.payload !== undefined && (typeof event.payload !== 'object' || Array.isArray(event.payload) || event.payload === null)) {
    errors.push('payload must be an object');
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
