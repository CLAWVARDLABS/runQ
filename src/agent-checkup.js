import { RunqStore } from './store.js';
import {
  importClaudeCodeSessionFile,
  listClaudeCodeSessionFiles
} from './importers/claude-code.js';
import {
  importCodexSessionFile,
  listCodexSessionFiles
} from './importers/codex.js';
import {
  importOpenClawSessionFile,
  listOpenClawSessionFiles
} from './importers/openclaw.js';
import {
  hermesStateAvailable,
  hermesStatePath,
  importHermesState
} from './importers/hermes.js';

// Public agent ids used in URLs / DB framework column. These match the
// values RunInboxApp surfaces (knownAgents in components/run-inbox/format.js).
export const SUPPORTED_CHECKUP_AGENTS = ['claude_code', 'codex', 'openclaw', 'hermes'];

function agentHomeDir(agentId, homeDir) {
  const base = homeDir ?? '';
  if (agentId === 'claude_code') return `${base}/.claude`;
  if (agentId === 'codex') return `${base}/.codex`;
  if (agentId === 'openclaw') return `${base}/.openclaw`;
  if (agentId === 'hermes') return `${base}/.hermes`;
  return null;
}

function appendEvents(store, events) {
  let inserted = 0;
  let skipped = 0;
  const sessionIds = new Set();
  for (const event of events) {
    try {
      const added = store.tryAppendEvent(event);
      if (added) inserted += 1;
      else skipped += 1;
      sessionIds.add(event.session_id);
    } catch {
      skipped += 1;
    }
  }
  return { inserted, skipped, sessionCount: sessionIds.size };
}

async function checkupClaudeCode(store, homeDir) {
  const files = listClaudeCodeSessionFiles(homeDir);
  const stats = { inserted: 0, skipped: 0, sessionCount: 0 };
  for (const file of files) {
    try {
      const events = importClaudeCodeSessionFile(file.path);
      const result = appendEvents(store, events);
      stats.inserted += result.inserted;
      stats.skipped += result.skipped;
      stats.sessionCount += result.sessionCount;
    } catch {
      // Skip malformed transcripts rather than aborting the whole checkup.
    }
  }
  return { files: files.length, ...stats };
}

async function checkupCodex(store, homeDir) {
  const files = listCodexSessionFiles(homeDir);
  const stats = { inserted: 0, skipped: 0, sessionCount: 0 };
  for (const file of files) {
    try {
      const events = importCodexSessionFile(file.path);
      const result = appendEvents(store, events);
      stats.inserted += result.inserted;
      stats.skipped += result.skipped;
      stats.sessionCount += result.sessionCount;
    } catch {
      // ignore malformed rollouts
    }
  }
  return { files: files.length, ...stats };
}

async function checkupOpenClaw(store, homeDir) {
  const files = listOpenClawSessionFiles(homeDir);
  const stats = { inserted: 0, skipped: 0, sessionCount: 0 };
  for (const file of files) {
    try {
      const events = importOpenClawSessionFile(file.path);
      const result = appendEvents(store, events);
      stats.inserted += result.inserted;
      stats.skipped += result.skipped;
      stats.sessionCount += result.sessionCount;
    } catch {
      // ignore malformed sessions
    }
  }
  return { files: files.length, ...stats };
}

async function checkupHermes(store, homeDir) {
  if (!hermesStateAvailable(homeDir)) {
    return { files: 0, inserted: 0, skipped: 0, sessionCount: 0 };
  }
  const { sessions, events } = importHermesState(homeDir);
  const result = appendEvents(store, events);
  return { files: sessions, ...result };
}

export async function runAgentCheckup(agentId, {
  dbPath,
  homeDir = process.env.HOME
} = {}) {
  if (!SUPPORTED_CHECKUP_AGENTS.includes(agentId)) {
    throw new Error(`Unsupported agent for checkup: ${agentId}`);
  }
  if (!dbPath) {
    throw new Error('dbPath is required');
  }

  const sourceDir = agentId === 'hermes'
    ? hermesStatePath(homeDir)
    : agentHomeDir(agentId, homeDir);

  // For non-Hermes agents, the home dir must exist.
  if (agentId !== 'hermes') {
    const fs = await import('node:fs');
    if (!fs.existsSync(sourceDir)) {
      return {
        agent_id: agentId,
        status: 'absent',
        scanned_files: 0,
        imported_sessions: 0,
        imported_events: 0,
        skipped_events: 0,
        duration_ms: 0,
        source_dir: sourceDir,
        message: `${agentId} is not installed locally (looked for ${sourceDir})`
      };
    }
  } else if (!hermesStateAvailable(homeDir)) {
    return {
      agent_id: agentId,
      status: 'absent',
      scanned_files: 0,
      imported_sessions: 0,
      imported_events: 0,
      skipped_events: 0,
      duration_ms: 0,
      source_dir: sourceDir,
      message: `Hermes is not installed locally (no ${sourceDir})`
    };
  }

  const started = Date.now();
  const store = new RunqStore(dbPath);
  let result;
  try {
    if (agentId === 'claude_code') result = await checkupClaudeCode(store, homeDir);
    else if (agentId === 'codex') result = await checkupCodex(store, homeDir);
    else if (agentId === 'openclaw') result = await checkupOpenClaw(store, homeDir);
    else if (agentId === 'hermes') result = await checkupHermes(store, homeDir);
  } finally {
    store.close();
  }
  const duration = Date.now() - started;

  return {
    agent_id: agentId,
    status: result.files === 0 ? 'empty' : 'success',
    scanned_files: result.files,
    imported_sessions: result.sessionCount,
    imported_events: result.inserted,
    skipped_events: result.skipped,
    duration_ms: duration,
    source_dir: sourceDir,
    message: result.files === 0
      ? `No historical sessions found under ${sourceDir}`
      : `Imported ${result.inserted} new event(s) across ${result.sessionCount} session(s)`
  };
}
