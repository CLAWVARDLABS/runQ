// Orchestrate a session replay: load the original, sandbox its cwd, spawn
// the agent headlessly with the same first prompt, import the new
// transcript, tag it as a replay, and hand the caller {original, new} so
// the UI can route to /compare.
//
// v1 limits (per ROADMAP / approved plan):
//   - Only the first user.prompt.submitted of the original session is
//     replayed. Multi-turn replays are a future plan.
//   - Only claude_code and codex are supported — they have headless
//     one-shot CLIs (`claude -p` and `codex exec`). OpenClaw and Hermes
//     don't have a standard non-interactive entry today.

import { spawnSync as nodeSpawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  importClaudeCodeSessionFile,
  listClaudeCodeSessionFiles
} from './importers/claude-code.js';
import {
  importCodexSessionFile,
  listCodexSessionFiles
} from './importers/codex.js';
import { spawnClaudeCode } from './replay/spawn-claude-code.js';
import { spawnCodex } from './replay/spawn-codex.js';
import { RunqStore } from './store.js';
import { defaultRunInboxDbPath } from './run-inbox-data.js';

const REPLAYABLE_FRAMEWORKS = new Set(['claude_code', 'codex']);

function readOriginalSession(store, sessionId) {
  const sessions = store.listSessions();
  const summary = sessions.find((session) => session.session_id === sessionId);
  if (!summary) {
    throw new Error(`replay: session ${sessionId} not found in this DB`);
  }
  const events = store.listEventsForSession(sessionId);
  if (events.length === 0) {
    throw new Error(`replay: session ${sessionId} has no events`);
  }
  const sessionStarted = events.find((event) => event.event_type === 'session.started');
  const firstPrompt = events.find((event) => event.event_type === 'user.prompt.submitted');
  if (!firstPrompt) {
    throw new Error(`replay: session ${sessionId} has no user.prompt.submitted event — can't determine what to replay`);
  }
  const promptText = firstPrompt.payload?.prompt ?? firstPrompt.payload?.prompt_summary ?? null;
  if (!promptText || typeof promptText !== 'string' || !promptText.trim()) {
    throw new Error(`replay: session ${sessionId} prompt is empty or redacted — replay requires the original prompt content (privacy mode 'off' captures it)`);
  }
  return {
    summary,
    framework: summary.framework,
    workspace_dir: sessionStarted?.payload?.workspace_dir ?? null,
    model: events
      .filter((event) => event.event_type === 'model.call.started' || event.event_type === 'model.call.ended')
      .map((event) => event.payload?.model)
      .find((value) => typeof value === 'string'),
    promptText
  };
}

function setupSandbox({ inplace, sourceCwd, spawnImpl, onProgress }) {
  if (inplace) {
    if (!sourceCwd) {
      throw new Error('replay: --inplace requires the original session to know its workspace_dir');
    }
    if (!existsSync(sourceCwd)) {
      throw new Error(`replay: --inplace target ${sourceCwd} does not exist`);
    }
    return { cwd: sourceCwd, sandbox: false, cleanup: () => {} };
  }
  const sandboxRoot = mkdtempSync(join(tmpdir(), 'runq-replay-'));
  if (!sourceCwd || !existsSync(sourceCwd)) {
    // Original cwd unknown / missing — proceed with an empty sandbox. The
    // agent will run in an empty directory; some prompts (no-file-required
    // questions) still work.
    onProgress?.({ phase: 'sandbox-empty', cwd: sandboxRoot });
    return { cwd: sandboxRoot, sandbox: true, cleanup: () => {} };
  }
  const hasGit = existsSync(join(sourceCwd, '.git'));
  if (hasGit) {
    onProgress?.({ phase: 'sandbox-clone', source: sourceCwd, target: sandboxRoot });
    const cloned = spawnImpl('git', ['clone', '--depth', '1', sourceCwd, sandboxRoot], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    if (cloned.status !== 0) {
      throw new Error(`replay: git clone failed (exit ${cloned.status}): ${(cloned.stderr || '').slice(0, 500)}`);
    }
    return { cwd: sandboxRoot, sandbox: true, cleanup: () => {} };
  }
  // Plain directory copy fallback. Use cpSync (Node 16.7+) — synchronous,
  // dereferences symlinks, preserves structure.
  onProgress?.({ phase: 'sandbox-copy', source: sourceCwd, target: sandboxRoot });
  cpSync(sourceCwd, sandboxRoot, { recursive: true, errorOnExist: false });
  return { cwd: sandboxRoot, sandbox: true, cleanup: () => {} };
}

function importTranscriptForFramework({ framework, transcriptPath }) {
  if (!transcriptPath || !existsSync(transcriptPath)) {
    throw new Error(`replay: spawn finished but no transcript file was produced (expected to find a new file under ~/.${framework === 'claude_code' ? 'claude/projects' : 'codex/sessions'})`);
  }
  if (framework === 'claude_code') return importClaudeCodeSessionFile(transcriptPath);
  if (framework === 'codex') return importCodexSessionFile(transcriptPath);
  throw new Error(`replay: no importer for framework ${framework}`);
}

function tagReplayedEvents(events, { originalSessionId, replayOverrides }) {
  return events.map((event) => {
    if (event.event_type !== 'session.started') return event;
    return {
      ...event,
      payload: {
        ...(event.payload || {}),
        replayed_from: originalSessionId,
        replay_overrides: replayOverrides
      }
    };
  });
}

export async function runReplay(sessionId, {
  dbPath = defaultRunInboxDbPath(),
  homeDir = process.env.HOME,
  inplace = false,
  model = null,
  timeoutMs = undefined,
  spawnImpl = nodeSpawnSync,
  spawnClaude = spawnClaudeCode,
  spawnCodexImpl = spawnCodex,
  onProgress = null
} = {}) {
  const emit = (event) => onProgress?.(event);

  emit({ phase: 'starting', session_id: sessionId });
  const store = new RunqStore(dbPath);
  let original;
  try {
    original = readOriginalSession(store, sessionId);
  } catch (error) {
    store.close();
    throw error;
  }
  if (!REPLAYABLE_FRAMEWORKS.has(original.framework)) {
    store.close();
    throw new Error(`replay: framework ${original.framework} is not replayable yet (only claude_code and codex have headless CLIs)`);
  }
  emit({
    phase: 'loaded',
    framework: original.framework,
    workspace_dir: original.workspace_dir,
    prompt_length: original.promptText.length,
    original_model: original.model ?? null
  });

  const sandboxInfo = setupSandbox({
    inplace,
    sourceCwd: original.workspace_dir,
    spawnImpl,
    onProgress: emit
  });
  emit({ phase: 'sandbox-ready', cwd: sandboxInfo.cwd, sandbox: sandboxInfo.sandbox });

  emit({ phase: 'spawning', framework: original.framework, model: model ?? null });
  const replayStarted = Date.now();
  let spawnResult;
  if (original.framework === 'claude_code') {
    spawnResult = spawnClaude({
      prompt: original.promptText,
      cwd: sandboxInfo.cwd,
      model,
      timeoutMs,
      homeDir
    });
  } else {
    spawnResult = spawnCodexImpl({
      prompt: original.promptText,
      cwd: sandboxInfo.cwd,
      model,
      timeoutMs,
      homeDir
    });
  }
  emit({
    phase: 'spawn-finished',
    exit_code: spawnResult.exit_code,
    duration_ms: spawnResult.duration_ms,
    session_file_path: spawnResult.session_file_path
  });

  if (spawnResult.exit_code !== 0) {
    store.close();
    throw new Error(`replay: agent exited with status ${spawnResult.exit_code}; stderr tail: ${(spawnResult.stderr_tail || '').slice(0, 500)}`);
  }
  if (!spawnResult.session_file_path) {
    store.close();
    throw new Error('replay: agent finished but did not produce a new transcript file');
  }

  // Stat the transcript to confirm it really is freshly written (defensive).
  try { statSync(spawnResult.session_file_path); } catch (error) {
    store.close();
    throw new Error(`replay: transcript file missing at ${spawnResult.session_file_path}: ${error.message}`);
  }

  emit({ phase: 'importing', transcript_path: spawnResult.session_file_path });
  const rawEvents = importTranscriptForFramework({
    framework: original.framework,
    transcriptPath: spawnResult.session_file_path
  });
  if (rawEvents.length === 0) {
    store.close();
    throw new Error('replay: transcript parsed to zero events — agent may have aborted before writing');
  }
  const replayOverrides = {
    model: model ?? null,
    cwd: sandboxInfo.cwd,
    inplace
  };
  const taggedEvents = tagReplayedEvents(rawEvents, {
    originalSessionId: sessionId,
    replayOverrides
  });

  const newSessionId = taggedEvents.find((event) => event.event_type === 'session.started')?.session_id
    ?? taggedEvents[0].session_id;

  let inserted = 0;
  let skipped = 0;
  try {
    for (const event of taggedEvents) {
      const added = store.tryAppendEvent(event);
      if (added) inserted += 1; else skipped += 1;
    }
  } finally {
    store.close();
  }

  const totalDurationMs = Date.now() - replayStarted;
  emit({
    phase: 'done',
    original_session_id: sessionId,
    new_session_id: newSessionId,
    inserted_events: inserted,
    skipped_events: skipped,
    duration_ms: totalDurationMs,
    sandbox_cwd: sandboxInfo.cwd,
    compare_url: `/compare?a=${encodeURIComponent(sessionId)}&b=${encodeURIComponent(newSessionId)}`
  });

  return {
    original_session_id: sessionId,
    new_session_id: newSessionId,
    framework: original.framework,
    sandbox: sandboxInfo.sandbox,
    sandbox_cwd: sandboxInfo.cwd,
    duration_ms: totalDurationMs,
    inserted_events: inserted,
    skipped_events: skipped,
    compare_url: `/compare?a=${encodeURIComponent(sessionId)}&b=${encodeURIComponent(newSessionId)}`
  };
}
