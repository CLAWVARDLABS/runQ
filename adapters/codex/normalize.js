import {
  binaryFromCommand,
  eventId,
  hash,
  isVerificationCommand,
  textSummary
} from '../../src/normalize-utils.js';

const runqVersion = '0.1.0';

function sessionId(input) {
  return input.session_id ?? input['turn-id'] ?? input.turn_id ?? 'codex-session-unknown';
}

function baseEvent(input, eventType, now, privacyLevel, payload) {
  const resolvedSessionId = sessionId(input);
  return {
    runq_version: runqVersion,
    event_id: eventId([resolvedSessionId, eventType, input.tool_use_id ?? input['turn-id'] ?? '', now]),
    schema_version: runqVersion,
    event_type: eventType,
    timestamp: now,
    session_id: resolvedSessionId,
    run_id: input.run_id ?? resolvedSessionId,
    framework: 'codex',
    source: input.hook_event_name ? 'hook' : 'import',
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

function isShellTool(toolName) {
  return ['shell', 'bash', 'exec', 'command'].includes(String(toolName ?? '').toLowerCase());
}

function commandFromInput(input) {
  return input.tool_input?.command ?? input.tool_input?.cmd ?? input.command ?? '';
}

function sessionStarted(input, now) {
  return baseEvent(input, 'session.started', now, 'metadata', {
    agent_name: 'Codex',
    model: input.model ?? 'unknown',
    started_reason: input.source ?? 'startup',
    agent_type: input.agent_type ?? 'default'
  });
}

function sessionEnded(input, now) {
  return baseEvent(input, 'session.ended', now, 'metadata', {
    ended_reason: input.reason ?? input.type ?? 'unknown',
    last_assistant_message_hash: hash(input['last-assistant-message'] ?? input.last_assistant_message),
    input_messages_count: Array.isArray(input['input-messages']) ? input['input-messages'].length : undefined
  });
}

function userPromptSubmitted(input, now) {
  const prompt = input.prompt ?? input.input ?? '';
  return baseEvent(input, 'user.prompt.submitted', now, 'summary', {
    prompt_hash: hash(prompt),
    prompt_summary: textSummary(prompt),
    prompt_length: String(prompt).length
  });
}

function commandStarted(input, now) {
  const command = commandFromInput(input);
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

function commandEnded(input, now) {
  const command = commandFromInput(input);
  const response = input.tool_response ?? {};
  const exitCode = Number.isInteger(response.exit_code) ? response.exit_code : response.error ? 1 : 0;
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
    tool_type: 'codex_tool',
    tool_call_id: input.tool_use_id ?? hash(JSON.stringify(input.tool_input ?? {}))
  });
}

function toolEnded(input, now) {
  return baseEvent(input, 'tool.call.ended', now, 'metadata', {
    tool_name: input.tool_name ?? 'unknown',
    tool_type: 'codex_tool',
    tool_call_id: input.tool_use_id ?? hash(JSON.stringify(input.tool_input ?? {})),
    status: input.tool_response?.success === false ? 'error' : 'ok'
  });
}

export function normalizeCodexHook(input, options = {}) {
  const now = options.now ?? new Date().toISOString();

  if (input.type === 'agent-turn-complete') {
    return [sessionEnded(input, now)];
  }

  switch (input.hook_event_name) {
    case 'SessionStart':
      return [sessionStarted(input, now)];
    case 'SessionEnd':
    case 'Stop':
      return [sessionEnded(input, now)];
    case 'UserPromptSubmit':
      return [userPromptSubmitted(input, now)];
    case 'PreToolUse':
      return isShellTool(input.tool_name) ? [commandStarted(input, now)] : [toolStarted(input, now)];
    case 'PostToolUse':
      return isShellTool(input.tool_name) ? [commandEnded(input, now)] : [toolEnded(input, now)];
    default:
      return [];
  }
}
