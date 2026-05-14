import {
  binaryFromCommand,
  eventId,
  hash,
  isVerificationCommand,
  metadataHash,
  objectKeyCount,
  privacyLevelFor,
  privacyRedactedFor,
  rawFields,
  textSummary
} from '../../src/normalize-utils.js';

const runqVersion = '0.1.0';

function sessionId(input) {
  return input.session_id ?? input['turn-id'] ?? input.turn_id ?? 'codex-session-unknown';
}

function baseEvent(input, eventType, now, privacyLevel, payload, privacyMode) {
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
      redacted: privacyRedactedFor(privacyMode)
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

function toolMcpServer(input) {
  return input.mcp_server ?? input.mcpServer ?? input.server_name ?? input.serverName ?? input.tool_input?.mcp_server ?? input.tool_input?.mcpServer;
}

function toolSkillName(input) {
  return input.skill_name ?? input.skillName ?? input.tool_input?.skill_name ?? input.tool_input?.skillName;
}

function sessionStarted(input, now, privacyMode) {
  return baseEvent(input, 'session.started', now, 'metadata', {
    agent_name: 'Codex',
    model: input.model ?? 'unknown',
    started_reason: input.source ?? 'startup',
    agent_type: input.agent_type ?? 'default',
    ...rawFields(privacyMode, { cwd: input.cwd })
  }, privacyMode);
}

function sessionEnded(input, now, privacyMode) {
  const lastMessage = input['last-assistant-message'] ?? input.last_assistant_message;
  return baseEvent(input, 'session.ended', now, 'metadata', {
    ended_reason: input.reason ?? input.type ?? input.hook_event_name ?? 'unknown',
    last_assistant_message_hash: hash(lastMessage),
    input_messages_count: Array.isArray(input['input-messages']) ? input['input-messages'].length : undefined,
    ...rawFields(privacyMode, { last_assistant_message: lastMessage, input_messages: input['input-messages'] })
  }, privacyMode);
}

function userPromptSubmitted(input, now, privacyMode) {
  const prompt = input.prompt ?? input.input ?? '';
  return baseEvent(input, 'user.prompt.submitted', now, privacyLevelFor(privacyMode, 'summary'), {
    prompt_hash: hash(prompt),
    prompt_summary: textSummary(prompt),
    prompt_length: String(prompt).length,
    ...rawFields(privacyMode, { prompt })
  }, privacyMode);
}

function commandStarted(input, now, privacyMode) {
  const command = commandFromInput(input);
  return baseEvent(input, 'command.started', now, privacyLevelFor(privacyMode, 'metadata'), {
    command_id: input.tool_use_id ?? hash(command),
    command_kind: 'shell',
    binary: binaryFromCommand(command),
    args_hash: hash(command),
    cwd_hash: hash(input.cwd),
    is_verification: isVerificationCommand(command),
    verification_kind: isVerificationCommand(command) ? 'command' : undefined,
    ...rawFields(privacyMode, { command, cwd: input.cwd })
  }, privacyMode);
}

function commandEnded(input, now, privacyMode) {
  const command = commandFromInput(input);
  const response = input.tool_response ?? {};
  const exitCode = Number.isInteger(response.exit_code) ? response.exit_code : response.error ? 1 : 0;
  return baseEvent(input, 'command.ended', now, privacyLevelFor(privacyMode, 'metadata'), {
    command_id: input.tool_use_id ?? hash(command),
    command_kind: 'shell',
    binary: binaryFromCommand(command),
    args_hash: hash(command),
    cwd_hash: hash(input.cwd),
    exit_code: exitCode,
    stdout_hash: hash(response.stdout),
    stderr_hash: hash(response.stderr),
    is_verification: isVerificationCommand(command),
    verification_kind: isVerificationCommand(command) ? 'command' : undefined,
    ...rawFields(privacyMode, { command, cwd: input.cwd, stdout: response.stdout, stderr: response.stderr })
  }, privacyMode);
}

function toolStarted(input, now, privacyMode) {
  const actionInput = input.tool_input;
  return baseEvent(input, 'tool.call.started', now, privacyLevelFor(privacyMode, 'metadata'), {
    tool_name: input.tool_name ?? 'unknown',
    tool_type: 'codex_tool',
    tool_call_id: input.tool_use_id ?? hash(JSON.stringify(input.tool_input ?? {})),
    mcp_server: toolMcpServer(input),
    skill_name: toolSkillName(input),
    input_hash: metadataHash(actionInput),
    input_key_count: objectKeyCount(actionInput),
    ...rawFields(privacyMode, { tool_input: actionInput })
  }, privacyMode);
}

function toolEnded(input, now, privacyMode) {
  const actionInput = input.tool_input;
  const actionOutput = input.tool_response;
  return baseEvent(input, 'tool.call.ended', now, privacyLevelFor(privacyMode, 'metadata'), {
    tool_name: input.tool_name ?? 'unknown',
    tool_type: 'codex_tool',
    tool_call_id: input.tool_use_id ?? hash(JSON.stringify(input.tool_input ?? {})),
    status: input.tool_response?.success === false ? 'error' : 'ok',
    mcp_server: toolMcpServer(input),
    skill_name: toolSkillName(input),
    input_hash: metadataHash(actionInput),
    input_key_count: objectKeyCount(actionInput),
    output_hash: metadataHash(actionOutput),
    output_key_count: objectKeyCount(actionOutput),
    ...rawFields(privacyMode, { tool_input: actionInput, tool_response: actionOutput })
  }, privacyMode);
}

export function normalizeCodexHook(input, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const privacyMode = options.privacyMode ?? 'on';

  if (input.type === 'agent-turn-complete') {
    return [sessionEnded(input, now, privacyMode)];
  }

  switch (input.hook_event_name) {
    case 'SessionStart':
      return [sessionStarted(input, now, privacyMode)];
    case 'SessionEnd':
    case 'Stop':
      return [sessionEnded(input, now, privacyMode)];
    case 'UserPromptSubmit':
      return [userPromptSubmitted(input, now, privacyMode)];
    case 'PreToolUse':
      return isShellTool(input.tool_name) ? [commandStarted(input, now, privacyMode)] : [toolStarted(input, now, privacyMode)];
    case 'PostToolUse':
      return isShellTool(input.tool_name) ? [commandEnded(input, now, privacyMode)] : [toolEnded(input, now, privacyMode)];
    default:
      return [];
  }
}
