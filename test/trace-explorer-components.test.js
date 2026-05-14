import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AgentTraceExplorer } from '../components/run-inbox/AgentTraceExplorer.js';

function traceProps() {
  return {
    initialSelectedSessionId: 'ses_trace_1',
    initialSessions: [{
      session_id: 'ses_trace_1',
      framework: 'openclaw',
      event_count: 9,
      started_at: '2026-05-03T10:00:00.000Z',
      last_event_at: '2026-05-03T10:05:00.000Z',
      quality: {
        outcome_confidence: 0.9,
        trust_score: 90,
        trust_breakdown: {
          evidence_strength: { label: 'Evidence Strength', score: 100, reasons: ['verification_evidence'] },
          verification_strength: { label: 'Verification Strength', score: 100, reasons: ['verification_passed'] },
          execution_quality: { label: 'Execution Quality', score: 93, reasons: ['commands_observed'] },
          autonomy_reliability: { label: 'Autonomy Reliability', score: 91, reasons: ['satisfaction_accepted'] },
          cost_discipline: { label: 'Cost Discipline', score: 50, reasons: ['cost_metadata_observed'] },
          risk_exposure: { label: 'Risk Exposure', score: 10, reasons: ['low_observed_risk'] }
        },
        reasons: ['verification_passed_after_changes']
      },
      recommendations: [],
      satisfaction: {
        label: 'accepted'
      },
      telemetry: {
        model_call_count: 1,
        tool_call_count: 3,
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
        event_id: 'evt_prompt',
        event_type: 'user.prompt.submitted',
        timestamp: '2026-05-03T10:00:10.000Z',
        framework: 'openclaw',
        source: 'hook',
        privacy: { level: 'summary' },
        payload: {
          prompt_summary: 'Reply with exactly: RunQ real OpenClaw smoke test passed.',
          prompt_length: 57
        }
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
        event_id: 'evt_tool',
        event_type: 'tool.call.ended',
        timestamp: '2026-05-03T10:01:30.000Z',
        framework: 'openclaw',
        source: 'hook',
        privacy: { level: 'metadata' },
        payload: { tool_name: 'web_search', tool_type: 'browser_or_search', tool_call_id: 'tool-1', status: 'ok', duration_ms: 1200, input_key_count: 1, output_key_count: 3 }
      },
      {
        event_id: 'evt_mcp',
        event_type: 'tool.call.ended',
        timestamp: '2026-05-03T10:01:40.000Z',
        framework: 'openclaw',
        source: 'mcp',
        privacy: { level: 'metadata' },
        payload: { tool_name: 'notion_search', tool_type: 'mcp_tool', mcp_server: 'notion', tool_call_id: 'mcp-1', status: 'ok', duration_ms: 800, input_key_count: 2, output_key_count: 1 }
      },
      {
        event_id: 'evt_skill',
        event_type: 'tool.call.ended',
        timestamp: '2026-05-03T10:01:50.000Z',
        framework: 'openclaw',
        source: 'hook',
        privacy: { level: 'metadata' },
        payload: { tool_name: 'skill.run', tool_type: 'skill', skill_name: 'clawvard-asvp', tool_call_id: 'skill-1', status: 'ok', duration_ms: 500, input_key_count: 1, output_key_count: 1 }
      },
      {
        event_id: 'evt_command',
        event_type: 'command.ended',
        timestamp: '2026-05-03T10:02:00.000Z',
        framework: 'openclaw',
        source: 'hook',
        privacy: { level: 'metadata' },
        payload: { binary: 'npm', exit_code: 0, is_verification: true, verification_kind: 'test' }
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
      },
      {
        event_id: 'evt_session_end',
        event_type: 'session.ended',
        timestamp: '2026-05-03T10:05:00.000Z',
        framework: 'openclaw',
        source: 'hook',
        privacy: { level: 'metadata' },
        payload: { ended_reason: 'agent_end' }
      }
    ]
  };
}

test('AgentTraceExplorer renders expandable session traces in Chinese by default', () => {
  const html = renderToStaticMarkup(React.createElement(AgentTraceExplorer, {
    ...traceProps()
  }));

  assert.match(html, /Agent 会话追踪/);
  assert.doesNotMatch(html, /主页.*追踪视图.*ses_trace_1/s);
  assert.match(html, /data-picker-bar="agent-session"/);
  assert.match(html, /data-agent-combobox="combobox"/);
  assert.match(html, /data-session-combobox="combobox"/);
  assert.match(html, /data-picker-summary="true"/);
  assert.match(html, /data-trace-area="mounted"/);
  assert.match(html, /会话纵览/);
  assert.match(html, /运行复盘/);
  assert.match(html, /RunQ 信任分/);
  assert.match(html, /Trust Model/);
  assert.match(html, /Evidence Strength/);
  assert.match(html, /Verification Strength/);
  assert.match(html, /Risk Exposure/);
  assert.match(html, /调用足迹/);
  assert.match(html, /web_search · notion_search · clawvard-asvp/);
  assert.match(html, /任务列表/);
  assert.match(html, /任务复盘/);
  assert.match(html, /关键路径/);
  assert.match(html, /节点详情/);
  assert.match(html, /证据时间线/);
  assert.match(html, /任务流程图/);
  assert.match(html, /拖动画布查看完整流程，点击节点查看右侧详情。/);
  assert.match(html, /data-session-overview="selected-session"/);
  assert.match(html, /data-run-summary="trace-run-summary"/);
  assert.match(html, /data-task-list="session-tasks"/);
  assert.match(html, /data-task-recap="trace-summary"/);
  assert.match(html, /data-redaction-note="metadata-first"/);
  assert.match(html, /data-selected-task-id="task_1"/);
  assert.match(html, /data-task-workflow="react-flow"/);
  assert.match(html, /data-workflow-viewport="content-first"/);
  assert.match(html, /data-workflow-node-size="readable"/);
  assert.match(html, /data-workflow-canvas-height="compact"/);
  assert.match(html, /data-workflow-interaction="pan-drag-click"/);
  assert.match(html, /data-click-opens-detail="true"/);
  assert.match(html, /data-action-flow="agent-task-flow"/);
  assert.match(html, /data-flow-layout="timeline-graph"/);
  assert.match(html, /data-flow-edge-from="evt_prompt" data-flow-edge-to="evt_model"/);
  assert.match(html, /data-flow-edge-from="evt_model" data-flow-edge-to="evt_tool"/);
  assert.match(html, /data-flow-edge-from="evt_model" data-flow-edge-to="evt_mcp"/);
  assert.match(html, /data-flow-edge-from="evt_model" data-flow-edge-to="evt_skill"/);
  assert.match(html, /data-flow-edge-from="evt_skill" data-flow-edge-to="evt_command"/);
  assert.doesNotMatch(html, /data-flow-overview="capability-overview"/);
  assert.match(html, /Agent 体验观测/);
  assert.match(html, /导出 JSON/);
  assert.match(html, /action="\/sessions"/);
  assert.match(html, /name="q"/);
  assert.match(html, /data-action="open-notifications"/);
  assert.match(html, /href="\/evaluations"/);
  assert.match(html, /ses_trace_1/);
  assert.match(html, /data-evidence-list="event-tree"/);
  assert.match(html, /data-event-tree="true"/);
  assert.match(html, /data-event-tree-node="true" data-event-id="evt_session" data-parent-id="" data-event-depth="0"/);
  assert.match(html, /data-event-tree-node="true" data-event-id="evt_prompt" data-parent-id="evt_session" data-event-depth="1"/);
  assert.match(html, /data-event-tree-node="true" data-event-id="evt_model" data-parent-id="evt_prompt" data-event-depth="2"/);
  assert.match(html, /data-event-tree-node="true" data-event-id="evt_tool" data-parent-id="evt_model" data-event-depth="3"/);
  assert.match(html, /data-event-tree-node="true" data-event-id="evt_file" data-parent-id="evt_skill" data-event-depth="4"/);
  assert.match(html, /data-event-tree-node="true" data-event-id="evt_command" data-parent-id="evt_skill" data-event-depth="4"/);
  assert.match(html, /data-workflow-node-type="trigger"/);
  assert.match(html, /data-workflow-node-type="operation"/);
  assert.match(html, /data-workflow-node-type="success"/);
  assert.match(html, /data-workflow-port="input"/);
  assert.match(html, /data-workflow-port="output"/);
  assert.match(html, /model.call.ended/);
  assert.match(html, /command.ended/);
  assert.match(html, /Test passed: npm/);
  assert.match(html, /test command/);
  assert.match(html, /原始事件是底层采集日志；流程节点是可视化后的任务步骤。/);
  assert.match(html, /tool.call.ended/);
  assert.match(html, /data-flow-action-name="web_search"/);
  assert.match(html, /data-flow-action-phase="ended"/);
  assert.match(html, /data-flow-action-type="browser_or_search"/);
  assert.match(html, /data-flow-action-duration-ms="1200"/);
  assert.match(html, /data-flow-action-name="notion_search"/);
  assert.match(html, /data-flow-action-kind="mcp"/);
  assert.match(html, /data-flow-mcp-server="notion"/);
  assert.match(html, /mcp=notion/);
  assert.match(html, /data-flow-action-name="skill.run"/);
  assert.match(html, /data-flow-action-kind="skill"/);
  assert.match(html, /data-flow-skill-name="clawvard-asvp"/);
  assert.match(html, /skill=clawvard-asvp/);
  assert.match(html, /input 1 keys/);
  assert.match(html, /output 3 keys/);
  assert.match(html, />web_search</);
  assert.doesNotMatch(html, /Tool: web_search/);
  assert.match(html, /tool=web_search/);
  assert.match(html, /事件载荷/);
  assert.match(html, /125 tokens/);
  assert.match(html, /模型调用/);
  assert.match(html, /命令/);
  assert.match(html, /工具/);
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

  assert.match(html, /Agent 体验观测/);
  assert.doesNotMatch(html, /主页.*追踪视图.*ses_trace_2/s);
  assert.match(html, /data-selected-session-id="ses_trace_2"/);
});

test('AgentTraceExplorer Span Detail defaults to the first task event when no selection is provided', () => {
  const html = renderToStaticMarkup(React.createElement(AgentTraceExplorer, {
    ...traceProps()
  }));

  assert.match(html, /data-selected-event-id="evt_prompt"/);
});

test('AgentTraceExplorer labels default trust scores with no scoring evidence as evidence-limited', () => {
  const props = traceProps();
  props.initialSessions = [{
    session_id: 'ses_evidence_limited',
    framework: 'claude_code',
    event_count: 4,
    started_at: '2026-05-04T10:00:00.000Z',
    last_event_at: '2026-05-04T10:02:00.000Z',
    quality: {
      outcome_confidence: 0.55,
      trust_score: 55,
      reasons: []
    },
    recommendations: [],
    satisfaction: null,
    telemetry: {
      model_call_count: 1,
      tool_call_count: 2,
      command_count: 0,
      verification_count: 0,
      file_change_count: 0
    }
  }];
  props.initialEvents = [
    {
      event_id: 'evt_limited_prompt',
      event_type: 'user.prompt.submitted',
      timestamp: '2026-05-04T10:00:00.000Z',
      framework: 'claude_code',
      source: 'import',
      privacy: { level: 'summary' },
      payload: { prompt_length: 20 }
    },
    {
      event_id: 'evt_limited_model',
      event_type: 'model.call.ended',
      timestamp: '2026-05-04T10:01:00.000Z',
      framework: 'claude_code',
      source: 'import',
      privacy: { level: 'metadata' },
      payload: { model: 'claude-sonnet-4-6' }
    },
    {
      event_id: 'evt_limited_tool',
      event_type: 'tool.call.ended',
      timestamp: '2026-05-04T10:01:30.000Z',
      framework: 'claude_code',
      source: 'import',
      privacy: { level: 'metadata' },
      payload: { tool_name: 'Bash', status: 'completed' }
    }
  ];

  const html = renderToStaticMarkup(React.createElement(AgentTraceExplorer, props));

  assert.match(html, /证据不足/);
  assert.match(html, /未归一化到文件变更或验证证据/);
});

test('AgentTraceExplorer can render the English trace shell', () => {
  const html = renderToStaticMarkup(React.createElement(AgentTraceExplorer, {
    ...traceProps(),
    initialLang: 'en'
  }));

  assert.match(html, /Agent Session Traces/);
  assert.doesNotMatch(html, /Home.*Trace Explorer.*ses_trace_1/s);
  assert.match(html, /data-picker-bar="agent-session"/);
  assert.match(html, /data-agent-combobox="combobox"/);
  assert.match(html, /data-session-combobox="combobox"/);
  assert.match(html, /data-trace-area="mounted"/);
  assert.match(html, /Span Detail/);
  assert.match(html, /Evidence timeline/);
  assert.match(html, /Task flow/);
  assert.match(html, /Agent Experience Observability/);
  assert.match(html, /Export JSON/);
  assert.match(html, /data-evidence-list="event-tree"/);
  assert.match(html, /data-event-tree-node="true" data-event-id="evt_model" data-parent-id="evt_prompt" data-event-depth="2"/);
  assert.match(html, /data-event-tree-node="true" data-event-id="evt_tool" data-parent-id="evt_model" data-event-depth="3"/);
  assert.match(html, /Event payload/);
  assert.doesNotMatch(html, /会话列表/);
});
