import test from 'node:test';
import assert from 'node:assert/strict';

import { spawnClaudeCode, pickNewTranscript as pickClaudeNew } from '../src/replay/spawn-claude-code.js';
import { spawnCodex, pickNewTranscript as pickCodexNew } from '../src/replay/spawn-codex.js';

test('pickNewTranscript returns the brand-new path when one appeared', () => {
  const before = [{ path: '/a.jsonl', size: 10, mtime: 100 }];
  const after = [
    { path: '/a.jsonl', size: 10, mtime: 100 },
    { path: '/b.jsonl', size: 20, mtime: 200 }
  ];
  const result = pickClaudeNew(before, after);
  assert.equal(result.path, '/b.jsonl');
});

test('pickNewTranscript returns the appended-to file when no new file appeared', () => {
  const before = [{ path: '/a.jsonl', size: 10, mtime: 100 }];
  const after = [{ path: '/a.jsonl', size: 50, mtime: 300 }];
  const result = pickClaudeNew(before, after);
  assert.equal(result.path, '/a.jsonl');
});

test('pickNewTranscript returns null when nothing changed', () => {
  const snap = [{ path: '/a.jsonl', size: 10, mtime: 100 }];
  assert.equal(pickClaudeNew(snap, snap), null);
});

test('pickNewTranscript codex variant behaves the same as the claude one', () => {
  const before = [{ path: '/x/y/r-a.jsonl', size: 1, mtime: 1 }];
  const after = [
    ...before,
    { path: '/x/y/r-b.jsonl', size: 2, mtime: 2 }
  ];
  assert.equal(pickCodexNew(before, after).path, '/x/y/r-b.jsonl');
});

test('spawnClaudeCode requires a prompt', () => {
  assert.throws(() => spawnClaudeCode({ cwd: '/tmp', listFiles: () => [], spawnImpl: () => ({}) }), /prompt is required/);
});

test('spawnClaudeCode requires a cwd', () => {
  assert.throws(() => spawnClaudeCode({ prompt: 'hi', listFiles: () => [], spawnImpl: () => ({}) }), /cwd is required/);
});

test('spawnClaudeCode reports a friendly error when the binary is missing', () => {
  const spawnImpl = () => ({ error: Object.assign(new Error('not found'), { code: 'ENOENT' }) });
  assert.throws(
    () => spawnClaudeCode({ prompt: 'hi', cwd: '/tmp', listFiles: () => [], spawnImpl }),
    /not found on PATH/
  );
});

test('spawnClaudeCode passes the prompt + model flags to claude correctly', () => {
  let captured;
  const spawnImpl = (binary, args, opts) => {
    captured = { binary, args, opts };
    return { status: 0, stdout: '', stderr: '' };
  };
  spawnClaudeCode({
    prompt: 'fix the bug',
    cwd: '/tmp/sandbox',
    model: 'claude-sonnet-4-6',
    listFiles: () => [],
    spawnImpl
  });
  assert.equal(captured.binary, 'claude');
  assert.deepEqual(captured.args, ['-p', 'fix the bug', '--dangerously-skip-permissions', '--model', 'claude-sonnet-4-6']);
  assert.equal(captured.opts.cwd, '/tmp/sandbox');
});

test('spawnClaudeCode identifies the freshly-written transcript via list diff', () => {
  let n = 0;
  const listFiles = () => {
    n += 1;
    if (n === 1) return [{ path: '/a.jsonl', size: 1, mtime: 1 }];
    return [
      { path: '/a.jsonl', size: 1, mtime: 1 },
      { path: '/new.jsonl', size: 9, mtime: 9 }
    ];
  };
  const spawnImpl = () => ({ status: 0, stdout: 'done', stderr: '' });
  const result = spawnClaudeCode({ prompt: 'go', cwd: '/tmp', listFiles, spawnImpl });
  assert.equal(result.session_file_path, '/new.jsonl');
  assert.equal(result.exit_code, 0);
  assert.equal(result.before_file_count, 1);
  assert.equal(result.after_file_count, 2);
});

test('spawnCodex passes exec + --cd + --model to codex', () => {
  let captured;
  const spawnImpl = (binary, args, opts) => {
    captured = { binary, args, opts };
    return { status: 0, stdout: '', stderr: '' };
  };
  spawnCodex({
    prompt: 'do the thing',
    cwd: '/tmp/box',
    model: 'gpt-5-codex',
    listFiles: () => [],
    spawnImpl
  });
  assert.equal(captured.binary, 'codex');
  assert.deepEqual(captured.args, ['exec', 'do the thing', '--cd', '/tmp/box', '--model', 'gpt-5-codex']);
});
