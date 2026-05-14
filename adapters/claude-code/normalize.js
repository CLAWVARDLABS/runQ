import {
  binaryFromCommand,
  eventId as makeEventId,
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

function eventId(input, eventType, now) {
  return makeEventId([input.session_id, eventType, input.tool_use_id ?? '', now]);
}

function baseEvent(input, eventType, now, privacyLevel, payload, privacyMode) {
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
      redacted: privacyRedactedFor(privacyMode)
    },
    payload
  };
}

function sessionStarted(input, now, privacyMode) {
  return baseEvent(input, 'session.started', now, 'metadata', {
    agent_name: 'Claude Code',
    model: input.model ?? 'unknown',
    started_reason: input.source ?? 'unknown',
    permission_mode: input.permission_mode ?? 'unknown',
    transcript_path_hash: hash(input.transcript_path),
    ...rawFields(privacyMode, { transcript_path: input.transcript_path, cwd: input.cwd })
  }, privacyMode);
}

function sessionEnded(input, now, privacyMode) {
  return baseEvent(input, 'session.ended', now, 'metadata', {
    ended_reason: input.reason ?? input.source ?? 'unknown',
    permission_mode: input.permission_mode ?? 'unknown',
    transcript_path_hash: hash(input.transcript_path),
    ...rawFields(privacyMode, { transcript_path: input.transcript_path })
  }, privacyMode);
}

function userPromptSubmitted(input, now, privacyMode) {
  const prompt = input.prompt ?? '';
  return baseEvent(input, 'user.prompt.submitted', now, privacyLevelFor(privacyMode, 'summary'), {
    prompt_hash: hash(prompt),
    prompt_summary: textSummary(prompt),
    prompt_length: String(prompt).length,
    ...rawFields(privacyMode, { prompt })
  }, privacyMode);
}

function toolMcpServer(input) {
  return input.mcp_server ?? input.mcpServer ?? input.server_name ?? input.serverName ?? input.tool_input?.mcp_server ?? input.tool_input?.mcpServer;
}

function toolSkillName(input) {
  return input.skill_name ?? input.skillName ?? input.tool_input?.skill_name ?? input.tool_input?.skillName;
}

function bashCommandStarted(input, now, privacyMode) {
  const command = input.tool_input?.command ?? '';
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

function bashCommandEnded(input, now, privacyMode) {
  const command = input.tool_input?.command ?? '';
  const response = input.tool_response ?? {};
  const interrupted = response.interrupted === true;
  const exitCode = interrupted || response.error ? 1 : 0;
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
    tool_type: 'claude_code_tool',
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
    tool_type: 'claude_code_tool',
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

export function normalizeClaudeCodeHook(input, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const privacyMode = options.privacyMode ?? 'on';

  switch (input.hook_event_name) {
    case 'SessionStart':
      return [sessionStarted(input, now, privacyMode)];
    case 'SessionEnd':
      return [sessionEnded(input, now, privacyMode)];
    case 'UserPromptSubmit':
      return [userPromptSubmitted(input, now, privacyMode)];
    case 'PreToolUse':
      if (input.tool_name === 'Bash') {
        return [bashCommandStarted(input, now, privacyMode)];
      }
      return [toolStarted(input, now, privacyMode)];
    case 'PostToolUse':
      if (input.tool_name === 'Bash') {
        return [bashCommandEnded(input, now, privacyMode)];
      }
      return [toolEnded(input, now, privacyMode)];
    default:
      return [];
  }
}
