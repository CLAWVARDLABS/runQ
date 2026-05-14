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
  return input.session_id ?? input.sessionId ?? input.session ?? input.run_id ?? input.runId ?? 'hermes-session-unknown';
}

function runId(input) {
  return input.run_id ?? input.runId ?? sessionId(input);
}

function baseEvent(input, eventType, now, privacyLevel, payload, privacyMode) {
  const resolvedSessionId = sessionId(input);
  const resolvedRunId = runId(input);
  return {
    runq_version: runqVersion,
    event_id: eventId([
      resolvedSessionId,
      resolvedRunId,
      eventType,
      input.type ?? input.event_type ?? '',
      input.command_id ?? input.tool_call_id ?? '',
      now
    ]),
    schema_version: runqVersion,
    event_type: eventType,
    timestamp: now,
    session_id: resolvedSessionId,
    run_id: resolvedRunId,
    framework: 'hermes',
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

function commandFromInput(input) {
  return input.command ?? input.cmd ?? input.tool_input?.command ?? '';
}

function toolName(input) {
  return input.tool_name ?? input.toolName ?? input.name ?? input.tool?.name ?? 'unknown';
}

function toolCallId(input) {
  return input.tool_call_id ?? input.toolCallId ?? input.tool_use_id ?? input.toolUseId ?? hash(JSON.stringify(input.tool_input ?? input.input ?? {}));
}

function toolInput(input) {
  return input.tool_input ?? input.input ?? input.params;
}

function toolOutput(input) {
  return input.tool_response ?? input.output ?? input.result ?? input.response;
}

function toolMcpServer(input) {
  return input.mcp_server ?? input.mcpServer ?? input.server_name ?? input.serverName ?? input.tool?.mcp_server ?? input.tool?.mcpServer;
}

function toolSkillName(input) {
  return input.skill_name ?? input.skillName ?? input.skill?.name;
}

export function normalizeHermesEvent(input, options = {}) {
  const now = options.now ?? input.timestamp ?? new Date().toISOString();
  const privacyMode = options.privacyMode ?? 'on';
  const type = input.type ?? input.event_type;

  if (type === 'session.started' || type === 'session_start') {
    return [baseEvent(input, 'session.started', now, 'metadata', {
      agent_name: input.agent ?? input.agent_name ?? 'Hermes',
      model: input.model,
      session_key_hash: hash(input.session_key ?? input.sessionKey),
      ...rawFields(privacyMode, { session_key: input.session_key ?? input.sessionKey, cwd: input.cwd })
    }, privacyMode)];
  }

  if (type === 'session.ended' || type === 'session_end') {
    return [baseEvent(input, 'session.ended', now, 'metadata', {
      ended_reason: input.success === false || input.error ? 'error' : input.reason ?? 'session_end',
      success: input.success,
      error_hash: input.error ? hash(input.error) : undefined,
      duration_ms: input.duration_ms ?? input.durationMs,
      ...rawFields(privacyMode, { error: input.error })
    }, privacyMode)];
  }

  if (type === 'message.user' || type === 'user.prompt') {
    const prompt = input.prompt ?? input.content ?? '';
    return [baseEvent(input, 'user.prompt.submitted', now, privacyLevelFor(privacyMode, 'summary'), {
      prompt_hash: hash(prompt),
      prompt_summary: textSummary(prompt),
      prompt_length: String(prompt).length,
      ...rawFields(privacyMode, { prompt })
    }, privacyMode)];
  }

  if (type === 'model.started' || type === 'llm.started') {
    const prompt = input.prompt ?? '';
    return [baseEvent(input, 'model.call.started', now, privacyLevelFor(privacyMode, 'summary'), {
      provider: input.provider,
      model: input.model,
      prompt_hash: hash(prompt),
      prompt_summary: textSummary(prompt),
      prompt_length: String(prompt).length,
      ...rawFields(privacyMode, { prompt })
    }, privacyMode)];
  }

  if (type === 'model.finished' || type === 'llm.finished') {
    const text = input.assistant_text ?? input.output ?? '';
    return [baseEvent(input, 'model.call.ended', now, privacyLevelFor(privacyMode, 'summary'), {
      provider: input.provider,
      model: input.model,
      assistant_summary: textSummary(text),
      assistant_text_hash: hash(text),
      input_tokens: input.usage?.input ?? input.input_tokens,
      output_tokens: input.usage?.output ?? input.output_tokens,
      total_tokens: input.usage?.total ?? input.total_tokens,
      ...rawFields(privacyMode, { assistant_text: text })
    }, privacyMode)];
  }

  if (type === 'command.started') {
    const command = commandFromInput(input);
    return [baseEvent(input, 'command.started', now, privacyLevelFor(privacyMode, 'metadata'), {
      command_id: input.command_id ?? hash(command),
      command_kind: 'shell',
      binary: binaryFromCommand(command),
      args_hash: hash(command),
      cwd_hash: hash(input.cwd),
      is_verification: isVerificationCommand(command),
      verification_kind: isVerificationCommand(command) ? 'command' : undefined,
      ...rawFields(privacyMode, { command, cwd: input.cwd })
    }, privacyMode)];
  }

  if (type === 'command.finished' || type === 'command.ended') {
    const command = commandFromInput(input);
    return [baseEvent(input, 'command.ended', now, privacyLevelFor(privacyMode, 'metadata'), {
      command_id: input.command_id ?? hash(command),
      command_kind: 'shell',
      binary: binaryFromCommand(command),
      args_hash: hash(command),
      cwd_hash: hash(input.cwd),
      exit_code: Number.isInteger(input.exit_code) ? input.exit_code : input.success === false ? 1 : 0,
      stdout_hash: hash(input.stdout),
      stderr_hash: hash(input.stderr ?? input.error),
      duration_ms: input.duration_ms ?? input.durationMs,
      is_verification: isVerificationCommand(command),
      verification_kind: isVerificationCommand(command) ? 'command' : undefined,
      ...rawFields(privacyMode, { command, cwd: input.cwd, stdout: input.stdout, stderr: input.stderr ?? input.error })
    }, privacyMode)];
  }

  if (type === 'tool.started' || type === 'tool.call.started') {
    const actionInput = toolInput(input);
    return [baseEvent(input, 'tool.call.started', now, privacyLevelFor(privacyMode, 'metadata'), {
      tool_name: toolName(input),
      tool_type: input.tool_type ?? input.toolType ?? 'hermes_tool',
      tool_call_id: toolCallId(input),
      mcp_server: toolMcpServer(input),
      skill_name: toolSkillName(input),
      input_hash: metadataHash(actionInput),
      input_key_count: objectKeyCount(actionInput),
      ...rawFields(privacyMode, { tool_input: actionInput })
    }, privacyMode)];
  }

  if (type === 'tool.finished' || type === 'tool.ended' || type === 'tool.call.ended') {
    const actionInput = toolInput(input);
    const actionOutput = toolOutput(input);
    return [baseEvent(input, 'tool.call.ended', now, privacyLevelFor(privacyMode, 'metadata'), {
      tool_name: toolName(input),
      tool_type: input.tool_type ?? input.toolType ?? 'hermes_tool',
      tool_call_id: toolCallId(input),
      mcp_server: toolMcpServer(input),
      skill_name: toolSkillName(input),
      status: input.success === false || input.error ? 'error' : input.status ?? 'ok',
      duration_ms: input.duration_ms ?? input.durationMs,
      input_hash: metadataHash(actionInput),
      input_key_count: objectKeyCount(actionInput),
      output_hash: metadataHash(actionOutput),
      output_key_count: objectKeyCount(actionOutput),
      ...rawFields(privacyMode, { tool_input: actionInput, tool_response: actionOutput })
    }, privacyMode)];
  }

  return [];
}
