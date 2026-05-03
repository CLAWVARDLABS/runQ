import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { RunInboxApp } from '../components/run-inbox/RunInboxApp.js';

test('RunInboxApp renders the Next.js workbench regions and selected run quality', () => {
  const html = renderToStaticMarkup(React.createElement(RunInboxApp, {
    setupHealth: {
      checks: [
        { id: 'claude-code', label: 'Claude Code', status: 'ok', summary: 'Hook configured' },
        { id: 'codex', label: 'Codex', status: 'missing', summary: 'Run init codex' }
      ]
    },
    initialSessions: [{
      session_id: 'ses_next_1',
      framework: 'openclaw',
      event_count: 5,
      last_event_at: '2026-05-03T10:00:00.000Z',
      quality: {
        outcome_confidence: 0.2,
        verification_coverage: 0.4,
        rework_risk: 0.8,
        permission_friction: 0,
        loop_risk: 0.8,
        cost_efficiency: 0.5,
        reasons: ['verification_failed_at_end']
      },
      recommendations: [{
        category: 'verification_strategy',
        title: 'Run targeted verification earlier',
        summary: 'The run ended after failed verification.',
        suggested_action: 'Run focused tests immediately after changing files.',
        evidence_event_ids: ['evt_1']
      }],
      satisfaction: {
        label: 'abandoned',
        signal: 'developer stopped after failed verification'
      }
    }],
    initialEvents: [{
      event_id: 'evt_1',
      event_type: 'command.ended',
      timestamp: '2026-05-03T10:00:00.000Z',
      privacy: {
        level: 'metadata'
      },
      payload: {
        binary: 'pnpm',
        exit_code: 1,
        is_verification: true
      }
    }]
  }));

  assert.match(html, /Run Inbox/);
  assert.match(html, /Setup Health/);
  assert.match(html, /Claude Code/);
  assert.match(html, /Hook configured/);
  assert.match(html, /Search runs/);
  assert.match(html, /Needs review/);
  assert.match(html, /Search events/);
  assert.match(html, /Event type/);
  assert.match(html, /Runs/);
  assert.match(html, /Timeline/);
  assert.match(html, /Quality Inspector/);
  assert.match(html, /Recommendations/);
  assert.match(html, /abandoned/);
  assert.match(html, /Run targeted verification earlier/);
});
