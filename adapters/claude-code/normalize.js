import { createHash } from 'node:crypto';

const runqVersion = '0.1.0';

function hash(value) {
  return `sha256:${createHash('sha256').update(String(value ?? '')).digest('hex')}`;
}

function eventId(input, eventType, now) {
  return `evt_${hash(`${input.session_id}:${eventType}:${input.tool_use_id ?? ''}:${now}`).slice(7, 23)}`;
}

function binaryFromCommand(command) {
  const trimmed = String(command ?? '').trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.split(/\s+/)[0];
}

function isVerificationCommand(command) {
  return /\b(test|spec|vitest|jest|pytest|go test|cargo test|pnpm test|npm test|yarn test|build|lint|typecheck)\b/.test(String(command ?? ''));
}

function promptSummary(prompt) {
  const normalized = String(prompt ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= 160) {
    return normalized;
  }
  return `${normalized.slice(0, 157)}...`;
}

function baseEvent(input, eventType, now, privacyLevel, payload) {
  return {
    runq_version: runqVersion,
    event_id: eventId(input, eventType, now),
    schema_version: runqVersion,
    event_type: eventType,
    timestamp: now,
    session_id: input.session_id,
    run_id: input.session_id,
    framework: 'claude_code',
    source: 'hook',
    repo: input.cwd ? {
      id: hash(input.cwd),
      root_hash: hash(input.cwd),
      vcs: 'unknown'
    } : undefined,
    privacy: {
      level: privacyLevel,
      redacted: true
    },
    payload
  };
}

function sessionStarted(input, now) {
  return baseEvent(input, 'session.started', now, 'metadata', {
    agent_name: 'Claude Code',
    model: input.model ?? 'unknown',
    started_reason: input.source ?? 'unknown',
    permission_mode: input.permission_mode ?? 'unknown',
    transcript_path_hash: hash(input.transcript_path)
  });
}

function sessionEnded(input, now) {
  return baseEvent(input, 'session.ended', now, 'metadata', {
    ended_reason: input.reason ?? input.source ?? 'unknown',
    permission_mode: input.permission_mode ?? 'unknown',
    transcript_path_hash: hash(input.transcript_path)
  });
}

function userPromptSubmitted(input, now) {
  const prompt = input.prompt ?? '';
  return baseEvent(input, 'user.prompt.submitted', now, 'summary', {
    prompt_hash: hash(prompt),
    prompt_summary: promptSummary(prompt),
    prompt_length: String(prompt).length
  });
}

function bashCommandStarted(input, now) {
  const command = input.tool_input?.command ?? '';
  return baseEvent(input, 'command.started', now, 'metadata', {
    command_id: input.tool_use_id ?? hash(command),
    command_kind: 'shell',
    binary: binaryFromCommand(command),
    args_hash: hash(command),
    cwd_hash: hash(input.cwd),
    is_verification: isVerificationCommand(command),
    verification_kind: isVerificationCommand(command) ? 'command' : undefined
  });
}

function bashCommandEnded(input, now) {
  const command = input.tool_input?.command ?? '';
  const response = input.tool_response ?? {};
  const interrupted = response.interrupted === true;
  const exitCode = interrupted || response.error ? 1 : 0;
  return baseEvent(input, 'command.ended', now, 'metadata', {
    command_id: input.tool_use_id ?? hash(command),
    command_kind: 'shell',
    binary: binaryFromCommand(command),
    args_hash: hash(command),
    cwd_hash: hash(input.cwd),
    exit_code: exitCode,
    stdout_hash: hash(response.stdout),
    stderr_hash: hash(response.stderr),
    is_verification: isVerificationCommand(command),
    verification_kind: isVerificationCommand(command) ? 'command' : undefined
  });
}

function toolStarted(input, now) {
  return baseEvent(input, 'tool.call.started', now, 'metadata', {
    tool_name: input.tool_name ?? 'unknown',
    tool_type: 'claude_code_tool',
    tool_call_id: input.tool_use_id ?? hash(JSON.stringify(input.tool_input ?? {}))
  });
}

function toolEnded(input, now) {
  return baseEvent(input, 'tool.call.ended', now, 'metadata', {
    tool_name: input.tool_name ?? 'unknown',
    tool_type: 'claude_code_tool',
    tool_call_id: input.tool_use_id ?? hash(JSON.stringify(input.tool_input ?? {})),
    status: input.tool_response?.success === false ? 'error' : 'ok'
  });
}

export function normalizeClaudeCodeHook(input, options = {}) {
  const now = options.now ?? new Date().toISOString();

  switch (input.hook_event_name) {
    case 'SessionStart':
      return [sessionStarted(input, now)];
    case 'SessionEnd':
      return [sessionEnded(input, now)];
    case 'UserPromptSubmit':
      return [userPromptSubmitted(input, now)];
    case 'PreToolUse':
      if (input.tool_name === 'Bash') {
        return [bashCommandStarted(input, now)];
      }
      return [toolStarted(input, now)];
    case 'PostToolUse':
      if (input.tool_name === 'Bash') {
        return [bashCommandEnded(input, now)];
      }
      return [toolEnded(input, now)];
    default:
      return [];
  }
}
