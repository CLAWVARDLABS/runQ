// Spawn `claude -p "<prompt>"` headless and identify the new transcript file
// the CLI wrote at ~/.claude/projects/<encoded-cwd>/<uuid>.jsonl.
//
// We don't parse Claude Code's output. We rely on it leaving a transcript
// file behind, which the standard importer can then read. The
// before/after diff of listClaudeCodeSessionFiles() picks the newcomer.

import { spawnSync } from 'node:child_process';

import { listClaudeCodeSessionFiles } from '../importers/claude-code.js';

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

function fileSetKey(file) {
  return `${file.path}::${file.size}::${file.mtime}`;
}

// Pure function — exposed for unit tests. Given a "before" snapshot of
// transcript files and an "after" snapshot, return the newly-appeared one
// (or the modified one when the agent appended to an existing transcript).
export function pickNewTranscript(beforeFiles, afterFiles) {
  const beforeByPath = new Map(beforeFiles.map((file) => [file.path, file]));
  // 1. brand-new file
  for (const file of afterFiles) {
    if (!beforeByPath.has(file.path)) return file;
  }
  // 2. existing file whose mtime grew (agent appended to it)
  let bestGrew = null;
  for (const file of afterFiles) {
    const prior = beforeByPath.get(file.path);
    if (prior && file.mtime > prior.mtime) {
      if (!bestGrew || file.mtime > bestGrew.mtime) bestGrew = file;
    }
  }
  return bestGrew;
}

export function spawnClaudeCode({
  prompt,
  cwd,
  model = null,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  homeDir = process.env.HOME,
  // Test hooks — let unit tests inject their own snapshot + spawn impls
  // without monkey-patching node:child_process.
  listFiles = listClaudeCodeSessionFiles,
  spawnImpl = spawnSync,
  binary = 'claude'
} = {}) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('spawnClaudeCode: prompt is required');
  }
  if (!cwd) {
    throw new Error('spawnClaudeCode: cwd is required');
  }

  const before = listFiles(homeDir);
  const args = ['-p', prompt, '--dangerously-skip-permissions'];
  if (model) args.push('--model', model);

  const started = Date.now();
  const result = spawnImpl(binary, args, {
    cwd,
    encoding: 'utf8',
    timeout: timeoutMs,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const durationMs = Date.now() - started;

  if (result.error && result.error.code === 'ENOENT') {
    throw new Error('claude binary not found on PATH — install Claude Code first (https://docs.anthropic.com/claude-code/quickstart)');
  }
  if (result.error) {
    throw new Error(`claude spawn failed: ${result.error.message}`);
  }

  const after = listFiles(homeDir);
  const newTranscript = pickNewTranscript(before, after);

  return {
    binary,
    args,
    cwd,
    exit_code: result.status,
    signal: result.signal ?? null,
    duration_ms: durationMs,
    stdout_len: (result.stdout || '').length,
    stderr_len: (result.stderr || '').length,
    stderr_tail: (result.stderr || '').slice(-1000),
    session_file_path: newTranscript?.path ?? null,
    before_file_count: before.length,
    after_file_count: after.length
  };
}
