import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AgentTraceExplorer } from '../components/run-inbox/AgentTraceExplorer.js';

function traceProps() {
  return {
    initialSessions: [{
      session_id: 'ses_trace_1',
      framework: 'openclaw',
      event_count: 5,
      started_at: '2026-05-03T10:00:00.000Z',
      last_event_at: '2026-05-03T10:05:00.000Z',
      quality: {
        outcome_confidence: 0.9,
        reasons: ['verification_passed_after_changes']
      },
      recommendations: [],
      satisfaction: {
        label: 'accepted'
      },
      telemetry: {
        model_call_count: 1,
        command_count: 1,
        verification_count: 1,
        file_change_count: 1,
        total_tokens: 125
      }
    }],
    initialEvents: [
      {
        event_id: 'evt_session',
        event_type: 'session.started',
        timestamp: '2026-05-03T10:00:00.000Z',
        framework: 'openclaw',
        source: 'hook',
        privacy: { level: 'metadata' },
        payload: {}
      },
      {
        event_id: 'evt_model',
        event_type: 'model.call.ended',
        timestamp: '2026-05-03T10:01:00.000Z',
        framework: 'openclaw',
        source: 'hook',
        privacy: { level: 'metadata' },
        payload: { provider: 'clawvard-token', model: 'MiniMax-M2.7', total_tokens: 125 }
      },
      {
        event_id: 'evt_command',
        event_type: 'command.ended',
        timestamp: '2026-05-03T10:02:00.000Z',
        framework: 'openclaw',
        source: 'hook',
        privacy: { level: 'metadata' },
        payload: { binary: 'npm', exit_code: 0, is_verification: true }
      },
      {
        event_id: 'evt_file',
        event_type: 'file.changed',
        timestamp: '2026-05-03T10:03:00.000Z',
        framework: 'openclaw',
        source: 'filesystem_watcher',
        privacy: { level: 'metadata' },
        payload: { file_extension: 'js', change_kind: 'modified' }
      },
      {
        event_id: 'evt_satisfaction',
        event_type: 'satisfaction.recorded',
        timestamp: '2026-05-03T10:04:00.000Z',
        framework: 'openclaw',
        source: 'manual',
        privacy: { level: 'metadata' },
        payload: { label: 'accepted' }
      }
    ]
  };
}

test('AgentTraceExplorer renders expandable session traces in Chinese by default', () => {
  const html = renderToStaticMarkup(React.createElement(AgentTraceExplorer, {
    ...traceProps()
  }));

  assert.match(html, /Agent 会话追踪/);
  assert.match(html, /追踪视图/);
  assert.match(html, /会话列表/);
  assert.match(html, /节点详情/);
  assert.match(html, /证据时间线/);
  assert.match(html, /Agent 体验观测/);
  assert.match(html, /导出 JSON/);
  assert.match(html, /打开会话/);
  assert.match(html, /action="\/sessions"/);
  assert.match(html, /name="q"/);
  assert.match(html, /data-action="open-notifications"/);
  assert.match(html, /href="\/evaluations"/);
  assert.match(html, /href="\/sessions\?q=ses_trace_1"/);
  assert.match(html, /ses_trace_1/);
  assert.match(html, /生命周期/);
  assert.match(html, /模型/);
  assert.match(html, /命令与工具/);
  assert.match(html, /文件与验证/);
  assert.match(html, /反馈/);
  assert.match(html, /model.call.ended/);
  assert.match(html, /command.ended/);
  assert.match(html, /事件载荷/);
  assert.match(html, /125 tokens/);
  assert.match(html, /模型调用/);
  assert.match(html, /命令/);
});

test('AgentTraceExplorer Span Detail follows the initialSelectedEventId prop', () => {
  const html = renderToStaticMarkup(React.createElement(AgentTraceExplorer, {
    ...traceProps(),
    initialSelectedEventId: 'evt_command'
  }));

  assert.match(html, /data-selected-event-id="evt_command"/);
  assert.match(html, /command\.ended/);
  assert.match(html, /Exit 0/);
});

test('AgentTraceExplorer follows the initialSelectedSessionId prop', () => {
  const props = traceProps();
  props.initialSessions.push({
    session_id: 'ses_trace_2',
    framework: 'codex',
    event_count: 1,
    started_at: '2026-05-04T10:00:00.000Z',
    last_event_at: '2026-05-04T10:01:00.000Z',
    quality: { outcome_confidence: 0.45, reasons: ['needs_review'] },
    recommendations: [],
    satisfaction: { label: 'needs_review' },
    telemetry: { model_call_count: 0, command_count: 0, verification_count: 0, file_change_count: 0 }
  });
  const html = renderToStaticMarkup(React.createElement(AgentTraceExplorer, {
    ...props,
    initialSelectedSessionId: 'ses_trace_2'
  }));

  assert.match(html, /Agent 体验观测.*追踪视图.*ses_trace_2/s);
  assert.match(html, /data-selected-session-id="ses_trace_2"/);
});

test('AgentTraceExplorer Span Detail defaults to the first event when no selection is provided', () => {
  const html = renderToStaticMarkup(React.createElement(AgentTraceExplorer, {
    ...traceProps()
  }));

  assert.match(html, /data-selected-event-id="evt_session"/);
});

test('AgentTraceExplorer can render the English trace shell', () => {
  const html = renderToStaticMarkup(React.createElement(AgentTraceExplorer, {
    ...traceProps(),
    initialLang: 'en'
  }));

  assert.match(html, /Agent Session Traces/);
  assert.match(html, /Trace Explorer/);
  assert.match(html, /Session List/);
  assert.match(html, /Span Detail/);
  assert.match(html, /Evidence timeline/);
  assert.match(html, /Agent Experience Observability/);
  assert.match(html, /Export JSON/);
  assert.match(html, /Open Session/);
  assert.match(html, /Commands &amp; Tools/);
  assert.match(html, /Event payload/);
  assert.doesNotMatch(html, /会话列表/);
});
