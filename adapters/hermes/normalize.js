import {
  binaryFromCommand,
  eventId,
  hash,
  isVerificationCommand,
  textSummary
} from '../../src/normalize-utils.js';

const runqVersion = '0.1.0';

function sessionId(input) {
  return input.session_id ?? input.sessionId ?? input.session ?? input.run_id ?? input.runId ?? 'hermes-session-unknown';
}

function runId(input) {
  return input.run_id ?? input.runId ?? sessionId(input);
}

function baseEvent(input, eventType, now, privacyLevel, payload) {
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
      redacted: true
    },
    payload
  };
}

function commandFromInput(input) {
  return input.command ?? input.cmd ?? input.tool_input?.command ?? '';
}

export function normalizeHermesEvent(input, options = {}) {
  const now = options.now ?? input.timestamp ?? new Date().toISOString();
  const type = input.type ?? input.event_type;

  if (type === 'session.started' || type === 'session_start') {
    return [baseEvent(input, 'session.started', now, 'metadata', {
      agent_name: input.agent ?? input.agent_name ?? 'Hermes',
      model: input.model,
      session_key_hash: hash(input.session_key ?? input.sessionKey)
    })];
  }

  if (type === 'session.ended' || type === 'session_end') {
    return [baseEvent(input, 'session.ended', now, 'metadata', {
      ended_reason: input.success === false || input.error ? 'error' : input.reason ?? 'session_end',
      success: input.success,
      error_hash: input.error ? hash(input.error) : undefined,
      duration_ms: input.duration_ms ?? input.durationMs
    })];
  }

  if (type === 'message.user' || type === 'user.prompt') {
    const prompt = input.prompt ?? input.content ?? '';
    return [baseEvent(input, 'user.prompt.submitted', now, 'summary', {
      prompt_hash: hash(prompt),
      prompt_summary: textSummary(prompt),
      prompt_length: String(prompt).length
    })];
  }

  if (type === 'model.started' || type === 'llm.started') {
    const prompt = input.prompt ?? '';
    return [baseEvent(input, 'model.call.started', now, 'summary', {
      provider: input.provider,
      model: input.model,
      prompt_hash: hash(prompt),
      prompt_summary: textSummary(prompt),
      prompt_length: String(prompt).length
    })];
  }

  if (type === 'model.finished' || type === 'llm.finished') {
    const text = input.assistant_text ?? input.output ?? '';
    return [baseEvent(input, 'model.call.ended', now, 'summary', {
      provider: input.provider,
      model: input.model,
      assistant_summary: textSummary(text),
      assistant_text_hash: hash(text),
      input_tokens: input.usage?.input ?? input.input_tokens,
      output_tokens: input.usage?.output ?? input.output_tokens,
      total_tokens: input.usage?.total ?? input.total_tokens
    })];
  }

  if (type === 'command.started') {
    const command = commandFromInput(input);
    return [baseEvent(input, 'command.started', now, 'metadata', {
      command_id: input.command_id ?? hash(command),
      command_kind: 'shell',
      binary: binaryFromCommand(command),
      args_hash: hash(command),
      cwd_hash: hash(input.cwd),
      is_verification: isVerificationCommand(command),
      verification_kind: isVerificationCommand(command) ? 'command' : undefined
    })];
  }

  if (type === 'command.finished' || type === 'command.ended') {
    const command = commandFromInput(input);
    return [baseEvent(input, 'command.ended', now, 'metadata', {
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
      verification_kind: isVerificationCommand(command) ? 'command' : undefined
    })];
  }

  return [];
}
