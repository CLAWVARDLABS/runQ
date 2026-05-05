import {
  binaryFromCommand,
  eventId,
  hash,
  isVerificationCommand,
  textSummary
} from '../../src/normalize-utils.js';

const runqVersion = '0.1.0';

function hookName(input) {
  return input.hook ?? input.hook_name ?? input.hookName;
}

function event(input) {
  return input.event ?? input;
}

function context(input) {
  return input.ctx ?? input.context ?? {};
}

function normalizeSessionKey(value) {
  const raw = typeof value === 'string' ? value : '';
  const explicitPrefix = 'agent:main:explicit:';
  if (raw.startsWith(explicitPrefix)) {
    return raw.slice(explicitPrefix.length);
  }
  return value;
}

function sessionId(input) {
  const evt = event(input);
  const ctx = context(input);
  return normalizeSessionKey(evt.sessionId ??
    evt.session_id ??
    ctx.sessionId ??
    ctx.session_id ??
    input.sessionKey ??
    evt.sessionKey ??
    ctx.sessionKey ??
    input.runId ??
    evt.runId ??
    'openclaw-session-unknown');
}

function runId(input) {
  const evt = event(input);
  const ctx = context(input);
  return normalizeSessionKey(evt.runId ?? ctx.runId ?? input.runId ?? sessionId(input));
}

function workspaceDir(input) {
  return context(input).workspaceDir ?? event(input).workspaceDir ?? input.cwd;
}

function baseEvent(input, eventType, now, privacyLevel, payload) {
  const resolvedSessionId = sessionId(input);
  const resolvedRunId = runId(input);
  const hook = hookName(input) ?? input.stream ?? 'import';
  const cwd = workspaceDir(input);
  return {
    runq_version: runqVersion,
    event_id: eventId([
      resolvedSessionId,
      resolvedRunId,
      eventType,
      hook,
      event(input).toolCallId ?? event(input).callId ?? input.seq ?? '',
      now
    ]),
    schema_version: runqVersion,
    event_type: eventType,
    timestamp: now,
    session_id: resolvedSessionId,
    run_id: resolvedRunId,
    framework: 'openclaw',
    source: hookName(input) ? 'hook' : 'import',
    repo: cwd ? {
      id: hash(cwd),
      root_hash: hash(cwd),
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
  const evt = event(input);
  const ctx = context(input);
  return baseEvent(input, 'session.started', now, 'metadata', {
    agent_name: ctx.agentId ?? 'OpenClaw',
    session_key_hash: hash(evt.sessionKey ?? ctx.sessionKey),
    resumed_from_hash: evt.resumedFrom ? hash(evt.resumedFrom) : undefined
  });
}

function sessionEnded(input, now) {
  const evt = event(input);
  return baseEvent(input, 'session.ended', now, 'metadata', {
    ended_reason: evt.reason ?? 'session_end',
    session_key_hash: hash(evt.sessionKey),
    message_count: evt.messageCount,
    duration_ms: evt.durationMs
  });
}

function agentEnded(input, now) {
  const evt = event(input);
  return baseEvent(input, 'session.ended', now, 'metadata', {
    ended_reason: evt.success === false ? 'error' : 'agent_end',
    success: evt.success,
    error_hash: evt.error ? hash(evt.error) : undefined,
    duration_ms: evt.durationMs
  });
}

function llmInput(input, now) {
  const evt = event(input);
  const prompt = evt.prompt ?? '';
  return baseEvent(input, 'model.call.started', now, 'summary', {
    provider: evt.provider,
    model: evt.model,
    prompt_hash: hash(prompt),
    prompt_summary: textSummary(prompt),
    prompt_length: String(prompt).length,
    history_messages_count: Array.isArray(evt.historyMessages) ? evt.historyMessages.length : undefined,
    images_count: evt.imagesCount
  });
}

function llmOutput(input, now) {
  const evt = event(input);
  const assistantTexts = Array.isArray(evt.assistantTexts) ? evt.assistantTexts.join('\n') : '';
  return baseEvent(input, 'model.call.ended', now, 'summary', {
    provider: evt.provider,
    model: evt.model,
    assistant_summary: textSummary(assistantTexts),
    assistant_text_hash: hash(assistantTexts),
    input_tokens: evt.usage?.input,
    output_tokens: evt.usage?.output,
    cache_read_tokens: evt.usage?.cacheRead,
    cache_write_tokens: evt.usage?.cacheWrite,
    total_tokens: evt.usage?.total
  });
}

function modelCallStarted(input, now) {
  const evt = event(input);
  return baseEvent(input, 'model.call.started', now, 'metadata', {
    provider: evt.provider,
    model: evt.model,
    api: evt.api,
    transport: evt.transport,
    call_id_hash: hash(evt.callId),
    session_key_hash: hash(evt.sessionKey)
  });
}

function modelCallEnded(input, now) {
  const evt = event(input);
  return baseEvent(input, 'model.call.ended', now, 'metadata', {
    provider: evt.provider,
    model: evt.model,
    api: evt.api,
    transport: evt.transport,
    call_id_hash: hash(evt.callId),
    session_key_hash: hash(evt.sessionKey),
    duration_ms: evt.durationMs,
    outcome: evt.outcome,
    error_category: evt.errorCategory,
    failure_kind: evt.failureKind,
    request_payload_bytes: evt.requestPayloadBytes,
    response_stream_bytes: evt.responseStreamBytes,
    time_to_first_byte_ms: evt.timeToFirstByteMs,
    upstream_request_id_hash: evt.upstreamRequestIdHash
  });
}

function userPrompt(input, now) {
  const evt = event(input);
  const content = evt.content ?? evt.prompt ?? '';
  return baseEvent(input, 'user.prompt.submitted', now, 'summary', {
    from_hash: hash(evt.from),
    prompt_hash: hash(content),
    prompt_summary: textSummary(content),
    prompt_length: String(content).length
  });
}

function isCommandTool(name) {
  return ['system.run', 'system.exec', 'bash', 'shell', 'exec', 'command'].includes(String(name ?? '').toLowerCase());
}

function commandFromEvent(evt) {
  return evt.params?.command ??
    evt.params?.cmd ??
    evt.result?.command ??
    evt.command ??
    evt.data?.command ??
    '';
}

function commandStarted(input, now) {
  const evt = event(input);
  const command = commandFromEvent(evt);
  return baseEvent(input, 'command.started', now, 'metadata', {
    command_id: evt.toolCallId ?? hash(command),
    command_kind: 'shell',
    binary: binaryFromCommand(command),
    args_hash: hash(command),
    cwd_hash: hash(workspaceDir(input)),
    is_verification: isVerificationCommand(command),
    verification_kind: isVerificationCommand(command) ? 'command' : undefined
  });
}

function exitCodeFromToolResult(evt) {
  if (Number.isInteger(evt.result?.exitCode)) {
    return evt.result.exitCode;
  }
  if (Number.isInteger(evt.result?.exit_code)) {
    return evt.result.exit_code;
  }
  if (evt.error) {
    return 1;
  }
  return evt.result?.success === false ? 1 : 0;
}

function commandEnded(input, now) {
  const evt = event(input);
  const command = commandFromEvent(evt);
  return baseEvent(input, 'command.ended', now, 'metadata', {
    command_id: evt.toolCallId ?? hash(command),
    command_kind: 'shell',
    binary: binaryFromCommand(command),
    args_hash: hash(command),
    cwd_hash: hash(workspaceDir(input)),
    exit_code: exitCodeFromToolResult(evt),
    stdout_hash: hash(evt.result?.stdout),
    stderr_hash: hash(evt.result?.stderr ?? evt.error),
    output_hash: hash(evt.result?.output),
    duration_ms: evt.durationMs,
    is_verification: isVerificationCommand(command),
    verification_kind: isVerificationCommand(command) ? 'command' : undefined
  });
}

function toolStarted(input, now) {
  const evt = event(input);
  return baseEvent(input, 'tool.call.started', now, 'metadata', {
    tool_name: evt.toolName ?? context(input).toolName ?? 'unknown',
    tool_type: 'openclaw_tool',
    tool_call_id: evt.toolCallId ?? hash(JSON.stringify(evt.params ?? {}))
  });
}

function toolEnded(input, now) {
  const evt = event(input);
  return baseEvent(input, 'tool.call.ended', now, 'metadata', {
    tool_name: evt.toolName ?? context(input).toolName ?? 'unknown',
    tool_type: 'openclaw_tool',
    tool_call_id: evt.toolCallId ?? hash(JSON.stringify(evt.params ?? {})),
    status: evt.error || evt.result?.success === false ? 'error' : 'ok',
    duration_ms: evt.durationMs
  });
}

function nodeExecFinished(input, now) {
  const data = input.data ?? {};
  const command = data.command ?? '';
  return baseEvent({
    ...input,
    event: {
      sessionKey: data.sessionKey ?? input.sessionKey,
      runId: data.runId ?? input.runId
    }
  }, 'command.ended', now, 'metadata', {
    command_id: hash(command),
    command_kind: 'shell',
    binary: binaryFromCommand(command),
    args_hash: hash(command),
    exit_code: Number.isInteger(data.exitCode) ? data.exitCode : data.success === false ? 1 : 0,
    output_hash: hash(data.output),
    timed_out: data.timedOut,
    is_verification: isVerificationCommand(command),
    verification_kind: isVerificationCommand(command) ? 'command' : undefined
  });
}

export function normalizeOpenClawEvent(input, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const hook = hookName(input);
  const evt = event(input);

  if (input.stream === 'tool' && input.data?.type === 'exec.finished') {
    return [nodeExecFinished(input, now)];
  }

  switch (hook) {
    case 'session_start':
      return [sessionStarted(input, now)];
    case 'session_end':
      return [sessionEnded(input, now)];
    case 'agent_end':
      return [agentEnded(input, now)];
    case 'model_call_started':
      return [modelCallStarted(input, now)];
    case 'model_call_ended':
      return [modelCallEnded(input, now)];
    case 'llm_input':
      return [llmInput(input, now)];
    case 'llm_output':
      return [llmOutput(input, now)];
    case 'message_received':
      return [userPrompt(input, now)];
    case 'before_tool_call':
      return isCommandTool(evt.toolName) ? [commandStarted(input, now)] : [toolStarted(input, now)];
    case 'after_tool_call':
    case 'tool_result_persist':
      return isCommandTool(evt.toolName ?? context(input).toolName) ? [commandEnded(input, now)] : [toolEnded(input, now)];
    default:
      return [];
  }
}
