import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { RunInboxApp } from '../components/run-inbox/RunInboxApp.js';

function fixtureProps() {
  return {
    setupHealth: {
      checks: [
        { id: 'node', label: 'Node.js', status: 'ok', summary: 'Node 22.21.1' },
        { id: 'database', label: 'RunQ Database', status: 'ok', summary: 'Writable local database' },
        { id: 'claude-code', agent_id: 'claude_code', label: 'Claude Code', status: 'ok', summary: 'Hook configured' },
        {
          id: 'codex',
          agent_id: 'codex',
          label: 'Codex',
          status: 'missing',
          summary: 'Run init codex',
          remediation: 'node src/cli.js init codex --db .runq/runq.db'
        }
      ]
    },
    dbPath: '.runq/dev.db',
    dataSources: [
      { path: '.runq/dev.db', label: 'dev.db', current: true, session_count: 1 },
      { path: '.runq/openclaw-reporter-check.db', label: 'openclaw-reporter-check.db', current: false, session_count: 3 }
    ],
    initialSessions: [{
      session_id: 'ses_next_1',
      framework: 'openclaw',
      event_count: 5,
      last_event_at: '2026-05-03T10:00:00.000Z',
      quality: {
        outcome_confidence: 0.2,
        trust_score: 20,
        trust_breakdown: {
          evidence_strength: { label: 'Evidence Strength', score: 74, reasons: ['lifecycle_events_present'] },
          verification_strength: { label: 'Verification Strength', score: 40, reasons: ['verification_failed_at_end'] },
          execution_quality: { label: 'Execution Quality', score: 25, reasons: ['verification_failed_at_end'] },
          autonomy_reliability: { label: 'Autonomy Reliability', score: 64, reasons: ['satisfaction_abandoned'] },
          cost_discipline: { label: 'Cost Discipline', score: 50, reasons: ['cost_metadata_observed'] },
          risk_exposure: { label: 'Risk Exposure', score: 80, reasons: ['verification_failed_at_end'] }
        },
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
      },
      telemetry: {
        model_call_count: 1,
        input_tokens: 100,
        output_tokens: 25,
        total_tokens: 125,
        avg_model_duration_ms: 1500,
        command_count: 1,
        verification_count: 1,
        verification_passed_count: 0,
        verification_failed_count: 1,
        file_change_count: 1
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
  };
}

test('RunInboxApp renders the agent-first Agents page without dumping every module', () => {
  const html = renderToStaticMarkup(React.createElement(RunInboxApp, {
    ...fixtureProps(),
    activeView: 'agents'
  }));

  assert.match(html, /Agent 总览/);
  assert.match(html, /Agent 队列/);
  assert.match(html, /data-logo="runq"/);
  assert.match(html, /OpenClaw/);
  assert.match(html, /Claude Code/);
  assert.match(html, /data-logo="openclaw"/);
  assert.match(html, /data-logo="claude"/);
  assert.doesNotMatch(html, /Codex 命令行编码代理/);
  assert.match(html, /English/);
  assert.match(html, /RunQ Console/);
  assert.match(html, /data-auto-refresh-sessions-ms="10000"/);
  assert.match(html, /data-auto-refresh-events-ms="3000"/);
  assert.doesNotMatch(html, /RunQ Console<\/h1><nav class="flex gap-6"/);
  assert.match(html, /action="\/sessions"/);
  assert.match(html, /name="q"/);
  assert.match(html, /name="db"/);
  assert.match(html, /dev\.db · 1/);
  assert.match(html, /openclaw-reporter-check\.db · 3/);
  assert.match(html, /title="提醒 1"/);
  assert.match(html, /data-action="open-notifications"/);
  assert.match(html, /href="\/sessions"[^>]*>\s*<span[^>]*data-icon="tune"/);
  assert.match(html, /href="\/agents\/openclaw\/sessions"/);
  assert.match(html, /href="\/agents\/openclaw\/evaluations"/);
  assert.match(html, /href="\/agents\/openclaw\/recommendations"/);
  assert.match(html, /data-action="open-agent-setup-wizard"/);
  assert.match(html, /data-agent-id="openclaw"/);
  assert.match(html, /Agent/);
  assert.match(html, /运行/);
  assert.match(html, /追踪/);
  assert.match(html, /评估/);
  assert.match(html, /建议/);
  assert.match(html, /接入/);
  assert.doesNotMatch(html, /Product Modules/);
  assert.doesNotMatch(html, /运行收件箱/);
  assert.doesNotMatch(html, /接入健康度/);
  assert.doesNotMatch(html, /质量检查器/);
});

test('RunInboxApp explains an empty selected data source and offers populated alternatives', () => {
  const props = fixtureProps();
  props.initialSessions = [];
  props.initialEvents = [];
  props.dbPath = '.runq/runq.db';
  props.dataSources = [
    { path: '.runq/runq.db', label: 'runq.db', current: true, session_count: 0 },
    { path: '.runq/openclaw-reporter-check.db', label: 'openclaw-reporter-check.db', current: false, session_count: 3 }
  ];
  const html = renderToStaticMarkup(React.createElement(RunInboxApp, {
    ...props,
    activeView: 'agents'
  }));

  assert.match(html, /当前数据库没有运行数据/);
  assert.match(html, /\.runq\/runq\.db/);
  assert.match(html, /node src\/cli\.js demo --db \.runq\/runq\.db/);
  assert.match(html, /可用数据源/);
  assert.match(html, /openclaw-reporter-check\.db/);
});

test('RunInboxApp hides missing agents from the fleet until they are connected or have runs', () => {
  const props = fixtureProps();
  props.setupHealth.checks = [
    { id: 'codex', agent_id: 'codex', label: 'Codex', status: 'missing', summary: 'Run init codex' }
  ];
  const html = renderToStaticMarkup(React.createElement(RunInboxApp, {
    ...props,
    activeView: 'agents'
  }));

  assert.match(html, /OpenClaw/);
  assert.doesNotMatch(html, /Codex 命令行编码代理/);
  assert.doesNotMatch(html, /Setup Needed/);
});

test('RunInboxApp explains connected agents that have not captured runs yet', () => {
  const props = fixtureProps();
  props.initialSessions = [];
  props.setupHealth.checks = [
    { id: 'openclaw', agent_id: 'openclaw', label: 'OpenClaw', status: 'ok', summary: 'Native plugin configured' }
  ];
  const html = renderToStaticMarkup(React.createElement(RunInboxApp, {
    ...props,
    activeView: 'agents'
  }));

  assert.match(html, /OpenClaw/);
  assert.match(html, /Connected/);
  assert.match(html, /等待首次运行/);
  assert.doesNotMatch(html, /Confidence<\/span><span[^>]*>0%/);
  assert.doesNotMatch(html, /Failure Rate<\/span><span[^>]*>0\.00%/);
});

test('RunInboxApp renders Sessions as a separate subpage with run quality', () => {
  const html = renderToStaticMarkup(React.createElement(RunInboxApp, {
    ...fixtureProps(),
    activeView: 'sessions'
  }));

  assert.match(html, /Agent 观测详情/);
  assert.match(html, /href="\/agents\/openclaw"/);
  assert.match(html, /href="\/agents\/claude_code"/);
  assert.match(html, /搜索会话/);
  assert.match(html, /能力总览/);
  assert.match(html, /data-agent-capability-overview="true"/);
  assert.match(html, /模型调用/);
  assert.match(html, /文件变更/);
  assert.match(html, /需复核/);
  assert.match(html, /会话历史/);
  assert.match(html, /质量检查器/);
  assert.match(html, /RunQ 信任分/);
  assert.match(html, /Trust Model/);
  assert.match(html, /Evidence Strength/);
  assert.match(html, /Risk Exposure/);
  assert.match(html, /优化建议/);
  assert.match(html, /abandoned/);
  assert.match(html, /Run targeted verification earlier/);
  assert.match(html, /125/);
  assert.doesNotMatch(html, /Agent 队列/);
  assert.doesNotMatch(html, /接入健康度/);
  assert.doesNotMatch(html, /时间线/);
  assert.doesNotMatch(html, /13\.56/);
  assert.doesNotMatch(html, /2026-05-03  ~  2026-05-03/);
});

test('RunInboxApp focuses the requested agent when initialAgentId is provided', () => {
  const props = fixtureProps();
  props.initialSessions.push({
    session_id: 'ses_next_2',
    framework: 'claude_code',
    event_count: 3,
    last_event_at: '2026-05-04T10:00:00.000Z',
    quality: { outcome_confidence: 0.9, verification_coverage: 1, rework_risk: 0.1, permission_friction: 0, loop_risk: 0, cost_efficiency: 0.5, reasons: [] },
    recommendations: [],
    satisfaction: { label: 'accepted' },
    telemetry: { model_call_count: 1, input_tokens: 50, output_tokens: 10, total_tokens: 60, command_count: 0, verification_count: 1, verification_passed_count: 1, verification_failed_count: 0, file_change_count: 0 }
  });

  const html = renderToStaticMarkup(React.createElement(RunInboxApp, {
    ...props,
    activeView: 'sessions',
    initialAgentId: 'claude_code'
  }));

  assert.match(html, /Claude Code/);
  assert.match(html, /ses_next_2/);
  assert.doesNotMatch(html, /ses_next_1/);
});

test('RunInboxApp renders accept/dismiss controls and state on the Recommendations page', () => {
  const props = fixtureProps();
  props.initialSessions[0].recommendations[0].recommendation_id = 'rec_verification_strategy';
  props.initialSessions[0].recommendations[0].state = { status: 'new', decided_at: null, note: null };
  const html = renderToStaticMarkup(React.createElement(RunInboxApp, {
    ...props,
    activeView: 'recommendations'
  }));

  assert.match(html, /Run targeted verification earlier/);
  assert.match(html, /data-action="accept-recommendation"/);
  assert.match(html, /data-action="dismiss-recommendation"/);
  assert.match(html, /data-action="recommendation-note"/);
  assert.match(html, /placeholder="添加处理备注"/);
  assert.match(html, /rec_verification_strategy/);
  assert.match(html, /提醒中心/);
  assert.match(html, /待处理建议/);
  assert.match(html, /查看证据/);
  assert.match(html, /data-action="open-recommendation-evidence"/);
  assert.match(html, /href="\/traces\?session=ses_next_1"/);
});

test('RunInboxApp shows the decided state when a recommendation has been accepted', () => {
  const props = fixtureProps();
  props.initialSessions[0].recommendations[0].recommendation_id = 'rec_verification_strategy';
  props.initialSessions[0].recommendations[0].state = {
    status: 'accepted',
    decided_at: '2026-05-03T11:00:00.000Z',
    note: 'will fix'
  };
  const html = renderToStaticMarkup(React.createElement(RunInboxApp, {
    ...props,
    activeView: 'recommendations',
    initialLang: 'en'
  }));

  assert.match(html, /Accepted/);
  assert.match(html, /will fix/);
});

test('RunInboxApp shows follow-up verification for accepted recommendations', () => {
  const props = fixtureProps();
  props.initialSessions[0].recommendations[0].recommendation_id = 'rec_verification_strategy';
  props.initialSessions[0].recommendations[0].state = {
    status: 'accepted',
    decided_at: '2026-05-03T11:00:00.000Z',
    note: null
  };
  props.initialSessions.push({
    session_id: 'ses_next_followup',
    framework: 'openclaw',
    event_count: 4,
    last_event_at: '2026-05-04T10:00:00.000Z',
    quality: {
      outcome_confidence: 0.92,
      verification_coverage: 1,
      rework_risk: 0.1,
      permission_friction: 0,
      loop_risk: 0,
      cost_efficiency: 0.6,
      reasons: []
    },
    recommendations: [],
    satisfaction: { label: 'accepted' },
    telemetry: {
      model_call_count: 1,
      input_tokens: 40,
      output_tokens: 12,
      total_tokens: 52,
      command_count: 1,
      verification_count: 1,
      verification_passed_count: 1,
      verification_failed_count: 0,
      file_change_count: 1
    }
  });
  const html = renderToStaticMarkup(React.createElement(RunInboxApp, {
    ...props,
    activeView: 'recommendations'
  }));

  assert.match(html, /效果已验证/);
  assert.match(html, /1 次后续运行/);
  assert.match(html, /data-action="verify-recommendation-impact"/);
  assert.match(html, /href="\/sessions\?q=openclaw"/);
});

test('RunInboxApp renders in-product docs for users and developers', () => {
  const html = renderToStaticMarkup(React.createElement(RunInboxApp, {
    ...fixtureProps(),
    activeView: 'docs'
  }));

  assert.match(html, /产品文档/);
  assert.match(html, /用户指南/);
  assert.match(html, /开发者接入/);
  assert.match(html, /npm run dev/);
  assert.match(html, /node src\/cli\.js init all --db \.runq\/runq\.db/);
  assert.match(html, /href="\/docs"/);
});

test('RunInboxApp exposes setup wizard with agent choice, commands, skill handoff, and success state', () => {
  const html = renderToStaticMarkup(React.createElement(RunInboxApp, {
    ...fixtureProps(),
    activeView: 'setup'
  }));

  assert.match(html, /接入 Agent/);
  assert.match(html, /选择 Agent 类型/);
  assert.match(html, /操作步骤/);
  assert.match(html, /接入成功提醒/);
  assert.match(html, /data-action="select-setup-agent"/);
  assert.match(html, /data-agent-id="codex"/);
  assert.match(html, /data-logo="openai"/);
  assert.match(html, /data-logo="hermes"/);
  assert.match(html, /命令行接入/);
  assert.match(html, /Agent 自接入/);
  assert.match(html, /SKILL\.md/);
  assert.match(html, /data-action="open-agent-setup-wizard"/);
  assert.match(html, /data-action="check-agent-connection"/);
  assert.match(html, /data-action="copy-setup-command"/);
  assert.match(html, /data-copy-state="idle"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /接入: node src\/cli\.js init codex --db \.runq\/runq\.db/);
  assert.match(html, />接入</);
  assert.doesNotMatch(html, /修复: node src\/cli\.js init codex/);
  assert.doesNotMatch(html, /Node\.js/);
  assert.doesNotMatch(html, /RunQ Database/);
  assert.match(html, /href="\/docs"/);
  assert.match(html, /title="帮助文档"/);
});

test('RunInboxApp scopes setup checks when initialAgentId is provided', () => {
  const html = renderToStaticMarkup(React.createElement(RunInboxApp, {
    ...fixtureProps(),
    activeView: 'setup',
    initialAgentId: 'codex'
  }));

  assert.match(html, /Codex/);
  assert.match(html, /node src\/cli\.js init codex --db \.runq\/runq\.db/);
  assert.doesNotMatch(html, /Claude Code/);
  assert.doesNotMatch(html, /Hook configured/);
});

test('RunInboxApp renders an evaluation review queue with trace links', () => {
  const props = fixtureProps();
  const html = renderToStaticMarkup(React.createElement(RunInboxApp, {
    ...props,
    activeView: 'evaluations'
  }));

  assert.match(html, /评估队列/);
  assert.match(html, /需复核/);
  assert.match(html, /data-action="open-evaluation-trace"/);
  assert.match(html, /href="\/traces\?session=ses_next_1"/);
});

test('RunInboxApp scopes recommendations when initialAgentId is provided', () => {
  const props = fixtureProps();
  props.initialSessions[0].recommendations[0].recommendation_id = 'rec_openclaw';
  props.initialSessions.push({
    session_id: 'ses_codex_1',
    framework: 'codex',
    event_count: 2,
    last_event_at: '2026-05-04T10:00:00.000Z',
    quality: { outcome_confidence: 0.3, verification_coverage: 0, rework_risk: 0.6, permission_friction: 0, loop_risk: 0, cost_efficiency: 0.5, reasons: ['needs_review'] },
    recommendations: [{
      recommendation_id: 'rec_codex_only',
      category: 'repo_instruction',
      title: 'Codex-only recommendation',
      summary: 'Only Codex should show this.',
      suggested_action: 'Document Codex verification.',
      evidence_event_ids: []
    }],
    satisfaction: { label: 'needs_review' },
    telemetry: { model_call_count: 0, input_tokens: 0, output_tokens: 0, total_tokens: 0, command_count: 0, verification_count: 0, verification_passed_count: 0, verification_failed_count: 0, file_change_count: 1 }
  });
  const html = renderToStaticMarkup(React.createElement(RunInboxApp, {
    ...props,
    activeView: 'recommendations',
    initialAgentId: 'openclaw'
  }));

  assert.match(html, /Run targeted verification earlier/);
  assert.doesNotMatch(html, /Codex-only recommendation/);
  assert.match(html, /title="提醒 1"/);
  assert.match(html, /href="\/agents\/openclaw\/recommendations\?db=\.runq%2Fdev\.db"/);
});

test('RunInboxApp can render the English product shell', () => {
  const html = renderToStaticMarkup(React.createElement(RunInboxApp, {
    ...fixtureProps(),
    activeView: 'agents',
    initialLang: 'en'
  }));

  assert.match(html, /Agent Fleet/);
  assert.match(html, /Product Modules/);
  assert.match(html, /Agents/);
  assert.match(html, /Sessions/);
  assert.match(html, /Traces/);
  assert.match(html, /Evaluations/);
  assert.match(html, /Recommendations/);
  assert.match(html, /Setup/);
  assert.match(html, /中文/);
  assert.doesNotMatch(html, /产品模块/);
});
