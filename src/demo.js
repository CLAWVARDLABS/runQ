import { RunqStore } from './store.js';

function event(sessionId, runId, framework, eventId, eventType, timestamp, payload = {}) {
  return {
    runq_version: '0.2.0',
    event_id: eventId,
    schema_version: '0.2.0',
    event_type: eventType,
    timestamp,
    session_id: sessionId,
    run_id: runId,
    framework,
    source: 'manual',
    privacy: { level: 'metadata', redacted: true },
    payload
  };
}

export function demoEvents() {
  return [
    event('demo-openclaw-needs-review', 'run-demo-openclaw-needs-review', 'openclaw', 'evt_demo_openclaw_start', 'session.started', '2026-05-05T09:00:00.000Z', {
      agent_name: 'OpenClaw',
      task_summary: 'Implement a small checkout validation change'
    }),
    event('demo-openclaw-needs-review', 'run-demo-openclaw-needs-review', 'openclaw', 'evt_demo_openclaw_model', 'model.call.ended', '2026-05-05T09:01:00.000Z', {
      input_tokens: 820,
      output_tokens: 210,
      total_tokens: 1030,
      duration_ms: 4200
    }),
    event('demo-openclaw-needs-review', 'run-demo-openclaw-needs-review', 'openclaw', 'evt_demo_openclaw_file', 'file.changed', '2026-05-05T09:02:00.000Z', {
      file_extension: 'js',
      change_kind: 'modified',
      lines_added: 18,
      lines_removed: 6
    }),
    event('demo-openclaw-needs-review', 'run-demo-openclaw-needs-review', 'openclaw', 'evt_demo_openclaw_test_failed', 'command.ended', '2026-05-05T09:03:00.000Z', {
      binary: 'npm',
      args_hash: 'sha256:demo-test',
      exit_code: 1,
      duration_ms: 3100,
      is_verification: true
    }),
    event('demo-openclaw-needs-review', 'run-demo-openclaw-needs-review', 'openclaw', 'evt_demo_openclaw_end', 'session.ended', '2026-05-05T09:04:00.000Z', {
      ended_reason: 'verification_failed'
    }),
    event('demo-openclaw-needs-review', 'run-demo-openclaw-needs-review', 'openclaw', 'evt_demo_openclaw_satisfaction', 'satisfaction.recorded', '2026-05-05T09:05:00.000Z', {
      label: 'abandoned',
      signal: 'developer stopped after failed verification'
    }),
    event('demo-openclaw-needs-review', 'run-demo-openclaw-needs-review', 'openclaw', 'evt_demo_openclaw_accept_rec', 'recommendation.accepted', '2026-05-05T09:06:00.000Z', {
      recommendation_id: 'rec_verification_strategy',
      note: 'Add a targeted verification step before ending future runs.'
    }),

    event('demo-openclaw-followup', 'run-demo-openclaw-followup', 'openclaw', 'evt_demo_followup_start', 'session.started', '2026-05-05T10:00:00.000Z', {
      agent_name: 'OpenClaw',
      task_summary: 'Rerun checkout validation with targeted verification'
    }),
    event('demo-openclaw-followup', 'run-demo-openclaw-followup', 'openclaw', 'evt_demo_followup_file', 'file.changed', '2026-05-05T10:01:00.000Z', {
      file_extension: 'js',
      change_kind: 'modified',
      lines_added: 7,
      lines_removed: 2
    }),
    event('demo-openclaw-followup', 'run-demo-openclaw-followup', 'openclaw', 'evt_demo_followup_test_passed', 'command.ended', '2026-05-05T10:02:00.000Z', {
      binary: 'npm',
      args_hash: 'sha256:demo-test',
      exit_code: 0,
      duration_ms: 2800,
      is_verification: true
    }),
    event('demo-openclaw-followup', 'run-demo-openclaw-followup', 'openclaw', 'evt_demo_followup_satisfaction', 'satisfaction.recorded', '2026-05-05T10:03:00.000Z', {
      label: 'accepted',
      signal: 'follow-up run passed targeted verification'
    }),
    event('demo-openclaw-followup', 'run-demo-openclaw-followup', 'openclaw', 'evt_demo_followup_end', 'session.ended', '2026-05-05T10:04:00.000Z', {
      ended_reason: 'completed'
    }),

    event('demo-codex-success', 'run-demo-codex-success', 'codex', 'evt_demo_codex_start', 'session.started', '2026-05-05T11:00:00.000Z', {
      agent_name: 'Codex',
      task_summary: 'Refactor a small scoring helper'
    }),
    event('demo-codex-success', 'run-demo-codex-success', 'codex', 'evt_demo_codex_model', 'model.call.ended', '2026-05-05T11:01:00.000Z', {
      input_tokens: 640,
      output_tokens: 160,
      total_tokens: 800,
      duration_ms: 3600
    }),
    event('demo-codex-success', 'run-demo-codex-success', 'codex', 'evt_demo_codex_file', 'file.changed', '2026-05-05T11:02:00.000Z', {
      file_extension: 'js',
      change_kind: 'modified',
      lines_added: 9,
      lines_removed: 9
    }),
    event('demo-codex-success', 'run-demo-codex-success', 'codex', 'evt_demo_codex_test', 'command.ended', '2026-05-05T11:03:00.000Z', {
      binary: 'npm',
      args_hash: 'sha256:demo-unit-test',
      exit_code: 0,
      duration_ms: 1900,
      is_verification: true
    }),
    event('demo-codex-success', 'run-demo-codex-success', 'codex', 'evt_demo_codex_satisfaction', 'satisfaction.recorded', '2026-05-05T11:04:00.000Z', {
      label: 'accepted',
      signal: 'developer accepted the refactor'
    }),
    event('demo-codex-success', 'run-demo-codex-success', 'codex', 'evt_demo_codex_end', 'session.ended', '2026-05-05T11:05:00.000Z', {
      ended_reason: 'completed'
    }),

    event('demo-claude-setup-gap', 'run-demo-claude-setup-gap', 'claude_code', 'evt_demo_claude_start', 'session.started', '2026-05-05T12:00:00.000Z', {
      agent_name: 'Claude Code',
      task_summary: 'Update docs without running verification'
    }),
    event('demo-claude-setup-gap', 'run-demo-claude-setup-gap', 'claude_code', 'evt_demo_claude_file', 'file.changed', '2026-05-05T12:01:00.000Z', {
      file_extension: 'md',
      change_kind: 'modified',
      lines_added: 24,
      lines_removed: 3
    }),
    event('demo-claude-setup-gap', 'run-demo-claude-setup-gap', 'claude_code', 'evt_demo_claude_satisfaction', 'satisfaction.recorded', '2026-05-05T12:02:00.000Z', {
      label: 'needs_review',
      signal: 'documentation changed without verification'
    }),
    event('demo-claude-setup-gap', 'run-demo-claude-setup-gap', 'claude_code', 'evt_demo_claude_end', 'session.ended', '2026-05-05T12:03:00.000Z', {
      ended_reason: 'needs_review'
    })
  ];
}

export function createDemoDatabase(dbPath) {
  const store = new RunqStore(dbPath);
  const events = demoEvents();
  try {
    for (const item of events) {
      store.appendEvent(item);
    }
  } finally {
    store.close();
  }
  return {
    dbPath,
    event_count: events.length,
    session_ids: [...new Set(events.map((item) => item.session_id))]
  };
}
