import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { runReplay } from '../src/replay.js';
import { RunqStore } from '../src/store.js';

function tempDb() {
  return join(mkdtempSync(join(tmpdir(), 'runq-replay-')), 'runq.db');
}

function event(eventId, sessionId, eventType, timestamp, payload = {}, framework = 'claude_code') {
  return {
    runq_version: '0.1.0',
    schema_version: '0.1.0',
    event_id: eventId,
    event_type: eventType,
    timestamp,
    session_id: sessionId,
    run_id: sessionId,
    framework,
    source: 'hook',
    privacy: { level: 'metadata', redacted: false },
    payload
  };
}

function seedReplayableSession(dbPath, { framework = 'claude_code', cwd = '/tmp/orig', prompt = 'fix the bug' } = {}) {
  const sessionId = 'ses_orig_' + Math.random().toString(36).slice(2, 8);
  const store = new RunqStore(dbPath);
  store.appendEvent(event(`${sessionId}_s`, sessionId, 'session.started', '2026-05-10T10:00:00.000Z',
    { agent_name: framework, workspace_dir: cwd }, framework));
  store.appendEvent(event(`${sessionId}_p`, sessionId, 'user.prompt.submitted', '2026-05-10T10:00:10.000Z',
    { prompt, prompt_summary: prompt, prompt_length: prompt.length, prompt_hash: 'sha256:abc' }, framework));
  store.appendEvent(event(`${sessionId}_m`, sessionId, 'model.call.ended', '2026-05-10T10:00:20.000Z',
    { provider: 'anthropic', model: 'claude-opus-4-7' }, framework));
  store.appendEvent(event(`${sessionId}_e`, sessionId, 'session.ended', '2026-05-10T10:01:00.000Z',
    { agent_name: framework }, framework));
  store.close();
  return sessionId;
}

function makeFakeTranscript(homeDir, framework, newSessionId, originalCwd) {
  if (framework === 'claude_code') {
    const projectDir = join(homeDir, '.claude', 'projects', '-replay-fake-cwd');
    mkdirSync(projectDir, { recursive: true });
    const path = join(projectDir, `${newSessionId}.jsonl`);
    const rows = [
      { sessionId: newSessionId, cwd: originalCwd, timestamp: '2026-05-15T10:00:00.000Z', uuid: 'r1', type: 'user', message: { role: 'user', content: 'fix the bug' } },
      { sessionId: newSessionId, timestamp: '2026-05-15T10:00:05.000Z', message: { id: 'msg_r', role: 'assistant', model: 'claude-sonnet-4-6', content: [], usage: { input_tokens: 50, output_tokens: 12 } } }
    ];
    writeFileSync(path, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
    return path;
  }
  throw new Error(`fake transcript not implemented for ${framework}`);
}

test('runReplay fails fast when the session is not in the DB', async () => {
  const db = tempDb();
  const store = new RunqStore(db);
  store.close();
  await assert.rejects(
    () => runReplay('ses_nope', { dbPath: db, spawnImpl: () => ({ status: 0 }) }),
    /session ses_nope not found/
  );
});

test('runReplay rejects a non-replayable framework', async () => {
  const db = tempDb();
  const sessionId = seedReplayableSession(db, { framework: 'openclaw' });
  await assert.rejects(
    () => runReplay(sessionId, { dbPath: db, spawnImpl: () => ({ status: 0 }) }),
    /not replayable/
  );
});

test('runReplay rejects sessions with no first prompt', async () => {
  const db = tempDb();
  const sessionId = 'ses_no_prompt';
  const store = new RunqStore(db);
  store.appendEvent(event(`${sessionId}_s`, sessionId, 'session.started', '2026-05-10T10:00:00.000Z'));
  store.appendEvent(event(`${sessionId}_e`, sessionId, 'session.ended', '2026-05-10T10:01:00.000Z'));
  store.close();
  await assert.rejects(
    () => runReplay(sessionId, { dbPath: db, spawnImpl: () => ({ status: 0 }) }),
    /no user.prompt.submitted/
  );
});

test('runReplay (inplace) calls the claude spawn with the original prompt + sandbox=false', async () => {
  const db = tempDb();
  const cwd = mkdtempSync(join(tmpdir(), 'runq-replay-orig-'));
  const sessionId = seedReplayableSession(db, { cwd });
  const newSessionId = 'ses_replayed_abc';

  let captured;
  const fakeSpawnClaude = (args) => {
    captured = args;
    const transcriptPath = makeFakeTranscript(process.env.HOME, 'claude_code', newSessionId, cwd);
    return {
      binary: 'claude',
      args: ['-p', args.prompt],
      cwd: args.cwd,
      exit_code: 0,
      duration_ms: 1234,
      stdout_len: 10,
      stderr_len: 0,
      stderr_tail: '',
      session_file_path: transcriptPath,
      before_file_count: 0,
      after_file_count: 1
    };
  };

  const result = await runReplay(sessionId, {
    dbPath: db,
    inplace: true,
    spawnClaude: fakeSpawnClaude,
    spawnImpl: () => ({ status: 0 })
  });

  assert.equal(result.original_session_id, sessionId);
  assert.equal(result.new_session_id, newSessionId);
  assert.equal(result.sandbox, false, 'inplace should not allocate a sandbox dir');
  assert.equal(captured.prompt, 'fix the bug');
  assert.equal(captured.cwd, cwd);
  assert.ok(result.compare_url.includes(sessionId));
  assert.ok(result.compare_url.includes(newSessionId));
});

test('runReplay (sandbox default) git-clones an existing repo into a tmp dir', async () => {
  const db = tempDb();
  // Build a tiny "git repo" so the existsSync(.git) check passes.
  const cwd = mkdtempSync(join(tmpdir(), 'runq-replay-gitrepo-'));
  mkdirSync(join(cwd, '.git'), { recursive: true });
  writeFileSync(join(cwd, 'README.md'), '# hi\n');
  const sessionId = seedReplayableSession(db, { cwd });
  const newSessionId = 'ses_replayed_def';

  let gitArgs = null;
  const fakeSpawnImpl = (binary, args, opts) => {
    if (binary === 'git') {
      gitArgs = { binary, args, opts };
      // Pretend the clone succeeded by writing a file into the target.
      const target = args[args.length - 1];
      mkdirSync(target, { recursive: true });
      writeFileSync(join(target, 'README.md'), '# cloned\n');
      return { status: 0, stdout: '', stderr: '' };
    }
    return { status: 0 };
  };
  const fakeSpawnClaude = (args) => {
    const transcriptPath = makeFakeTranscript(process.env.HOME, 'claude_code', newSessionId, args.cwd);
    return {
      binary: 'claude', args: [], cwd: args.cwd,
      exit_code: 0, duration_ms: 1, stdout_len: 0, stderr_len: 0,
      session_file_path: transcriptPath, before_file_count: 0, after_file_count: 1
    };
  };

  const result = await runReplay(sessionId, {
    dbPath: db,
    inplace: false,
    spawnClaude: fakeSpawnClaude,
    spawnImpl: fakeSpawnImpl
  });

  assert.ok(gitArgs, 'expected a git clone to fire');
  assert.equal(gitArgs.args[0], 'clone');
  assert.equal(gitArgs.args[1], '--depth');
  assert.equal(gitArgs.args[3], cwd);
  assert.equal(result.sandbox, true);
  assert.notEqual(result.sandbox_cwd, cwd);
});

test('runReplay tags the new session.started with replayed_from + replay_overrides', async () => {
  const db = tempDb();
  const cwd = mkdtempSync(join(tmpdir(), 'runq-replay-tagcheck-'));
  const sessionId = seedReplayableSession(db, { cwd });
  const newSessionId = 'ses_replayed_tag_ghi';
  const fakeSpawnClaude = (args) => ({
    binary: 'claude', args: [], cwd: args.cwd,
    exit_code: 0, duration_ms: 1, stdout_len: 0, stderr_len: 0,
    session_file_path: makeFakeTranscript(process.env.HOME, 'claude_code', newSessionId, args.cwd),
    before_file_count: 0, after_file_count: 1
  });

  await runReplay(sessionId, {
    dbPath: db, inplace: true, model: 'claude-sonnet-4-6',
    spawnClaude: fakeSpawnClaude, spawnImpl: () => ({ status: 0 })
  });

  const store = new RunqStore(db);
  const events = store.listEventsForSession(newSessionId);
  store.close();
  const started = events.find((e) => e.event_type === 'session.started');
  assert.ok(started, 'imported session.started event exists');
  assert.equal(started.payload.replayed_from, sessionId);
  assert.equal(started.payload.replay_overrides.model, 'claude-sonnet-4-6');
  assert.equal(started.payload.replay_overrides.inplace, true);
});

test('runReplay surfaces an actionable error when the agent exits non-zero', async () => {
  const db = tempDb();
  const cwd = mkdtempSync(join(tmpdir(), 'runq-replay-fail-'));
  const sessionId = seedReplayableSession(db, { cwd });
  const fakeSpawnClaude = () => ({
    binary: 'claude', args: [], cwd, exit_code: 7, duration_ms: 1,
    stdout_len: 0, stderr_len: 30, stderr_tail: 'auth failed: please run claude login',
    session_file_path: null, before_file_count: 0, after_file_count: 0
  });
  await assert.rejects(
    () => runReplay(sessionId, {
      dbPath: db, inplace: true,
      spawnClaude: fakeSpawnClaude, spawnImpl: () => ({ status: 0 })
    }),
    /agent exited with status 7/
  );
});

test('runReplay emits ordered onProgress lifecycle phases', async () => {
  const db = tempDb();
  const cwd = mkdtempSync(join(tmpdir(), 'runq-replay-progress-'));
  const sessionId = seedReplayableSession(db, { cwd });
  const newSessionId = 'ses_replayed_progress_jkl';
  const fakeSpawnClaude = (args) => ({
    binary: 'claude', args: [], cwd: args.cwd,
    exit_code: 0, duration_ms: 1, stdout_len: 0, stderr_len: 0,
    session_file_path: makeFakeTranscript(process.env.HOME, 'claude_code', newSessionId, args.cwd),
    before_file_count: 0, after_file_count: 1
  });
  const phases = [];
  await runReplay(sessionId, {
    dbPath: db, inplace: true,
    spawnClaude: fakeSpawnClaude, spawnImpl: () => ({ status: 0 }),
    onProgress: (event) => phases.push(event.phase)
  });
  for (const expected of ['starting', 'loaded', 'sandbox-ready', 'spawning', 'spawn-finished', 'importing', 'done']) {
    assert.ok(phases.includes(expected), `expected progress phase "${expected}" but got ${phases.join(',')}`);
  }
  assert.equal(phases.at(-1), 'done');
});
