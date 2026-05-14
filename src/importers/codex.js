import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { eventId, hash, textSummary } from '../normalize-utils.js';
import { scoreRun } from '../scoring.js';
import { linkAgentEventParents } from '../event-tree.js';

// Codex CLI persists each rollout as
// ~/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-<ts>-<uuid>.jsonl.
// Records are tagged with `type` (session_meta | event_msg | response_item |
// turn_context); we extract just enough for a RunQ session timeline.

const RUNQ_VERSION = '0.1.0';
const FRAMEWORK = 'codex';
const SOURCE = 'import';
const SCHEMA_VERSION = '0.1.0';

function parseJsonl(path) {
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function makeEvent({ sessionId, type, timestamp, payload, parts }) {
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
    privacy: { level: 'metadata', redacted: true },
    payload
  };
}

function textOfMessage(payload) {
  if (!Array.isArray(payload?.content)) return '';
  return payload.content
    .filter((block) => typeof block?.text === 'string')
    .map((block) => block.text)
    .join('\n');
}

export function codexRolloutRowsToEvents(rows, fallbackSessionId = null) {
  const sessionMeta = rows.find((row) => row?.type === 'session_meta');
  const sessionId =
    sessionMeta?.payload?.id ??
    fallbackSessionId ??
    'ses_unknown_codex';

  const rowsWithTs = rows.filter((row) => row?.timestamp);
  if (rowsWithTs.length === 0) return [];
  rowsWithTs.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  const startedAt = sessionMeta?.payload?.timestamp ?? rowsWithTs[0].timestamp;
  const endedAt = rowsWithTs.at(-1).timestamp;
  const cwd =
    sessionMeta?.payload?.cwd ??
    rows.find((row) => row?.type === 'turn_context')?.payload?.cwd ??
    null;
  const events = [];

  events.push(makeEvent({
    sessionId,
    type: 'session.started',
    timestamp: startedAt,
    parts: [sessionId, 'session.started', startedAt],
    payload: {
      agent_name: 'Codex',
      workspace_dir: cwd,
      cli_version: sessionMeta?.payload?.cli_version ?? null,
      originator: sessionMeta?.payload?.originator ?? null
    }
  }));

  // Emit one user.prompt.submitted event per real user message. Codex
  // emits an `event_msg` with payload.type='user_message' for each real
  // user input (the response_item user messages also contain auto-injected
  // AGENTS.md context, which we skip). Falls back to response_item messages
  // when no event_msg user_message rows exist.
  const userMessageEvents = rows.filter((row) =>
    row?.type === 'event_msg' && row?.payload?.type === 'user_message' && typeof row?.payload?.message === 'string'
  );
  if (userMessageEvents.length > 0) {
    for (const [index, row] of userMessageEvents.entries()) {
      const text = row.payload.message;
      if (!text.trim()) continue;
      events.push(makeEvent({
        sessionId,
        type: 'user.prompt.submitted',
        timestamp: row.timestamp,
        parts: [sessionId, 'user.prompt.submitted', `${row.timestamp}:${index}`],
        payload: {
          prompt_length: text.length,
          prompt_summary: textSummary(text, 160),
          prompt_hash: hash(text)
        }
      }));
    }
  } else {
    // Older Codex rollouts may not have event_msg/user_message — fall back
    // to the first response_item user message.
    const firstUser = rows.find((row) =>
      row?.type === 'response_item' &&
      row?.payload?.type === 'message' &&
      row?.payload?.role === 'user'
    );
    if (firstUser) {
      const text = textOfMessage(firstUser.payload);
      if (text.trim()) {
        events.push(makeEvent({
          sessionId,
          type: 'user.prompt.submitted',
          timestamp: firstUser.timestamp,
          parts: [sessionId, 'user.prompt.submitted', firstUser.timestamp],
          payload: {
            prompt_length: text.length,
            prompt_summary: textSummary(text, 160),
            prompt_hash: hash(text)
          }
        }));
      }
    }
  }

  // Model calls inferred from turn_context (model + start) and token_count events.
  let lastModel = null;
  let turnCount = 0;
  for (const row of rows) {
    if (row?.type === 'turn_context') {
      const model = row.payload?.model ?? null;
      if (model && model !== lastModel) {
        lastModel = model;
      }
      turnCount += 1;
      events.push(makeEvent({
        sessionId,
        type: 'model.call.started',
        timestamp: row.timestamp,
        parts: [sessionId, 'model.call.started', row.payload?.turn_id ?? `${row.timestamp}:${turnCount}`],
        payload: {
          provider: row.payload?.model_provider ?? 'openai',
          model,
          turn_id: row.payload?.turn_id ?? null
        }
      }));
    }
    if (row?.type === 'event_msg' && row.payload?.type === 'token_count') {
      events.push(makeEvent({
        sessionId,
        type: 'model.call.ended',
        timestamp: row.timestamp,
        parts: [sessionId, 'model.call.ended', `${row.timestamp}:${turnCount}`],
        payload: {
          provider: 'openai',
          model: lastModel,
          input_tokens: Number(row.payload?.info?.last_token_usage?.input_tokens ?? 0),
          output_tokens: Number(row.payload?.info?.last_token_usage?.output_tokens ?? 0),
          cached_tokens: Number(row.payload?.info?.last_token_usage?.cached_input_tokens ?? 0),
          reasoning_tokens: Number(row.payload?.info?.last_token_usage?.reasoning_output_tokens ?? 0)
        }
      }));
    }
  }

  // Tool (function) calls
  const pendingCalls = new Map();
  for (const row of rows) {
    if (row?.type !== 'response_item') continue;
    const p = row.payload;
    if (p?.type === 'function_call' && p?.call_id) {
      pendingCalls.set(p.call_id, { name: p.name, timestamp: row.timestamp });
      events.push(makeEvent({
        sessionId,
        type: 'tool.call.started',
        timestamp: row.timestamp,
        parts: [sessionId, 'tool.call.started', p.call_id],
        payload: {
          tool_name: p.name,
          tool_call_id: p.call_id
        }
      }));
    } else if (p?.type === 'function_call_output' && p?.call_id) {
      const original = pendingCalls.get(p.call_id);
      const status = p.output?.success === false || p.output?.metadata?.exit_code > 0
        ? 'failed'
        : 'completed';
      events.push(makeEvent({
        sessionId,
        type: 'tool.call.ended',
        timestamp: row.timestamp,
        parts: [sessionId, 'tool.call.ended', p.call_id],
        payload: {
          tool_name: original?.name ?? null,
          tool_call_id: p.call_id,
          status
        }
      }));
    }
  }

  events.push(makeEvent({
    sessionId,
    type: 'session.ended',
    timestamp: endedAt,
    parts: [sessionId, 'session.ended', endedAt],
    payload: {
      agent_name: 'Codex',
      duration_ms: new Date(endedAt).getTime() - new Date(startedAt).getTime()
    }
  }));

  events.push(makeEvent({
    sessionId,
    type: 'outcome.scored',
    timestamp: endedAt,
    parts: [sessionId, 'outcome.scored', endedAt],
    payload: scoreRun(events)
  }));

  linkAgentEventParents(events);
  return events;
}

export function importCodexSessionFile(path) {
  return codexRolloutRowsToEvents(parseJsonl(path));
}

export function listCodexSessionFiles(homeDir = process.env.HOME) {
  const sessionsRoot = join(homeDir ?? '', '.codex', 'sessions');
  if (!existsSync(sessionsRoot)) return [];
  const files = [];

  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        try {
          const stat = statSync(full);
          if (stat.size === 0) continue;
          files.push({ path: full, size: stat.size, mtime: stat.mtimeMs });
        } catch {
          // ignore
        }
      }
    }
  }
  walk(sessionsRoot);
  return files.sort((a, b) => a.mtime - b.mtime);
}
