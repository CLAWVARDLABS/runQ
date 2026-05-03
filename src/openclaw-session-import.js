import { readFileSync } from 'node:fs';

import { normalizeOpenClawEvent } from '../adapters/openclaw/normalize.js';
import { eventId } from './normalize-utils.js';
import { scoreRun } from './scoring.js';

function textBlocks(content) {
  if (!Array.isArray(content)) {
    return typeof content === 'string' ? content : '';
  }
  return content
    .filter((block) => block?.type === 'text')
    .map((block) => block.text)
    .filter(Boolean)
    .join('\n');
}

function parseJsonl(path) {
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function openClawSessionRowsToRunQEvents(rows) {
  const session = rows.find((row) => row.type === 'session');
  if (!session?.id) {
    throw new Error('OpenClaw session jsonl is missing a session row with id');
  }

  const modelChange = rows.find((row) => row.type === 'model_change');
  const userMessage = rows.find((row) => row.type === 'message' && row.message?.role === 'user');
  const assistantMessage = rows.find((row) => row.type === 'message' && row.message?.role === 'assistant');
  const provider = assistantMessage?.message?.provider ?? modelChange?.provider;
  const model = assistantMessage?.message?.model ?? modelChange?.modelId;
  const prompt = textBlocks(userMessage?.message?.content);
  const assistantText = textBlocks(assistantMessage?.message?.content);
  const usage = assistantMessage?.message?.usage ?? {};
  const endedAt = assistantMessage?.timestamp ?? session.timestamp;
  const base = {
    sessionId: session.id,
    runId: session.id,
    sessionKey: session.id,
    workspaceDir: session.cwd
  };

  const inputs = [
    {
      hook: 'session_start',
      event: base,
      ctx: { agentId: 'openclaw-main', sessionId: session.id, workspaceDir: session.cwd },
      now: session.timestamp
    }
  ];

  if (prompt) {
    inputs.push(
      {
        hook: 'message_received',
        event: { ...base, content: prompt },
        ctx: { agentId: 'openclaw-main', sessionId: session.id, workspaceDir: session.cwd },
        now: userMessage?.timestamp ?? session.timestamp
      },
      {
        hook: 'llm_input',
        event: { ...base, provider, model, prompt, historyMessages: [prompt] },
        ctx: { agentId: 'openclaw-main', sessionId: session.id, workspaceDir: session.cwd },
        now: userMessage?.timestamp ?? session.timestamp
      }
    );
  }

  for (const row of rows) {
    if (row.type === 'tool_call') {
      inputs.push({
        hook: 'before_tool_call',
        event: {
          ...base,
          toolName: row.name ?? row.toolName,
          toolCallId: row.id ?? row.toolCallId,
          params: row.params
        },
        ctx: { agentId: 'openclaw-main', sessionId: session.id, workspaceDir: session.cwd },
        now: row.timestamp ?? session.timestamp
      });
    }
    if (row.type === 'tool_result') {
      inputs.push({
        hook: 'after_tool_call',
        event: {
          ...base,
          toolName: row.name ?? row.toolName,
          toolCallId: row.toolCallId ?? row.id,
          params: row.params,
          result: row.result,
          error: row.error,
          durationMs: row.durationMs
        },
        ctx: { agentId: 'openclaw-main', sessionId: session.id, workspaceDir: session.cwd },
        now: row.timestamp ?? session.timestamp
      });
    }
  }

  if (assistantMessage) {
    inputs.push({
      hook: 'llm_output',
      event: {
        ...base,
        provider,
        model,
        assistantTexts: [assistantText],
        usage: {
          input: usage.input,
          output: usage.output,
          cacheRead: usage.cacheRead,
          cacheWrite: usage.cacheWrite,
          total: usage.totalTokens ?? usage.total
        }
      },
      ctx: { agentId: 'openclaw-main', sessionId: session.id, workspaceDir: session.cwd },
      now: assistantMessage.timestamp
    });
  }

  const success = assistantMessage?.message?.stopReason === 'stop';
  inputs.push({
    hook: 'agent_end',
    event: {
      ...base,
      success,
      error: assistantMessage?.message?.errorMessage,
      durationMs: assistantMessage ? Date.parse(assistantMessage.timestamp) - Date.parse(session.timestamp) : undefined
    },
    ctx: { agentId: 'openclaw-main', sessionId: session.id, workspaceDir: session.cwd },
    now: endedAt
  });

  const events = inputs.flatMap((input) => normalizeOpenClawEvent(input, { now: input.now }));
  events.push({
    runq_version: '0.1.0',
    event_id: eventId([session.id, session.id, 'satisfaction.recorded', endedAt]),
    schema_version: '0.1.0',
    event_type: 'satisfaction.recorded',
    timestamp: endedAt,
    session_id: session.id,
    run_id: session.id,
    framework: 'openclaw',
    source: 'import',
    privacy: { level: 'metadata', redacted: true },
    payload: {
      label: success ? 'accepted' : 'abandoned',
      signal: success ? 'openclaw_session_completed' : 'openclaw_session_failed',
      confidence: success ? 0.85 : 0.9
    }
  });

  const score = scoreRun(events);
  events.push({
    runq_version: '0.1.0',
    event_id: eventId([session.id, session.id, 'outcome.scored', endedAt]),
    schema_version: '0.1.0',
    event_type: 'outcome.scored',
    timestamp: endedAt,
    session_id: session.id,
    run_id: session.id,
    framework: 'openclaw',
    source: 'import',
    privacy: { level: 'metadata', redacted: true },
    payload: score
  });

  return events;
}

export function importOpenClawSessionFile(path) {
  return openClawSessionRowsToRunQEvents(parseJsonl(path));
}
