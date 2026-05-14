import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { eventId } from '../normalize-utils.js';
import { scoreRun } from '../scoring.js';

// Claude Code persists each session as ~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl.
// Records are heterogeneous; we extract just enough to emit a minimum-viable
// RunQ session timeline (start/end, prompt, model calls, tool calls, outcome).

const RUNQ_VERSION = '0.1.0';
const FRAMEWORK = 'claude_code';
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

function flattenText(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n');
}

function collectToolUses(content) {
  if (!Array.isArray(content)) return [];
  return content.filter((block) => block?.type === 'tool_use');
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

export function claudeCodeSessionRowsToEvents(rows, fallbackSessionId = null) {
  const rowsWithTs = rows.filter((row) => row && row.timestamp);
  const sessionId =
    rows.find((row) => row?.sessionId)?.sessionId ??
    fallbackSessionId ??
    'ses_unknown_claude_code';

  if (rowsWithTs.length === 0) {
    return [];
  }

  rowsWithTs.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  const startedAt = rowsWithTs[0].timestamp;
  const endedAt = rowsWithTs.at(-1).timestamp;
  const cwd = rows.find((row) => row?.cwd)?.cwd ?? null;
  const gitBranch = rows.find((row) => row?.gitBranch)?.gitBranch ?? null;
  const events = [];

  events.push(makeEvent({
    sessionId,
    type: 'session.started',
    timestamp: startedAt,
    parts: [sessionId, 'session.started', startedAt],
    payload: {
      agent_name: 'Claude Code',
      workspace_dir: cwd,
      git_branch: gitBranch
    }
  }));

  const firstUserPrompt = rows.find((row) =>
    row?.type === 'user' && row?.message?.role === 'user' && row?.timestamp
  );
  if (firstUserPrompt) {
    const text = flattenText(firstUserPrompt.message?.content) || String(firstUserPrompt.message?.content ?? '');
    events.push(makeEvent({
      sessionId,
      type: 'user.prompt.submitted',
      timestamp: firstUserPrompt.timestamp,
      parts: [sessionId, 'user.prompt.submitted', firstUserPrompt.timestamp],
      payload: {
        prompt_chars: text.length
      }
    }));
  }

  const toolUseIndex = new Map();
  const assistantRecords = rows.filter((row) =>
    row?.message?.role === 'assistant' && row?.timestamp && row?.message?.id
  );
  // Deduplicate by message.id (Claude Code writes the same assistant message
  // multiple times during streaming).
  const seenAssistantIds = new Set();
  for (const record of assistantRecords) {
    const msgId = record.message.id;
    if (seenAssistantIds.has(msgId)) continue;
    seenAssistantIds.add(msgId);

    const model = record.message.model ?? null;
    const usage = record.message.usage ?? {};
    const startTs = record.timestamp;
    events.push(makeEvent({
      sessionId,
      type: 'model.call.started',
      timestamp: startTs,
      parts: [sessionId, 'model.call.started', msgId],
      payload: {
        provider: 'anthropic',
        model,
        message_id: msgId
      }
    }));
    events.push(makeEvent({
      sessionId,
      type: 'model.call.ended',
      timestamp: startTs,
      parts: [sessionId, 'model.call.ended', msgId],
      payload: {
        provider: 'anthropic',
        model,
        message_id: msgId,
        input_tokens: Number(usage.input_tokens ?? 0),
        output_tokens: Number(usage.output_tokens ?? 0),
        cache_creation_input_tokens: Number(usage.cache_creation_input_tokens ?? 0),
        cache_read_input_tokens: Number(usage.cache_read_input_tokens ?? 0),
        stop_reason: record.message.stop_reason ?? null
      }
    }));

    for (const block of collectToolUses(record.message.content)) {
      toolUseIndex.set(block.id, { name: block.name, timestamp: startTs });
      events.push(makeEvent({
        sessionId,
        type: 'tool.call.started',
        timestamp: startTs,
        parts: [sessionId, 'tool.call.started', block.id],
        payload: {
          tool_name: block.name,
          tool_call_id: block.id
        }
      }));
    }
  }

  // Tool results arrive as later user-role messages whose content blocks have
  // type: "tool_result" with the matching tool_use_id.
  for (const row of rows) {
    if (!row || row.message?.role !== 'user' || !Array.isArray(row.message?.content)) continue;
    for (const block of row.message.content) {
      if (block?.type !== 'tool_result' || !block.tool_use_id) continue;
      const original = toolUseIndex.get(block.tool_use_id);
      if (!original) continue;
      const isError = Boolean(block.is_error);
      events.push(makeEvent({
        sessionId,
        type: 'tool.call.ended',
        timestamp: row.timestamp ?? original.timestamp,
        parts: [sessionId, 'tool.call.ended', block.tool_use_id],
        payload: {
          tool_name: original.name,
          tool_call_id: block.tool_use_id,
          status: isError ? 'failed' : 'completed'
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
      agent_name: 'Claude Code',
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

  return events;
}

export function importClaudeCodeSessionFile(path) {
  return claudeCodeSessionRowsToEvents(parseJsonl(path));
}

export function listClaudeCodeSessionFiles(homeDir = process.env.HOME) {
  const projectsDir = join(homeDir ?? '', '.claude', 'projects');
  if (!existsSync(projectsDir)) return [];
  const files = [];
  for (const projectDir of readdirSync(projectsDir, { withFileTypes: true })) {
    if (!projectDir.isDirectory()) continue;
    const dir = join(projectsDir, projectDir.name);
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;
      const path = join(dir, entry.name);
      try {
        const stat = statSync(path);
        if (stat.size === 0) continue;
        files.push({ path, size: stat.size, mtime: stat.mtimeMs });
      } catch {
        // ignore unreadable entries
      }
    }
  }
  return files.sort((a, b) => a.mtime - b.mtime);
}
