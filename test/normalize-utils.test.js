import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isVerificationCommand,
  rawFields,
  stripRawFields,
  redactEventForDisplay,
  RAW_CONTENT_KEYS,
  DERIVED_CONTENT_KEYS
} from '../src/normalize-utils.js';

test('isVerificationCommand detects real test and build commands', () => {
  assert.equal(isVerificationCommand('npm test'), true);
  assert.equal(isVerificationCommand('pnpm test -- --runInBand'), true);
  assert.equal(isVerificationCommand('node --test'), true);
  assert.equal(isVerificationCommand('cargo test'), true);
  assert.equal(isVerificationCommand('npm run build'), true);
});

test('isVerificationCommand does not treat search commands for test files as verification', () => {
  assert.equal(isVerificationCommand('find /Users/example -name "*test*"'), false);
  assert.equal(isVerificationCommand('grep -R "test(" src'), false);
});

test('rawFields returns raw values only when privacy mode is off', () => {
  assert.deepEqual(rawFields('off', { prompt: 'hi', command: 'ls' }), { prompt: 'hi', command: 'ls' });
  assert.deepEqual(rawFields('on', { prompt: 'hi' }), {});
  assert.deepEqual(rawFields('off', { prompt: 'hi', missing: undefined }), { prompt: 'hi' });
});

test('stripRawFields drops every raw-content key for display-time redaction', () => {
  const payload = {
    prompt: 'leak the password',
    prompt_length: 17,
    prompt_hash: 'sha256:abc',
    command: 'cat .env',
    cwd: '/repo',
    output: 'DB_PASSWORD=hunter2',
    tool_input: { x: 1 },
    exit_code: 0,
    binary: 'cat'
  };
  const stripped = stripRawFields(payload);
  // raw content gone
  for (const key of ['prompt', 'command', 'cwd', 'output', 'tool_input']) {
    assert.equal(stripped[key], undefined, `${key} should be stripped`);
  }
  // metadata kept
  assert.equal(stripped.prompt_length, 17);
  assert.equal(stripped.prompt_hash, 'sha256:abc');
  assert.equal(stripped.exit_code, 0);
  assert.equal(stripped.binary, 'cat');
  // original object untouched
  assert.equal(payload.prompt, 'leak the password');
});

test('stripRawFields returns the same reference when nothing is raw', () => {
  const payload = { prompt_length: 5, exit_code: 0 };
  assert.equal(stripRawFields(payload), payload);
  assert.equal(stripRawFields(null), null);
});

test('RAW_CONTENT_KEYS covers prompt, command, and tool I/O keys', () => {
  for (const key of ['prompt', 'command', 'cwd', 'stdout', 'stderr', 'output', 'tool_input', 'tool_response', 'params', 'result']) {
    assert.ok(RAW_CONTENT_KEYS.has(key), `RAW_CONTENT_KEYS missing ${key}`);
  }
});

test('stripRawFields keeps derived summary keys (only raw content is stripped)', () => {
  // stripRawFields is intentionally narrow — it does NOT touch prompt_summary etc.
  const payload = { prompt: 'raw', prompt_summary: 'a short summary', prompt_length: 3 };
  const stripped = stripRawFields(payload);
  assert.equal(stripped.prompt, undefined);
  assert.equal(stripped.prompt_summary, 'a short summary');
  assert.equal(stripped.prompt_length, 3);
});

test('redactEventForDisplay strips raw content AND derived human-readable keys', () => {
  const event = {
    event_type: 'user.prompt.submitted',
    privacy: { level: 'summary', redacted: false },
    payload: {
      prompt: 'leak the db password',
      prompt_summary: 'leak the db password',
      prompt_length: 20,
      prompt_hash: 'sha256:abc',
      workspace_dir: '/Users/someone/secret-project',
      git_branch: 'feature/unreleased'
    }
  };
  const redacted = redactEventForDisplay(event);
  // raw + derived gone
  for (const key of ['prompt', 'prompt_summary', 'workspace_dir', 'git_branch']) {
    assert.equal(redacted.payload[key], undefined, `${key} should be redacted`);
  }
  // bounded metadata kept
  assert.equal(redacted.payload.prompt_length, 20);
  assert.equal(redacted.payload.prompt_hash, 'sha256:abc');
  // privacy marked
  assert.equal(redacted.privacy.level, 'metadata');
  assert.equal(redacted.privacy.redacted, true);
  // original untouched
  assert.equal(event.payload.prompt, 'leak the db password');
});

test('redactEventForDisplay returns same reference when there is nothing to redact', () => {
  const event = { event_type: 'command.ended', privacy: { level: 'metadata' }, payload: { exit_code: 0, binary: 'npm' } };
  assert.equal(redactEventForDisplay(event), event);
});

test('DERIVED_CONTENT_KEYS covers summaries, workspace path, branch, and title', () => {
  for (const key of ['prompt_summary', 'assistant_summary', 'task_summary', 'workspace_dir', 'git_branch', 'title']) {
    assert.ok(DERIVED_CONTENT_KEYS.has(key), `DERIVED_CONTENT_KEYS missing ${key}`);
  }
});
