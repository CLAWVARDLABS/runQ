import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

import { binaryFromCommand, eventId, hash, isVerificationCommand } from '../normalize-utils.js';
import { scoreRun } from '../scoring.js';
import { linkAgentEventParents } from '../event-tree.js';

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

function isFileMutationTool(name) {
  return ['Edit', 'MultiEdit', 'Write', 'NotebookEdit'].includes(String(name ?? ''));
}

function commandPayload({ command, cwd, exitCode, output, toolUseId }) {
  const verification = isVerificationCommand(command);
  return {
    command_id: toolUseId ?? hash(command),
    command_kind: 'shell',
    binary: binaryFromCommand(command),
    args_hash: hash(command),
    cwd_hash: hash(cwd),
    exit_code: exitCode,
    stdout_hash: output === undefined ? undefined : hash(output),
    stderr_hash: undefined,
    is_verification: verification,
    verification_kind: verification ? 'command' : undefined
  };
}

function fileChangePayload(toolUse) {
  const input = toolUse.input ?? {};
  const filePath = input.file_path ?? input.path ?? input.notebook_path ?? '';
  const extension = extname(filePath).replace(/^\./, '');
  return {
    path_hash: hash(filePath),
    file_extension: extension || undefined,
    change_kind: toolUse.name === 'Write' ? 'written' : 'modified',
    tool_name: toolUse.name
  };
}

function toolResultContent(block) {
  if (typeof block?.content === 'string') return block.content;
  if (!Array.isArray(block?.content)) return '';
  return block.content
    .map((part) => typeof part === 'string' ? part : part?.text ?? '')
    .filter(Boolean)
    .join('\n');
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
        prompt_length: text.length,
        prompt_summary: text ? `Prompt captured · ${text.length} chars` : null
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
      toolUseIndex.set(block.id, { name: block.name, input: block.input, timestamp: startTs });
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
      if (block.name === 'Bash') {
        const command = block.input?.command ?? '';
        const payload = commandPayload({
          command,
          cwd,
          toolUseId: block.id
        });
        delete payload.exit_code;
        delete payload.stdout_hash;
        delete payload.stderr_hash;
        events.push(makeEvent({
          sessionId,
          type: 'command.started',
          timestamp: startTs,
          parts: [sessionId, 'command.started', block.id],
          payload
        }));
      }
      if (isFileMutationTool(block.name)) {
        events.push(makeEvent({
          sessionId,
          type: 'file.changed',
          timestamp: startTs,
          parts: [sessionId, 'file.changed', block.id],
          payload: fileChangePayload(block)
        }));
      }
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
      if (original.name === 'Bash') {
        const command = original.input?.command ?? '';
        const output = toolResultContent(block);
        events.push(makeEvent({
          sessionId,
          type: 'command.ended',
          timestamp: row.timestamp ?? original.timestamp,
          parts: [sessionId, 'command.ended', block.tool_use_id],
          payload: commandPayload({
            command,
            cwd,
            exitCode: isError ? 1 : 0,
            output,
            toolUseId: block.tool_use_id
          })
        }));
      }
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

  linkAgentEventParents(events);
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
