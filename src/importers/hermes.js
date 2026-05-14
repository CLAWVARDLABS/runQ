import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { eventId, hash, privacyLevelFor, privacyRedactedFor, rawFields, textSummary } from '../normalize-utils.js';
import { scoreRun } from '../scoring.js';
import { linkAgentEventParents } from '../event-tree.js';

// Hermes Agent persists everything in ~/.hermes/state.db (SQLite, WAL):
//   sessions(id, source, user_id, model, ..., input_tokens, output_tokens,
//            cache_read_tokens, cache_write_tokens, reasoning_tokens,
//            estimated_cost_usd, started_at REAL, ended_at REAL, end_reason,
//            message_count, tool_call_count)
//   messages(id, session_id, role, content, tool_call_id, tool_calls, tool_name,
//            timestamp REAL, token_count, finish_reason, ...)
//
// We read each session, emit a minimal RunQ timeline.

const RUNQ_VERSION = '0.1.0';
const FRAMEWORK = 'hermes';
const SOURCE = 'import';
const SCHEMA_VERSION = '0.1.0';

function toIso(unixSeconds) {
  if (unixSeconds == null) return null;
  return new Date(Number(unixSeconds) * 1000).toISOString();
}

function makeEvent({ sessionId, type, timestamp, payload, parts, privacyMode = 'on' }) {
  return {
    runq_version: RUNQ_VERSION,
    event_id: eventId(parts ?? [sessionId, type, timestamp]),
    schema_version: SCHEMA_VERSION,
    event_type: type,
    timestamp,
    session_id: sessionId,
    run_id: sessionId,
    framework: FRAMEWORK,
    source: SOURCE,
    privacy: {
      level: privacyLevelFor(privacyMode, 'metadata'),
      redacted: privacyRedactedFor(privacyMode)
    },
    payload
  };
}

function safeParseToolCalls(json) {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function hermesStateRowsToEvents(session, messages, privacyMode = 'on') {
  if (!session?.id || !session?.started_at) return [];
  const sessionId = session.id;
  const startedAt = toIso(session.started_at);
  const endedAt = toIso(session.ended_at ?? session.started_at);
  const sortedMessages = [...(messages ?? [])].sort(
    (a, b) => Number(a.timestamp ?? 0) - Number(b.timestamp ?? 0)
  );
  const events = [];

  events.push(makeEvent({
    sessionId,
    privacyMode,
    type: 'session.started',
    timestamp: startedAt,
    parts: [sessionId, 'session.started', startedAt],
    payload: {
      agent_name: 'Hermes',
      source: session.source ?? null,
      model: session.model ?? null,
      title: session.title ?? null
    }
  }));

  // One user.prompt.submitted event per Hermes user message. Hermes only
  // records actual user inputs in `messages.role='user'` — no system fluff to
  // skip.
  const userRows = sortedMessages.filter((row) => row?.role === 'user' && row?.content);
  for (const row of userRows) {
    const text = String(row.content ?? '');
    if (!text.trim()) continue;
    events.push(makeEvent({
      sessionId,
      privacyMode,
      type: 'user.prompt.submitted',
      timestamp: toIso(row.timestamp) ?? startedAt,
      parts: [sessionId, 'user.prompt.submitted', row.id ?? row.timestamp],
      payload: {
        prompt_length: text.length,
        prompt_summary: textSummary(text, 160),
        prompt_hash: hash(text),
        ...rawFields(privacyMode, { prompt: text })
      }
    }));
  }

  // One synthetic model.call.* per assistant message with usage.
  for (const row of sortedMessages) {
    if (row?.role !== 'assistant') continue;
    const ts = toIso(row.timestamp) ?? startedAt;
    events.push(makeEvent({
      sessionId,
      privacyMode,
      type: 'model.call.started',
      timestamp: ts,
      parts: [sessionId, 'model.call.started', row.id ?? `${ts}:start`],
      payload: { provider: session.billing_provider ?? null, model: session.model ?? null }
    }));
    events.push(makeEvent({
      sessionId,
      privacyMode,
      type: 'model.call.ended',
      timestamp: ts,
      parts: [sessionId, 'model.call.ended', row.id ?? `${ts}:end`],
      payload: {
        provider: session.billing_provider ?? null,
        model: session.model ?? null,
        output_tokens: Number(row.token_count ?? 0),
        finish_reason: row.finish_reason ?? null,
        ...rawFields(privacyMode, { assistant_content: row.content })
      }
    }));
    for (const call of safeParseToolCalls(row.tool_calls)) {
      const callId = call?.id ?? `${row.id ?? ts}:${call?.function?.name ?? 'tool'}`;
      const toolName = call?.function?.name ?? call?.name ?? 'unknown';
      events.push(makeEvent({
        sessionId,
        privacyMode,
        type: 'tool.call.started',
        timestamp: ts,
        parts: [sessionId, 'tool.call.started', callId],
        payload: {
          tool_name: toolName,
          tool_call_id: callId,
          ...rawFields(privacyMode, { arguments: call?.function?.arguments ?? call?.arguments })
        }
      }));
    }
  }

  // Tool results (role: tool) close out matching calls.
  for (const row of sortedMessages) {
    if (row?.role !== 'tool' || !row?.tool_call_id) continue;
    const ts = toIso(row.timestamp) ?? endedAt;
    events.push(makeEvent({
      sessionId,
      privacyMode,
      type: 'tool.call.ended',
      timestamp: ts,
      parts: [sessionId, 'tool.call.ended', row.tool_call_id],
      payload: {
        tool_name: row.tool_name ?? null,
        tool_call_id: row.tool_call_id,
        status: 'completed',
        ...rawFields(privacyMode, { output: row.content })
      }
    }));
  }

  events.push(makeEvent({
    sessionId,
    privacyMode,
    type: 'session.ended',
    timestamp: endedAt,
    parts: [sessionId, 'session.ended', endedAt],
    payload: {
      agent_name: 'Hermes',
      end_reason: session.end_reason ?? null,
      duration_ms: session.ended_at && session.started_at
        ? Math.round((Number(session.ended_at) - Number(session.started_at)) * 1000)
        : 0,
      input_tokens: Number(session.input_tokens ?? 0),
      output_tokens: Number(session.output_tokens ?? 0)
    }
  }));

  events.push(makeEvent({
    sessionId,
    privacyMode,
    type: 'outcome.scored',
    timestamp: endedAt,
    parts: [sessionId, 'outcome.scored', endedAt],
    payload: scoreRun(events)
  }));

  linkAgentEventParents(events);
  return events;
}

export function hermesStatePath(homeDir = process.env.HOME) {
  return join(homeDir ?? '', '.hermes', 'state.db');
}

export function hermesStateAvailable(homeDir = process.env.HOME) {
  return existsSync(hermesStatePath(homeDir));
}

export function importHermesState(homeDir = process.env.HOME, privacyMode = 'on') {
  const dbPath = hermesStatePath(homeDir);
  if (!existsSync(dbPath)) return { sessions: 0, events: [] };

  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const sessions = db.prepare(
      'SELECT * FROM sessions ORDER BY started_at ASC'
    ).all();
    const events = [];
    for (const session of sessions) {
      const messages = db.prepare(
        'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC'
      ).all(session.id);
      events.push(...hermesStateRowsToEvents(session, messages, privacyMode));
    }
    return { sessions: sessions.length, events };
  } finally {
    db.close();
  }
}
