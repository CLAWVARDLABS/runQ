// Spawn `codex exec "<prompt>"` headless. Same before/after diff trick as
// the Claude Code spawn helper — Codex writes a fresh rollout under
// ~/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-*.jsonl that the importer reads.

import { spawnSync } from 'node:child_process';

import { listCodexSessionFiles } from '../importers/codex.js';

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

export function pickNewTranscript(beforeFiles, afterFiles) {
  const beforeByPath = new Map(beforeFiles.map((file) => [file.path, file]));
  for (const file of afterFiles) {
    if (!beforeByPath.has(file.path)) return file;
  }
  let bestGrew = null;
  for (const file of afterFiles) {
    const prior = beforeByPath.get(file.path);
    if (prior && file.mtime > prior.mtime) {
      if (!bestGrew || file.mtime > bestGrew.mtime) bestGrew = file;
    }
  }
  return bestGrew;
}

export function spawnCodex({
  prompt,
  cwd,
  model = null,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  homeDir = process.env.HOME,
  listFiles = listCodexSessionFiles,
  spawnImpl = spawnSync,
  binary = 'codex'
} = {}) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('spawnCodex: prompt is required');
  }
  if (!cwd) {
    throw new Error('spawnCodex: cwd is required');
  }

  const before = listFiles(homeDir);
  // `codex exec` is the documented one-shot non-interactive mode. We pass
  // --cd <cwd> rather than relying on spawn cwd so the rollout records the
  // intended workspace_dir.
  const args = ['exec', prompt, '--cd', cwd];
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
    throw new Error('codex binary not found on PATH — install Codex first (https://github.com/openai/codex)');
  }
  if (result.error) {
    throw new Error(`codex spawn failed: ${result.error.message}`);
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
