'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Background, Controls, Handle, MarkerType, Position, ReactFlow } from '@xyflow/react';

import { buildAgentActionFlow } from './action-flow.js';
import { percent, summarizeEvent, trustBreakdownEntries, trustScoreValue } from './format.js';

function h(type, props, ...children) {
  const normalizedChildren = children.flatMap((child) =>
    Array.isArray(child) ? React.Children.toArray(child.filter(Boolean)) : [child]
  );
  return React.createElement(type, props, ...normalizedChildren);
}

const traceCopy = {
  zh: {
    productName: 'RunQ',
    productSubtitle: 'Agent 体验观测',
    workspace: 'Local Workspace',
    refresh: '刷新',
    languageToggle: 'English',
    notifications: '提醒',
    searchPlaceholder: '搜索运行 / 事件',
    traceExplorer: '追踪视图',
    title: 'Agent 会话追踪',
    subtitle: '基于真实事件重建模型调用、命令、文件、验证和反馈组成的证据时间线。',
    pickerBarLabel: '上下文选择',
    pickerAgentLabel: 'Agent',
    pickerSessionLabel: '会话',
    pickerAgentPlaceholder: '选择一个 Agent…',
    pickerSessionPlaceholder: '选择一次会话…',
    pickerSessionDisabled: '先选一个 Agent',
    pickerSearchAgents: '搜索 Agent / framework',
    pickerSearchSessions: '搜索会话 ID / 状态',
    pickerSearchAll: '跨 Agent 搜索会话',
    pickerMostRecent: '最新会话',
    pickerNoMatches: '没有匹配项',
    pickerNoAgents: '当前数据库里还没有 Agent 会话',
    pickerJumpHint: '⌘K 全局搜索',
    pickerOpenLatest: '打开最新会话',
    pickerEmptyMain: '选择一个 Agent 和会话来查看追踪',
    pickerEmptyMainSub: '上方两个下拉是串行的：先选 Agent，再选会话。我们会按 framework 把会话归类。',
    agentSessionCount: '会话',
    agentAvgTrust: '平均信任分',
    agentLastActive: '最近活动',
    sessionDuration: '持续',
    sessionEvents: '事件',
    closeDialog: '关闭',
    eyebrow: 'Trace Telemetry',
    sessionList: '会话列表',
    allAgents: '全部 Agent',
    searchSession: '搜索会话',
    noSessions: '没有会话匹配当前过滤条件。',
    selectSession: '选择一个会话查看它的追踪。',
    sessionOverview: '会话纵览',
    runSummary: '运行复盘',
    runSummaryBody: '用 RunQ Trust Model 解释这次运行是否可信、Agent 走了哪些步骤，以及调用了哪些能力。',
    finalConfidence: 'RunQ 信任分',
    evidenceLimited: '证据不足',
    evidenceLimitedBody: 'RunQ 看到了模型或工具活动，但未归一化到文件变更或验证证据。',
    trustModel: 'Trust Model',
    outcomeEvidence: 'Outcome 证据',
    executionPath: '执行路径',
    callFootprint: '调用足迹',
    noToolFootprint: '没有工具、MCP 或 Skill 调用',
    verificationSummary: '验证结果',
    taskList: '任务列表',
    taskFallbackTitle: '会话任务',
    taskPrompt: '用户需求',
    evidenceTimeline: '证据时间线',
    groupedTraceEvents: '分组追踪事件',
    taskFlow: '任务流程图',
    taskFlowBody: '从用户需求到 Agent 调用模型、工具、命令、文件和反馈的整体过程。',
    taskRecap: '任务复盘',
    taskRequest: '用户需求',
    taskPath: '关键路径',
    taskResult: '结果',
    workflowHint: '拖动画布查看完整流程，点击节点查看右侧详情。',
    eventActionHelp: '原始事件是底层采集日志；流程节点是可视化后的任务步骤。',
    redactionNote: '内容已按 metadata-first 隐私策略隐藏，只保留摘要、计数或哈希。',
    actionCount: '流程节点',
    flowTruncatedPrefix: '仅渲染前 ',
    rawEvents: '原始事件',
    tools: '工具',
    flowLaneModel: '模型层',
    flowLaneTool: '普通工具',
    flowLaneMcp: 'MCP',
    flowLaneSkill: 'Skills',
    flowLaneCommand: '命令',
    flowLaneVerification: '验证',
    flowLaneFile: '文件',
    flowLaneOutcome: '结果',
    flowLaneOther: '其他',
    sessionInspector: '节点详情',
    noSessionSelected: '未选择会话',
    framework: '框架',
    modelCalls: '模型调用',
    commands: '命令',
    verification: '验证',
    failed: '失败',
    tokens: 'tokens',
    totalTokens: '总 Tokens',
    outcomeConfidence: 'Outcome 证据',
    satisfaction: '满意度',
    keyMetrics: '关键指标',
    scoring: 'RunQ Trust Model',
    metadata: '元数据',
    eventPayload: '事件载荷',
    sourceUnknown: '未知来源',
    lifecycle: '生命周期',
    model: '模型',
    commandsTools: '命令与工具',
    filesVerification: '文件与验证',
    feedback: '反馈',
    other: '其他',
    events: '事件',
    exportJson: '导出 JSON',
    openSession: '打开会话',
    privacyMode: '隐私模式',
    eventCount: '事件数',
    lastSeen: '最后活动',
    noSignal: '未记录',
    selectedEvent: '选中事件',
    eventTimestamp: '时间戳',
    eventSource: '来源',
    noEventSelected: '未选择事件',
    home: '主页',
    rerun: '重新运行',
    completed: 'COMPLETED'
  },
  en: {
    productName: 'RunQ',
    productSubtitle: 'Agent Experience Observability',
    workspace: 'Local Workspace',
    refresh: 'Refresh',
    languageToggle: '中文',
    notifications: 'Notifications',
    searchPlaceholder: 'Search runs or events',
    traceExplorer: 'Trace Explorer',
    title: 'Agent Session Traces',
    subtitle: 'Evidence timeline reconstructed from real model, command, file, verification, and feedback events.',
    pickerBarLabel: 'Context picker',
    pickerAgentLabel: 'Agent',
    pickerSessionLabel: 'Session',
    pickerAgentPlaceholder: 'Pick an agent…',
    pickerSessionPlaceholder: 'Pick a session…',
    pickerSessionDisabled: 'Pick an agent first',
    pickerSearchAgents: 'Search agents / framework',
    pickerSearchSessions: 'Search session id / status',
    pickerSearchAll: 'Search sessions across agents',
    pickerMostRecent: 'Most recent',
    pickerNoMatches: 'No matches',
    pickerNoAgents: 'No agent sessions in this database yet',
    pickerJumpHint: '⌘K to search',
    pickerOpenLatest: 'Open latest session',
    pickerEmptyMain: 'Pick an agent and a session to inspect a trace',
    pickerEmptyMainSub: 'The two dropdowns above are chained — choose an agent first, then a session. Sessions are grouped by framework.',
    agentSessionCount: 'sessions',
    agentAvgTrust: 'Avg trust score',
    agentLastActive: 'Last activity',
    sessionDuration: 'Duration',
    sessionEvents: 'events',
    closeDialog: 'Close',
    eyebrow: 'Trace Telemetry',
    sessionList: 'Session List',
    allAgents: 'All agents',
    searchSession: 'Search session',
    noSessions: 'No sessions match the current filters.',
    selectSession: 'Select a session to inspect its trace.',
    sessionOverview: 'Session Overview',
    runSummary: 'Run Summary',
    runSummaryBody: 'A structured RunQ Trust Model explanation of reliability, execution path, and capability calls for this run.',
    finalConfidence: 'RunQ Trust Score',
    evidenceLimited: 'Evidence limited',
    evidenceLimitedBody: 'RunQ saw model or tool activity, but no normalized file-change or verification evidence.',
    trustModel: 'Trust Model',
    outcomeEvidence: 'Outcome evidence',
    executionPath: 'Execution path',
    callFootprint: 'Call footprint',
    noToolFootprint: 'No tool, MCP, or skill calls',
    verificationSummary: 'Verification result',
    taskList: 'Task List',
    taskFallbackTitle: 'Session task',
    taskPrompt: 'User request',
    evidenceTimeline: 'Evidence timeline',
    groupedTraceEvents: 'Grouped trace events',
    taskFlow: 'Task flow',
    taskFlowBody: 'End-to-end process from user request through model, tools, commands, files, and feedback.',
    taskRecap: 'Task recap',
    taskRequest: 'User request',
    taskPath: 'Key path',
    taskResult: 'Result',
    workflowHint: 'Drag the canvas to inspect the full workflow. Click a node to open details on the right.',
    eventActionHelp: 'Raw events are captured telemetry logs; workflow nodes are the visualized task steps.',
    redactionNote: 'Content is hidden by the metadata-first privacy policy; only summaries, counts, or hashes are retained.',
    actionCount: 'Workflow nodes',
    flowTruncatedPrefix: 'Showing first ',
    rawEvents: 'raw events',
    tools: 'Tools',
    flowLaneModel: 'Model',
    flowLaneTool: 'Tools',
    flowLaneMcp: 'MCP',
    flowLaneSkill: 'Skills',
    flowLaneCommand: 'Commands',
    flowLaneVerification: 'Verification',
    flowLaneFile: 'Files',
    flowLaneOutcome: 'Outcome',
    flowLaneOther: 'Other',
    sessionInspector: 'Span Detail',
    noSessionSelected: 'No session selected',
    framework: 'Framework',
    modelCalls: 'Model calls',
    commands: 'Commands',
    verification: 'Verification',
    failed: 'failed',
    tokens: 'tokens',
    totalTokens: 'Total Tokens',
    outcomeConfidence: 'Outcome Confidence',
    satisfaction: 'Satisfaction',
    keyMetrics: 'Key metrics',
    scoring: 'RunQ Trust Model',
    metadata: 'Metadata',
    eventPayload: 'Event payload',
    sourceUnknown: 'source unknown',
    lifecycle: 'Lifecycle',
    model: 'Model',
    commandsTools: 'Commands & Tools',
    filesVerification: 'Files & Verification',
    feedback: 'Feedback',
    other: 'Other',
    events: 'events',
    exportJson: 'Export JSON',
    openSession: 'Open Session',
    privacyMode: 'Privacy mode',
    eventCount: 'Event count',
    lastSeen: 'Last seen',
    noSignal: 'Not recorded',
    selectedEvent: 'Selected event',
    eventTimestamp: 'Timestamp',
    eventSource: 'Source',
    noEventSelected: 'No event selected',
    home: 'Home',
    rerun: 'Re-run',
    completed: 'COMPLETED'
  }
};

const sidebarItems = [
  { href: '/agents', viewKey: 'agents', icon: 'dashboard' },
  { href: '/sessions', viewKey: 'sessions', icon: 'smart_toy' },
  { href: '/traces', viewKey: 'traces', icon: 'timeline' },
  { href: '/recommendations', viewKey: 'recommendations', icon: 'monitoring' },
  { href: '/setup', viewKey: 'setup', icon: 'settings' }
];

const SESSION_AUTO_REFRESH_MS = 10000;
const EVENT_AUTO_REFRESH_MS = 3000;
// For very long sessions (e.g. Codex rollouts with 1k+ tool calls), aggressive
// polling and rendering all nodes makes the page unresponsive. Cap both.
const EVENT_AUTO_REFRESH_MS_LARGE = 30000;
const LARGE_EVENT_THRESHOLD = 500;
const MAX_FLOW_NODES = 200;

const traceGroups = [
  {
    id: 'lifecycle', titleKey: 'lifecycle', icon: 'flag', accent: 'border-slate-300', dot: 'bg-slate-200',
    match: (event) => event.event_type === 'session.started' || event.event_type === 'session.ended' || event.event_type === 'user.prompt.submitted'
  },
  {
    id: 'model', titleKey: 'model', icon: 'memory', accent: 'border-primary', dot: 'bg-primary',
    match: (event) => event.event_type.startsWith('model.') || event.event_type.startsWith('agent.step.')
  },
  {
    id: 'commands', titleKey: 'commandsTools', icon: 'terminal', accent: 'border-amber-400', dot: 'bg-amber-400',
    match: (event) => event.event_type.startsWith('command.') || event.event_type.startsWith('tool.call.')
  },
  {
    id: 'files', titleKey: 'filesVerification', icon: 'description', accent: 'border-emerald-400', dot: 'bg-emerald-400',
    match: (event) => event.event_type === 'file.changed' || event.event_type === 'git.diff.summarized' ||
      event.event_type.startsWith('test.') || event.event_type.startsWith('build.') || event.event_type.startsWith('lint.')
  },
  {
    id: 'feedback', titleKey: 'feedback', icon: 'feedback', accent: 'border-violet-400', dot: 'bg-violet-400',
    match: (event) => event.event_type === 'satisfaction.recorded' || event.event_type.startsWith('recommendation.')
  }
];

function normalizeLang(lang) { return lang === 'en' ? 'en' : 'zh'; }
function getStoredLang() { if (typeof window === 'undefined') return null; return window.localStorage.getItem('runq.lang'); }
function setStoredLang(lang) { if (typeof window !== 'undefined') window.localStorage.setItem('runq.lang', lang); }

function MaterialIcon({ name, className = '', filled = false, style }) {
  return h('span', {
    'aria-hidden': 'true',
    className: ['material-symbols-outlined', filled ? 'filled' : '', className].filter(Boolean).join(' '),
    'data-icon': name,
    style
  }, name);
}

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function RunqLogo({ className = 'h-10 w-10' }) {
  return h('svg', {
    'aria-hidden': 'true',
    className,
    'data-logo': 'runq',
    viewBox: '0 0 128 128'
  }, [
    h('defs', null, [
      h('linearGradient', { id: 'runq-trace-mark-bg', gradientUnits: 'userSpaceOnUse', x1: '16', x2: '116', y1: '12', y2: '118' }, [
        h('stop', { stopColor: '#111827' }),
        h('stop', { offset: '1', stopColor: '#0050CB' })
      ]),
      h('linearGradient', { id: 'runq-trace-mark-orbit', gradientUnits: 'userSpaceOnUse', x1: '26', x2: '102', y1: '30', y2: '100' }, [
        h('stop', { stopColor: '#00EEFC' }),
        h('stop', { offset: '1', stopColor: '#0066FF' })
      ])
    ]),
    h('rect', { fill: 'url(#runq-trace-mark-bg)', height: '128', rx: '28', width: '128' }),
    h('path', { d: 'M30 66c0-21.5 15.7-38 37-38 17.6 0 30.8 11.4 34.4 27.7', fill: 'none', stroke: 'url(#runq-trace-mark-orbit)', strokeLinecap: 'round', strokeWidth: '10' }),
    h('path', { d: 'M98 65c0 21.5-15.7 38-37 38-18 0-31.5-11.9-34.7-28.7', fill: 'none', stroke: '#F8FAFC', strokeLinecap: 'round', strokeWidth: '10' }),
    h('path', { d: 'M75 87l18 18', stroke: '#F8FAFC', strokeLinecap: 'round', strokeWidth: '10' }),
    h('circle', { cx: '67', cy: '66', fill: '#F8FAFC', r: '16' }),
    h('circle', { cx: '67', cy: '66', fill: '#0050CB', r: '7' }),
    h('circle', { cx: '101', cy: '54', fill: '#22C55E', r: '8' }),
    h('path', { d: 'M97.5 54.2l2.4 2.5 5.1-6', fill: 'none', stroke: '#F8FAFC', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2.8' })
  ]);
}

function chip(label, tone = 'neutral', key) {
  const tones = {
    neutral: 'bg-surface-container-low text-on-surface-variant border border-outline-variant/40',
    info: 'bg-primary-fixed text-on-primary-fixed border border-primary-fixed-dim/60',
    good: 'bg-green-50 text-green-700 border border-green-100',
    warn: 'bg-amber-50 text-amber-700 border border-amber-100',
    bad: 'bg-error-container text-on-error-container border border-error-container'
  };
  return h('span', {
    key,
    className: `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tones[tone] || tones.neutral}`
  }, label);
}

function groupEvents(events, t) {
  const groups = traceGroups.map((g) => ({ ...g, title: t[g.titleKey], events: [] }));
  const other = { id: 'other', title: t.other, icon: 'more_horiz', accent: 'border-slate-200', dot: 'bg-slate-200', events: [] };
  for (const event of events) {
    const group = groups.find((g) => g.match(event));
    (group ? group.events : other.events).push(event);
  }
  return [...groups, other].filter((g) => g.events.length > 0);
}

function eventFailed(event) {
  return event.event_type === 'command.ended' && Number(event.payload?.exit_code) !== 0;
}

function eventMeta(event, t) {
  const tokens = event.payload?.total_tokens || event.payload?.tokens;
  if (tokens) return `${tokens} ${t.tokens}`;
  if (event.payload?.exit_code !== undefined) return `Exit ${event.payload.exit_code}`;
  return event.privacy?.level || 'metadata';
}

function eventSortValue(event) {
  const timestamp = Date.parse(event.timestamp || '');
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function firstInspectableEventId(events = []) {
  return events.find((event) => !['session.started', 'session.ended', 'outcome.scored'].includes(event.event_type))?.event_id
    ?? events[0]?.event_id
    ?? null;
}

function promptSummary(event, t) {
  return event?.payload?.prompt_summary || event?.payload?.task_summary || t.taskFallbackTitle;
}

function buildSessionTasks(events, t) {
  const sorted = [...events].sort((a, b) => eventSortValue(a) - eventSortValue(b));
  const promptIndexes = sorted
    .map((event, index) => event.event_type === 'user.prompt.submitted' ? index : -1)
    .filter((index) => index >= 0);

  if (promptIndexes.length === 0) {
    return [{
      id: 'task_1',
      index: 1,
      title: sorted[0]?.payload?.task_summary || t.taskFallbackTitle,
      summary: sorted[0]?.payload?.task_summary || t.selectSession,
      events: sorted
    }];
  }

  return promptIndexes.map((startIndex, index) => {
    const nextStart = promptIndexes[index + 1] ?? sorted.length;
    const taskEvents = sorted.slice(startIndex, nextStart);
    const promptEvent = sorted[startIndex];
    return {
      id: `task_${index + 1}`,
      index: index + 1,
      title: `${t.taskPrompt} ${index + 1}`,
      summary: promptSummary(promptEvent, t),
      events: taskEvents
    };
  });
}

function buildTaskRecap(selectedTask, actions, t) {
  const meaningful = actions.filter((action) => action.kind !== 'event');
  const request = meaningful.find((action) => action.kind === 'requirement')?.detail
    || selectedTask?.summary
    || t.selectSession;
  const path = meaningful
    .filter((action) => !['requirement', 'outcome'].includes(action.kind))
    .slice(0, 5)
    .map((action) => action.title)
    .join(' → ') || t.noSignal;
  const outcome = [...meaningful].reverse().find((action) => ['outcome', 'verification', 'command', 'model'].includes(action.kind));
  const result = outcome?.title || selectedTask?.events?.at(-1)?.event_type || t.noSignal;
  const redacted = [request, path, result].some((value) => String(value || '').includes('[redacted]'))
    || selectedTask?.events?.some((event) => event.privacy?.redacted || event.privacy?.level === 'metadata');
  return { path, redacted, request, result };
}

function capabilityName(action) {
  if (action.skill_name) return action.skill_name;
  if (action.mcp_server && action.tool_name) return action.tool_name;
  if (action.mcp_server) return action.mcp_server;
  return action.tool_name || action.action_name || action.title;
}

function isEvidenceLimitedSession(session) {
  const quality = session?.quality || {};
  const telemetry = session?.telemetry || {};
  const score = trustScoreValue(quality);
  const reasons = Array.isArray(quality.reasons) ? quality.reasons : [];
  const hasScoringEvidence = Number(telemetry.command_count || 0) > 0 ||
    Number(telemetry.verification_count || 0) > 0 ||
    Number(telemetry.file_change_count || 0) > 0;
  const hasObservedActivity = Number(telemetry.model_call_count || 0) > 0 ||
    Number(telemetry.tool_call_count || 0) > 0;
  return score === 55 && reasons.length === 0 && hasObservedActivity && !hasScoringEvidence && !session?.satisfaction?.label;
}

function buildRunSummary(session, selectedTask, actions, t) {
  const confidence = trustScoreValue(session?.quality);
  const evidenceLimited = isEvidenceLimitedSession(session);
  const verifications = actions.filter((action) => action.kind === 'verification');
  const passedVerifications = verifications.filter((action) => action.status !== 'failed').length;
  const failedVerifications = verifications.length - passedVerifications;
  const capabilityCalls = actions
    .filter((action) => ['tool', 'mcp', 'skill'].includes(action.kind))
    .map(capabilityName)
    .filter(Boolean);
  const uniqueCapabilities = Array.from(new Set(capabilityCalls));
  const path = actions
    .filter((action) => !['event'].includes(action.kind))
    .slice(0, 6)
    .map((action) => action.title)
    .join(' → ') || t.noSignal;
  return {
    confidence,
    evidenceDetail: evidenceLimited ? t.evidenceLimitedBody : null,
    evidenceLimited,
    footprint: uniqueCapabilities.join(' · ') || t.noToolFootprint,
    path,
    request: selectedTask?.summary || t.selectSession,
    verification: verifications.length
      ? `${passedVerifications}/${verifications.length} ${t.verification}${failedVerifications ? ` · ${failedVerifications} ${t.failed}` : ''}`
      : evidenceLimited ? t.evidenceLimited : t.noSignal
  };
}

function timeLabel(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toISOString().slice(11, 19);
}

function relativeTimeLabel(timestamp, lang) {
  if (!timestamp) return '-';
  const then = Date.parse(timestamp);
  if (Number.isNaN(then)) return timestamp;
  const diff = Date.now() - then;
  if (diff < 0) return new Date(then).toISOString().slice(0, 16).replace('T', ' ');
  const seconds = Math.round(diff / 1000);
  if (seconds < 60) return lang === 'en' ? `${seconds}s ago` : `${seconds} 秒前`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return lang === 'en' ? `${minutes}m ago` : `${minutes} 分钟前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return lang === 'en' ? `${hours}h ago` : `${hours} 小时前`;
  const days = Math.round(hours / 24);
  if (days < 30) return lang === 'en' ? `${days}d ago` : `${days} 天前`;
  return new Date(then).toISOString().slice(0, 10);
}

function durationLabel(startedAt, endedAt) {
  const start = Date.parse(startedAt || '');
  const end = Date.parse(endedAt || '');
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return '-';
  const ms = end - start;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 60) return `${minutes}m ${rest}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

const frameworkIconMap = {
  'claude-code': 'terminal',
  'claude': 'auto_awesome',
  'cursor': 'mouse',
  'aider': 'edit_note',
  'codex': 'code',
  'gemini-cli': 'auto_awesome',
  'openai-codex': 'code',
  'cline': 'memory',
  'continue': 'route'
};

function frameworkIcon(framework) {
  const key = String(framework || '').toLowerCase();
  if (frameworkIconMap[key]) return frameworkIconMap[key];
  for (const known of Object.keys(frameworkIconMap)) {
    if (key.includes(known)) return frameworkIconMap[known];
  }
  return 'smart_toy';
}

function frameworkAccent(framework) {
  const palette = [
    { ring: 'from-primary/30 via-primary/0 to-primary/0', icon: 'bg-primary/10 text-primary-container', dot: 'bg-primary' },
    { ring: 'from-emerald-300/40 via-emerald-200/0 to-transparent', icon: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
    { ring: 'from-amber-300/40 via-amber-200/0 to-transparent', icon: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
    { ring: 'from-violet-300/40 via-violet-200/0 to-transparent', icon: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
    { ring: 'from-rose-300/40 via-rose-200/0 to-transparent', icon: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
    { ring: 'from-sky-300/40 via-sky-200/0 to-transparent', icon: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' }
  ];
  let hash = 0;
  const value = String(framework || '');
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

function aggregateAgents(sessions) {
  const map = new Map();
  for (const session of sessions) {
    const key = session.framework || 'unknown';
    if (!map.has(key)) {
      map.set(key, {
        framework: key,
        sessions: [],
        totalEvents: 0,
        totalTokens: 0,
        trustSum: 0,
        trustCount: 0,
        failedVerifications: 0,
        lastEventAt: ''
      });
    }
    const bucket = map.get(key);
    bucket.sessions.push(session);
    bucket.totalEvents += Number(session.event_count || 0);
    bucket.totalTokens += Number(session.telemetry?.total_tokens || 0);
    bucket.failedVerifications += Number(session.telemetry?.verification_failed_count || 0);
    const trust = trustScoreValue(session.quality);
    if (trust > 0) {
      bucket.trustSum += trust;
      bucket.trustCount += 1;
    }
    const lastAt = session.last_event_at || session.started_at || '';
    if (lastAt > bucket.lastEventAt) bucket.lastEventAt = lastAt;
  }
  return [...map.values()]
    .map((bucket) => ({
      ...bucket,
      avgTrust: bucket.trustCount ? Math.round(bucket.trustSum / bucket.trustCount) : 0,
      sessionCount: bucket.sessions.length
    }))
    .sort((a, b) => (b.lastEventAt || '').localeCompare(a.lastEventAt || ''));
}

function updateUrl(agent, sessionId) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (agent) params.set('agent', agent); else params.delete('agent');
  if (sessionId) params.set('session', sessionId); else params.delete('session');
  const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
  window.history.replaceState(null, '', next);
}

function Sidebar({ activeView }) {
  return h('aside', {
    className: 'fixed left-0 top-0 z-50 flex h-screen w-20 flex-col items-center border-r border-white/30 bg-white/70 py-8 shadow-2xl shadow-primary/5 backdrop-blur-xl'
  }, [
    h('a', {
      'aria-label': 'RunQ Agents',
      className: 'mb-12 rounded-2xl transition-transform hover:scale-105',
      href: '/agents',
      key: 'logo'
    }, h(RunqLogo, { className: 'h-11 w-11' })),
    h('nav', { className: 'flex flex-1 flex-col items-center gap-6', key: 'nav' }, sidebarItems.map((item) => {
      const active = item.viewKey === activeView;
      return h('a', {
        className: [
          'grid h-12 w-12 place-items-center rounded-xl transition-all',
          active ? 'bg-primary/10 text-primary-container shadow-[0_0_15px_rgba(0,102,255,0.30)]' : 'text-outline hover:scale-105 hover:text-on-surface'
        ].join(' '),
        href: item.href,
        key: item.viewKey
      }, h(MaterialIcon, { className: 'text-[22px]', filled: active, name: item.icon }));
    })),
    h('div', { className: 'mt-auto flex flex-col items-center gap-6', key: 'footer' }, [
      h('a', {
        className: [
          'grid h-12 w-12 place-items-center rounded-xl transition-all',
          activeView === 'evaluations' ? 'bg-primary/10 text-primary-container shadow-[0_0_15px_rgba(0,102,255,0.30)]' : 'text-outline hover:scale-105 hover:text-on-surface'
        ].join(' '),
        href: '/evaluations'
      }, h(MaterialIcon, { className: 'text-[22px]', filled: activeView === 'evaluations', name: 'grading' })),
      h('a', {
        className: 'grid h-12 w-12 place-items-center rounded-xl text-outline transition-all hover:scale-105 hover:text-on-surface',
        href: '/docs'
      }, h(MaterialIcon, { className: 'text-[22px]', name: 'menu_book' })),
      h('div', { className: 'grid h-10 w-10 place-items-center rounded-full border-2 border-primary-fixed bg-surface-container-lowest text-[11px] font-bold text-primary-container' }, 'YOU')
    ])
  ]);
}

function TopBar({ t, lang, setLang, onRefresh, notificationCount = 0, searchQuery = '' }) {
  return h('header', {
    className: 'fixed left-20 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/20 bg-white/70 px-8 backdrop-blur-xl'
  }, [
    h('h1', { className: 'text-h3 font-h3 tracking-tight' }, [t.productName, ' Console ', h('span', { className: 'text-outline font-normal text-sm', key: 'sub' }, `· ${t.productSubtitle}`)]),
    h('div', { className: 'flex items-center gap-4' }, [
      h('form', { action: '/sessions', className: 'relative', method: 'get' }, [
        h(MaterialIcon, { className: 'absolute left-3 top-1/2 -translate-y-1/2 text-outline scale-75', name: 'search' }),
        h('input', {
          className: 'w-64 rounded-full border-none bg-surface-container-low py-1.5 pl-10 pr-4 text-xs outline-none focus:ring-2 focus:ring-primary',
          defaultValue: searchQuery,
          name: 'q',
          placeholder: t.searchPlaceholder,
          type: 'search'
        })
      ]),
      h('button', {
        className: 'p-2 text-outline hover:text-primary rounded-lg hover:bg-slate-100/50 transition-all',
        onClick: onRefresh,
        title: t.refresh,
        type: 'button'
      }, h(MaterialIcon, { name: 'refresh' })),
      h('button', {
        className: 'p-2 text-outline hover:text-primary rounded-lg hover:bg-slate-100/50 transition-all',
        onClick: () => setLang(lang === 'en' ? 'zh' : 'en'),
        title: t.languageToggle,
        type: 'button'
      }, h(MaterialIcon, { name: 'language' })),
      h('a', {
        'aria-label': `${t.notifications} ${notificationCount}`,
        'data-action': 'open-notifications',
        className: 'relative rounded-lg p-2 text-outline transition-all hover:bg-slate-100/50 hover:text-primary',
        href: '/recommendations',
        title: `${t.notifications} ${notificationCount}`
      }, [
        h(MaterialIcon, { name: 'notifications', key: 'i' }),
        notificationCount > 0
          ? h('span', { className: 'absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full border-2 border-white bg-primary px-1 text-[9px] font-bold leading-none text-white', key: 'd' }, notificationCount > 9 ? '9+' : String(notificationCount))
          : null
      ])
    ])
  ]);
}

function TaskList({ tasks, selectedTaskId, onSelectTask, t }) {
  return h('section', { className: 'glass-card rounded-3xl p-lg', 'data-task-list': 'session-tasks' }, [
    h('div', { className: 'mb-md flex items-center justify-between gap-3' }, [
      h('div', null, [
        h('div', { className: 'text-label-caps font-label-caps uppercase text-outline' }, t.taskList),
        h('h3', { className: 'mt-2 text-h3 font-h3 tracking-tight' }, `${tasks.length} ${t.taskFlow}`)
      ]),
      chip(String(tasks.length), tasks.length ? 'info' : 'neutral', 'tasks')
    ]),
    tasks.length === 0
      ? h('p', { className: 'rounded-2xl border border-dashed border-outline-variant/50 p-md text-sm text-outline' }, t.selectSession)
      : h('div', { className: 'grid gap-2 sm:grid-cols-2' }, tasks.map((task) =>
          h('button', {
            className: [
              'rounded-2xl border p-md text-left transition-all',
              selectedTaskId === task.id
                ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(0,102,255,0.14)]'
                : 'border-outline-variant/40 bg-white/65 hover:border-primary/40'
            ].join(' '),
            'data-task-id': task.id,
            'data-selected': selectedTaskId === task.id ? 'true' : 'false',
            key: task.id,
            onClick: () => onSelectTask(task.id),
            type: 'button'
          }, [
            h('div', { className: 'mb-2 flex items-center justify-between gap-2' }, [
              h('span', { className: 'font-mono text-mono text-outline' }, String(task.index).padStart(2, '0')),
              chip(`${task.events.length} ${t.rawEvents}`, 'neutral', 'events')
            ]),
            h('div', { className: 'line-clamp-2 text-sm font-semibold leading-6 text-on-surface' }, task.summary || task.title)
          ])
        ))
  ]);
}

function SelectedEventPanel({ event, t }) {
  if (!event) {
    return h('section', {
      'data-selected-event-id': '',
      className: 'glass-card rounded-3xl p-lg text-sm text-outline border-dashed'
    }, [
      h('h3', { className: 'mb-2 text-label-caps font-label-caps uppercase text-outline' }, t.selectedEvent),
      h('p', null, t.noEventSelected)
    ]);
  }
  return h('section', {
    'data-selected-event-id': event.event_id,
    className: 'glass-card rounded-3xl p-lg'
  }, [
    h('div', { className: 'mb-md flex items-center justify-between gap-2' }, [
      h('h3', { className: 'text-label-caps font-label-caps uppercase text-outline' }, t.selectedEvent),
      chip(event.event_type, 'info', 'evt')
    ]),
    h('div', { className: 'space-y-2 text-sm' }, [
      h('div', { className: 'flex justify-between gap-3' }, [h('span', { className: 'text-outline' }, 'event_id'), h('span', { className: 'truncate font-mono text-mono' }, event.event_id)]),
      h('div', { className: 'flex justify-between gap-3' }, [h('span', { className: 'text-outline' }, t.eventTimestamp), h('span', { className: 'truncate font-mono text-mono' }, event.timestamp || '-')]),
      h('div', { className: 'flex justify-between gap-3' }, [h('span', { className: 'text-outline' }, t.eventSource), h('span', { className: 'font-mono text-mono' }, event.source || t.sourceUnknown)]),
      h('div', { className: 'flex justify-between gap-3' }, [h('span', { className: 'text-outline' }, t.privacyMode), h('span', { className: 'font-mono text-mono' }, event.privacy?.level || 'metadata')])
    ]),
    event.privacy?.redacted || event.privacy?.level !== 'raw'
      ? h('p', {
          className: 'mt-md rounded-2xl border border-dashed border-outline-variant/50 bg-surface-container-low/50 p-3 text-xs leading-5 text-outline',
          'data-redaction-note': 'metadata-first'
        }, t.redactionNote)
      : null,
    h('div', { className: 'mt-md' }, [
      h('div', { className: 'mb-1 text-label-caps font-label-caps uppercase text-outline' }, t.eventPayload),
      h('pre', { className: 'max-h-72 overflow-auto rounded-2xl bg-slate-950 p-3 font-mono text-mono text-blue-300' }, JSON.stringify(event.payload || {}, null, 2))
    ])
  ]);
}

function TimelineEventCard({ event, group, t, selected, onSelect }) {
  const failed = eventFailed(event);
  const cardClass = [
    'flex-1 rounded-2xl border bg-white/70 p-md transition-all backdrop-blur-sm',
    selected ? 'border-primary shadow-[0_0_15px_rgba(0,102,255,0.18)]' : failed ? 'border-error/40 bg-error-container/30' : 'border-white/50 hover:border-primary/40'
  ].join(' ');

  return h('details', {
    'data-event-id': event.event_id,
    'data-selected': selected ? 'true' : 'false',
    className: 'group relative flex gap-md',
    onClick: () => onSelect?.(event.event_id)
  }, [
    h('summary', { className: 'flex w-full cursor-pointer items-stretch gap-md [&::-webkit-details-marker]:hidden' }, [
      h('div', { className: 'relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-white bg-white shadow-[0_0_10px_rgba(15,23,42,0.06)]' }, [
        h('span', { className: `absolute inset-1 rounded-full ${failed ? 'bg-error/20' : selected ? 'bg-primary/20' : 'bg-' + (group.dot.replace('bg-', '') + '/30')}` }),
        h(MaterialIcon, { className: `relative text-[18px] ${failed ? 'text-error' : selected ? 'text-primary-container' : 'text-on-surface-variant'}`, name: group.icon })
      ]),
      h('div', { className: cardClass }, [
        h('div', { className: 'flex flex-wrap items-start justify-between gap-2' }, [
          h('div', { className: 'flex min-w-0 items-center gap-3' }, [
            chip(event.event_type, failed ? 'bad' : 'info', 'type'),
            h('span', { className: 'truncate text-sm font-semibold' }, summarizeEvent(event))
          ]),
          h('span', { className: 'shrink-0 font-mono text-mono text-outline' }, [timeLabel(event.timestamp), ' · ', eventMeta(event, t)])
        ]),
        h('div', { className: 'mt-2 flex items-center justify-between text-xs text-outline' }, [
          h('span', { className: 'font-mono' }, event.event_id),
          failed ? h(MaterialIcon, { className: 'text-error text-[16px]', name: 'error' }) : h(MaterialIcon, { className: 'text-outline text-[16px] transition-transform group-open:rotate-180', name: 'expand_more' })
        ])
      ])
    ]),
    h('div', { className: 'mt-3 ml-[56px] rounded-2xl bg-slate-950 p-md' },
      h('pre', { className: 'max-h-72 overflow-auto font-mono text-mono text-blue-300' }, JSON.stringify(event.payload || {}, null, 2))
    )
  ]);
}

function TimelineGroup({ group, t, selectedEventId, onSelectEvent }) {
  return h('section', { className: 'space-y-md' }, [
    h('div', { className: 'flex items-center gap-3' }, [
      h('div', { className: 'grid h-8 w-8 place-items-center rounded-lg bg-white/80 text-on-surface-variant border border-outline-variant/30' },
        h(MaterialIcon, { className: 'text-[18px]', name: group.icon })
      ),
      h('div', null, [
        h('h3', { className: 'text-label-caps font-label-caps uppercase text-outline' }, group.title),
        h('p', { className: 'font-mono text-mono text-outline' }, `${group.events.length} ${t.events}`)
      ])
    ]),
    h('div', { className: 'relative space-y-md ml-2' }, [
      h('div', { className: 'absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-outline-variant to-transparent' }),
      ...group.events.map((event) =>
        h(TimelineEventCard, {
          event, group, key: event.event_id,
          onSelect: onSelectEvent,
          selected: selectedEventId === event.event_id, t
        })
      )
    ])
  ]);
}

function actionIcon(kind) {
  return {
    requirement: 'chat',
    model: 'memory',
    tool: 'build',
    mcp: 'hub',
    skill: 'psychology',
    command: 'terminal',
    verification: 'fact_check',
    file: 'description',
    permission: 'lock_open',
    step: 'route',
    outcome: 'verified',
    event: 'fiber_manual_record'
  }[kind] || 'fiber_manual_record';
}

function actionTone(status) {
  if (status === 'failed') return 'border-error/50 bg-error-container/40 text-on-error-container';
  if (status === 'completed') return 'border-green-200 bg-green-50/70 text-green-800';
  if (status === 'running') return 'border-primary/30 bg-primary/5 text-primary-container';
  return 'border-outline-variant/40 bg-white/70 text-on-surface';
}

function FlowActionCard({ action, selectedEventId, onSelectEvent }) {
  return h('button', {
    'data-flow-action-id': action.event_id,
    'data-flow-action-name': action.action_name,
    'data-flow-action-kind': action.kind,
    'data-flow-action-phase': action.phase,
    'data-flow-action-type': action.action_type,
    'data-flow-action-duration-ms': action.duration_ms,
    'data-flow-mcp-server': action.mcp_server,
    'data-flow-skill-name': action.skill_name,
    className: [
      'min-w-[220px] max-w-[260px] rounded-2xl border p-md text-left transition-all hover:border-primary/40',
      actionTone(action.status),
      selectedEventId === action.event_id ? 'ring-2 ring-primary/25' : ''
    ].join(' '),
    onClick: () => onSelectEvent?.(action.event_id),
    title: action.event_type,
    type: 'button'
  }, [
    h('div', { className: 'flex items-start justify-between gap-2' }, [
      h('div', { className: 'min-w-0' }, [
        h('div', { className: 'flex items-center gap-2' }, [
          h('span', { className: 'font-mono text-mono text-outline' }, String(action.index).padStart(2, '0')),
          h('span', { className: 'truncate text-sm font-semibold text-on-surface' }, action.title)
        ]),
        h('p', { className: 'mt-1 text-xs leading-5 text-on-surface-variant' }, action.detail)
      ]),
      h(MaterialIcon, { className: 'shrink-0 text-[18px] text-outline', name: actionIcon(action.kind) })
    ]),
    h('div', { className: 'mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] text-outline' }, [
      h('span', null, action.event_type),
      action.tool_name ? h('span', null, `tool=${action.tool_name}`) : null,
      action.mcp_server ? h('span', null, `mcp=${action.mcp_server}`) : null,
      action.skill_name ? h('span', null, `skill=${action.skill_name}`) : null,
      h('span', null, timeLabel(action.timestamp))
    ])
  ]);
}

function TimelineGraph({ actions, selectedEventId, onSelectEvent }) {
  const edges = actions.slice(1).map((action, index) => ({
    from: actions[index],
    to: action
  }));
  return h('div', { className: 'overflow-x-auto pb-2', 'data-flow-layout': 'timeline-graph' }, [
    h('div', { className: 'relative min-w-max pb-2' }, [
      h('div', { className: 'absolute left-6 right-6 top-[50%] h-px -translate-y-1/2 bg-gradient-to-r from-primary/50 via-outline-variant to-primary/20' }),
      h('div', { className: 'absolute inset-x-0 top-[50%] flex -translate-y-1/2 justify-between px-[140px]' }, edges.map((edge) =>
        h('span', {
          'aria-hidden': 'true',
          className: 'h-2 w-2 rotate-45 border-r-2 border-t-2 border-primary/50',
          'data-flow-edge-from': edge.from.event_id,
          'data-flow-edge-to': edge.to.event_id,
          key: `${edge.from.event_id}-${edge.to.event_id}`
        })
      )),
      h('ol', { className: 'relative z-10 flex items-stretch gap-4' }, actions.map((action) =>
        h('li', {
          className: 'flex min-h-[190px] w-[260px] shrink-0 flex-col',
          'data-flow-node-kind': action.kind,
          key: action.id
        }, [
          h('div', { className: 'mb-2 flex items-center gap-2 text-label-caps font-label-caps uppercase text-outline' }, [
            h(MaterialIcon, { className: 'text-[16px]', name: actionIcon(action.kind) }),
            h('span', null, action.kind)
          ]),
          h(FlowActionCard, { action, selectedEventId, onSelectEvent })
        ])
      ))
    ])
  ]);
}

function workflowNodeTypeForAction(action, index, total) {
  if (action.status === 'failed') return 'error';
  if (index === 0 || action.kind === 'requirement') return 'trigger';
  if (index === total - 1 || action.kind === 'outcome') return 'success';
  return 'operation';
}

function TaskWorkflowNode({ data }) {
  const { action, index, onSelect, selected, total } = data;
  const nodeType = workflowNodeTypeForAction(action, index, total);
  const accent = selected ? 'border-primary shadow-[0_0_18px_rgba(0,102,255,0.20)]' : nodeType === 'error' ? 'border-error/50 bg-error-container/30' : 'border-outline-variant/50 bg-white';
  return h('div', {
    className: `relative w-[320px] cursor-grab rounded-2xl border ${accent} bg-white p-md text-left shadow-sm transition-all hover:border-primary/50 active:cursor-grabbing`,
    'data-flow-action-id': action.event_id,
    'data-flow-action-kind': action.kind,
    'data-flow-action-name': action.action_name,
    'data-flow-action-phase': action.phase,
    'data-flow-action-type': action.action_type,
    'data-flow-action-duration-ms': action.duration_ms,
    'data-flow-mcp-server': action.mcp_server,
    'data-flow-skill-name': action.skill_name,
    'data-click-opens-detail': 'true',
    'data-workflow-node-type': nodeType,
    onKeyDown: (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect?.(action.event_id);
      }
    },
    onClick: () => onSelect?.(action.event_id),
    role: 'button',
    tabIndex: 0
  }, [
    index > 0 ? h(Handle, {
      className: '!h-3 !w-3 !border-2 !border-white !bg-primary',
      'data-workflow-port': 'input',
      position: Position.Left,
      type: 'target'
    }) : null,
    index < total - 1 ? h(Handle, {
      className: '!h-3 !w-3 !border-2 !border-white !bg-primary',
      'data-workflow-port': 'output',
      position: Position.Right,
      type: 'source'
    }) : null,
    h('div', { className: 'mb-3 flex items-start justify-between gap-3' }, [
      h('div', { className: 'flex min-w-0 items-center gap-2' }, [
        h('div', { className: 'grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-container-low text-on-surface-variant' },
          h(MaterialIcon, { className: 'text-[19px]', name: actionIcon(action.kind) })
        ),
        h('div', { className: 'min-w-0' }, [
          h('div', { className: 'truncate text-sm font-semibold text-on-surface' }, action.title),
          h('div', { className: 'font-mono text-[10px] uppercase text-outline' }, action.event_type)
        ])
      ]),
      h('span', { className: 'shrink-0 font-mono text-[11px] text-outline' }, timeLabel(action.timestamp))
    ]),
    h('p', { className: 'line-clamp-2 text-xs leading-5 text-on-surface-variant' }, action.detail),
    h('div', { className: 'mt-3 flex flex-wrap items-center gap-2 font-mono text-[10px] text-outline' }, [
      h('span', null, action.label || action.kind),
      action.tool_name ? h('span', null, `tool=${action.tool_name}`) : null,
      action.mcp_server ? h('span', null, `mcp=${action.mcp_server}`) : null,
      action.skill_name ? h('span', null, `skill=${action.skill_name}`) : null
    ])
  ]);
}

const taskNodeTypes = { taskAction: TaskWorkflowNode };

function StaticTaskWorkflow({ actions, selectedEventId, onSelectEvent }) {
  const edges = actions.slice(1).map((action, index) => ({ from: actions[index], to: action }));
  // Note: data-workflow-* viewport/canvas/interaction/node-size attributes live on the
  // wrapping TaskWorkflowCanvas outer div. Duplicating them here breaks Playwright
  // strict-mode locators pre-hydration when this static fallback is nested inside it.
  return h('div', {
    className: 'relative min-w-max rounded-2xl border border-outline-variant/35 bg-surface-container-lowest/70 p-4',
    'data-flow-layout': 'timeline-graph',
    'data-task-workflow': 'react-flow'
  }, [
    h('svg', { 'aria-hidden': 'true', className: 'pointer-events-none absolute inset-0 h-full w-full overflow-visible' }, [
      h('defs', null,
        h('marker', { id: 'task-workflow-arrow', markerHeight: '8', markerWidth: '8', orient: 'auto', refX: '7', refY: '4' },
          h('path', { d: 'M0,0 L8,4 L0,8 Z', fill: '#0050CB' })
        )
      ),
      ...edges.map((edge, index) => {
        const startX = 318 + index * 364;
        const endX = startX + 64;
        return h('path', {
          d: `M ${startX} 96 C ${startX + 24} 96 ${endX - 24} 96 ${endX} 96`,
          fill: 'none',
          key: `${edge.from.event_id}-${edge.to.event_id}`,
          markerEnd: 'url(#task-workflow-arrow)',
          stroke: '#0050CB',
          strokeOpacity: '0.45',
          strokeWidth: '2',
          'data-flow-edge-from': edge.from.event_id,
          'data-flow-edge-to': edge.to.event_id
        });
      })
    ]),
    h('ol', { className: 'relative z-10 flex items-start gap-[64px]' }, actions.map((action, index) =>
      h('li', { className: 'shrink-0', key: action.id }, [
        h('div', { className: 'relative' }, [
          index > 0 ? h('span', { className: 'absolute -left-[6px] top-[88px] z-20 h-3 w-3 rounded-full border-2 border-white bg-primary shadow-sm', 'data-workflow-port': 'input' }) : null,
          index < actions.length - 1 ? h('span', { className: 'absolute -right-[6px] top-[88px] z-20 h-3 w-3 rounded-full border-2 border-white bg-primary shadow-sm', 'data-workflow-port': 'output' }) : null,
          h('div', {
            'data-click-opens-detail': 'true',
            'data-workflow-node-type': workflowNodeTypeForAction(action, index, actions.length)
          },
            h(FlowActionCard, { action, onSelectEvent, selectedEventId })
          )
        ])
      ])
    ))
  ]);
}

// Build a parent-child tree out of action.parent_id pointing back to other
// actions in the same set. Falls back to a linear chain (parent = previous
// action) when no parent_id information is present (legacy data).
function buildActionTree(actions) {
  const byId = new Map(actions.map((action) => [action.event_id, action]));
  const childrenByParent = new Map();
  const roots = [];
  let hasAnyParent = false;

  for (const action of actions) {
    let parentId = action.parent_id;
    // Walk up if the parent isn't in the rendered slice (e.g. session.started
    // is filtered out of actions). Bail out at depth 8 to avoid pathological
    // cycles in malformed data.
    let depth = 0;
    while (parentId && !byId.has(parentId) && depth < 8) {
      const ancestor = actions.find((a) => a.event_id === parentId);
      if (!ancestor) break;
      parentId = ancestor.parent_id;
      depth += 1;
    }
    if (parentId && byId.has(parentId) && parentId !== action.event_id) {
      hasAnyParent = true;
      const siblings = childrenByParent.get(parentId) ?? [];
      siblings.push(action);
      childrenByParent.set(parentId, siblings);
    } else {
      roots.push(action);
    }
  }

  // Fallback: nothing has a parent → chain by index so the layout degrades to
  // the previous linear view.
  if (!hasAnyParent && actions.length > 1) {
    const chainedRoots = [actions[0]];
    const chainedChildren = new Map();
    for (let i = 1; i < actions.length; i += 1) {
      chainedChildren.set(actions[i - 1].event_id, [actions[i]]);
    }
    return { roots: chainedRoots, childrenByParent: chainedChildren };
  }
  return { roots, childrenByParent };
}

const TREE_X_GAP = 360;
const TREE_Y_GAP = 110;

function layoutActionTree(roots, childrenByParent) {
  const positions = new Map();
  let yCursor = 0;
  function place(action, depth) {
    const children = childrenByParent.get(action.event_id) ?? [];
    if (children.length === 0) {
      const y = yCursor * TREE_Y_GAP;
      yCursor += 1;
      positions.set(action.event_id, { x: depth * TREE_X_GAP, y });
      return y;
    }
    const childYs = children.map((child) => place(child, depth + 1));
    const y = (childYs[0] + childYs[childYs.length - 1]) / 2;
    positions.set(action.event_id, { x: depth * TREE_X_GAP, y });
    return y;
  }
  for (const root of roots) place(root, 0);
  return positions;
}

function TaskWorkflowCanvas({ actions, selectedEventId, onSelectEvent }) {
  const mounted = useMounted();
  // Cap node count so ReactFlow stays responsive on huge sessions.
  const renderActions = useMemo(
    () => actions.length > MAX_FLOW_NODES ? actions.slice(0, MAX_FLOW_NODES) : actions,
    [actions]
  );
  const tree = useMemo(() => buildActionTree(renderActions), [renderActions]);
  const positions = useMemo(
    () => layoutActionTree(tree.roots, tree.childrenByParent),
    [tree]
  );
  const nodes = useMemo(() => renderActions.map((action, index) => {
    const pos = positions.get(action.event_id) ?? { x: 32 + index * TREE_X_GAP, y: 48 };
    return {
      id: action.event_id,
      type: 'taskAction',
      position: { x: 32 + pos.x, y: 32 + pos.y },
      data: {
        action,
        index,
        onSelect: onSelectEvent,
        selected: selectedEventId === action.event_id,
        total: renderActions.length
      }
    };
  }), [renderActions, positions, onSelectEvent, selectedEventId]);
  const edges = useMemo(() => {
    const list = [];
    for (const [parentId, children] of tree.childrenByParent.entries()) {
      for (const child of children) {
        list.push({
          id: `${parentId}-${child.event_id}`,
          source: parentId,
          target: child.event_id,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#0050CB' },
          style: { stroke: '#0050CB', strokeOpacity: 0.5, strokeWidth: 2 }
        });
      }
    }
    return list;
  }, [tree]);

  return h('div', {
    className: 'overflow-hidden rounded-2xl border border-outline-variant/35 bg-surface-container-lowest/70',
    'data-workflow-canvas-height': 'compact',
    'data-workflow-interaction': 'pan-drag-click',
    'data-workflow-node-size': 'readable',
    'data-workflow-viewport': 'content-first',
    'data-workflow-mount-state': mounted ? 'hydrated' : 'static'
  }, [
    mounted
      ? h('div', { className: 'h-[310px]', 'data-flow-layout': 'timeline-graph', 'data-task-workflow': 'react-flow' },
          h(ReactFlow, {
            colorMode: 'light',
            defaultViewport: { x: 0, y: 0, zoom: 1 },
            edges,
            maxZoom: 1.35,
            minZoom: 0.7,
            nodeTypes: taskNodeTypes,
            nodes,
            nodesConnectable: false,
            nodesDraggable: true,
            onNodeClick: (_event, node) => onSelectEvent?.(node.id),
            panOnDrag: true,
            panOnScroll: true,
            proOptions: { hideAttribution: true },
            zoomOnDoubleClick: false
          }, [
            h(Background, { color: '#c2c6d8', gap: 18, size: 1 }),
            h(Controls, { showInteractive: false })
          ])
        )
      : h(StaticTaskWorkflow, { actions: renderActions, onSelectEvent, selectedEventId })
  ]);
}

function TaskFlow({ actions, selectedEventId, onSelectEvent, selectedTask, t }) {
  const toolCount = actions.filter((action) => action.kind === 'tool').length;
  const recap = buildTaskRecap(selectedTask, actions, t);
  return h('section', {
    className: 'glass-card-strong rounded-3xl p-lg',
    'data-action-flow': 'agent-task-flow',
    'data-selected-task-id': selectedTask?.id || ''
  }, [
    h('div', { className: 'mb-lg flex flex-wrap items-start justify-between gap-4' }, [
      h('div', null, [
        h('span', { className: 'text-label-caps font-label-caps uppercase text-primary' }, t.taskFlow),
        h('h3', { className: 'mt-2 text-h3 font-h3 tracking-tight' }, selectedTask?.summary || t.taskFlow),
        h('p', { className: 'mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant' }, t.taskFlowBody)
      ]),
      h('div', { className: 'flex gap-2' }, [
        chip(`${actions.length} ${t.actionCount}`, 'info', 'actions'),
        chip(`${toolCount} ${t.tools}`, toolCount ? 'good' : 'neutral', 'tools'),
        actions.length > MAX_FLOW_NODES
          ? chip(`${t.flowTruncatedPrefix}${MAX_FLOW_NODES}/${actions.length}`, 'warn', 'truncated')
          : null
      ])
    ]),
    actions.length === 0
      ? h('p', { className: 'rounded-2xl border border-dashed border-outline-variant/50 p-md text-sm text-outline' }, t.selectSession)
      : [
          h('div', {
            className: 'mb-md grid gap-3 rounded-2xl border border-outline-variant/35 bg-white/65 p-md md:grid-cols-3',
            'data-task-recap': 'trace-summary',
            key: 'recap'
          }, [
            h('div', { className: 'md:col-span-3 flex items-center gap-2 text-label-caps font-label-caps uppercase text-primary' }, [
              h(MaterialIcon, { className: 'text-[16px]', name: 'summarize' }),
              h('span', null, t.taskRecap)
            ]),
            h('div', null, [
              h('p', { className: 'text-label-caps font-label-caps uppercase text-outline' }, t.taskRequest),
              h('p', { className: 'mt-1 line-clamp-3 text-sm font-semibold leading-6 text-on-surface' }, recap.request)
            ]),
            h('div', null, [
              h('p', { className: 'text-label-caps font-label-caps uppercase text-outline' }, t.taskPath),
              h('p', { className: 'mt-1 line-clamp-3 text-sm leading-6 text-on-surface-variant' }, recap.path)
            ]),
            h('div', null, [
              h('p', { className: 'text-label-caps font-label-caps uppercase text-outline' }, t.taskResult),
              h('p', { className: 'mt-1 line-clamp-3 text-sm leading-6 text-on-surface-variant' }, recap.result)
            ]),
            recap.redacted
              ? h('p', {
                  className: 'md:col-span-3 rounded-xl border border-dashed border-outline-variant/45 bg-surface-container-low/50 px-3 py-2 text-xs leading-5 text-outline',
                  'data-redaction-note': 'metadata-first'
                }, t.redactionNote)
              : null
          ]),
          h('p', { className: 'mb-3 text-xs leading-5 text-outline', key: 'hint' }, [t.workflowHint, ' ', t.eventActionHelp]),
          h(TaskWorkflowCanvas, { actions, key: selectedTask?.id || 'task-workflow', onSelectEvent, selectedEventId })
        ]
  ]);
}

function ResultBadge({ session, t }) {
  if (!session) return null;
  const score = trustScoreValue(session.quality);
  const tokens = session.telemetry?.total_tokens || 0;
  const cmds = session.telemetry?.command_count || 0;
  const verified = (session.telemetry?.verification_count || 0) - (session.telemetry?.verification_failed_count || 0);
  return h('div', { className: 'glass-card-strong relative flex flex-wrap items-center justify-between gap-md overflow-hidden rounded-3xl p-lg', 'data-session-overview': 'selected-session' }, [
    h('div', { className: 'flex items-center gap-md' }, [
      h('div', { className: 'grid h-16 w-16 place-items-center rounded-2xl bg-green-500/10 text-green-600 shadow-[0_0_20px_rgba(34,197,94,0.20)]' },
        h(MaterialIcon, { className: 'text-[40px]', filled: true, name: 'check_circle' })
      ),
      h('div', null, [
        h('div', { className: 'mb-1 text-label-caps font-label-caps uppercase text-outline' }, t.sessionOverview),
        h('div', { className: 'flex items-center gap-2' }, [
          h('span', { className: 'text-h3 font-h3 tracking-tight text-green-600' }, session.session_id),
          chip(t.completed, 'good', 'done')
        ]),
        h('p', { className: 'mt-1 text-sm text-outline' }, [
          `${session.framework}`, ' · ',
          `${tokens.toLocaleString()} ${t.tokens}`, ' · ',
          `${cmds} ${t.commands}`, ' · ',
          `${verified}/${session.telemetry?.verification_count || 0} ${t.verification}`
        ])
      ])
    ]),
    h('div', { className: 'w-56' }, [
      h('div', { className: 'mb-2 flex items-end justify-between' }, [
        h('span', { className: 'text-label-caps font-label-caps uppercase text-outline' }, t.outcomeConfidence),
        h('span', { className: 'font-mono text-mono font-bold text-primary' }, `${score}%`)
      ]),
      h('div', { className: 'h-1.5 w-full overflow-hidden rounded-full bg-slate-100' },
        h('div', { className: 'h-full rounded-full bg-gradient-to-r from-primary to-secondary-container shadow-[0_0_8px_rgba(0,102,255,0.4)]', style: { width: `${score}%` } })
      )
    ])
  ]);
}

function RunSummaryPanel({ actions, selectedTask, session, t }) {
  if (!session) return null;
  const summary = buildRunSummary(session, selectedTask, actions, t);
  const dimensions = trustBreakdownEntries(session.quality);
  return h('section', {
    className: 'glass-card-strong rounded-3xl p-lg',
    'data-run-summary': 'trace-run-summary'
  }, [
    h('div', { className: 'mb-md flex flex-wrap items-start justify-between gap-4' }, [
      h('div', null, [
        h('span', { className: 'text-label-caps font-label-caps uppercase text-primary' }, t.runSummary),
        h('h3', { className: 'mt-2 text-h3 font-h3 tracking-tight' }, summary.request),
        h('p', { className: 'mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant' }, t.runSummaryBody)
      ]),
      chip(summary.evidenceLimited ? `${summary.confidence}% · ${t.evidenceLimited}` : `${summary.confidence}%`, summary.confidence >= 80 ? 'good' : summary.confidence >= 50 ? 'warn' : 'bad', 'confidence')
    ]),
    h('div', { className: 'grid gap-md md:grid-cols-3' }, [
      h('article', { className: 'rounded-2xl border border-outline-variant/30 bg-white/65 p-md' }, [
        h('p', { className: 'text-label-caps font-label-caps uppercase text-outline' }, t.finalConfidence),
        h('p', { className: 'mt-2 font-mono text-h3 font-h3 tracking-tight text-on-surface' }, `${summary.confidence}%`),
        h('p', { className: 'mt-1 text-xs leading-5 text-outline' }, summary.evidenceLimited ? t.evidenceLimited : summary.verification),
        summary.evidenceDetail
          ? h('p', { className: 'mt-2 text-xs leading-5 text-on-surface-variant' }, summary.evidenceDetail)
          : null
      ]),
      h('article', { className: 'rounded-2xl border border-outline-variant/30 bg-white/65 p-md' }, [
        h('p', { className: 'text-label-caps font-label-caps uppercase text-outline' }, t.callFootprint),
        h('p', { className: 'mt-2 text-sm font-semibold leading-6 text-on-surface' }, summary.footprint)
      ]),
      h('article', { className: 'rounded-2xl border border-outline-variant/30 bg-white/65 p-md' }, [
        h('p', { className: 'text-label-caps font-label-caps uppercase text-outline' }, t.verificationSummary),
        h('p', { className: 'mt-2 text-sm font-semibold leading-6 text-on-surface' }, summary.verification)
      ])
    ]),
    h('div', { className: 'mt-md rounded-2xl border border-outline-variant/30 bg-surface-container-low/55 p-md' }, [
      h('p', { className: 'text-label-caps font-label-caps uppercase text-outline' }, t.executionPath),
      h('p', { className: 'mt-2 text-sm leading-6 text-on-surface-variant' }, summary.path)
    ]),
    dimensions.length
      ? h('div', { className: 'mt-md rounded-2xl border border-outline-variant/30 bg-white/60 p-md' }, [
          h('p', { className: 'text-label-caps font-label-caps uppercase text-outline' }, t.trustModel),
          h('div', { className: 'mt-3 grid gap-2 md:grid-cols-3' }, dimensions.map((dimension) =>
            h('div', { className: 'rounded-xl bg-surface-container-low/60 p-3', key: dimension.key }, [
              h('div', { className: 'flex items-center justify-between gap-2 text-sm' }, [
                h('span', { className: 'font-semibold text-on-surface' }, dimension.label),
                h('span', { className: 'font-mono text-mono font-bold text-primary' }, `${dimension.score}%`)
              ]),
              h('div', { className: 'mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100' },
                h('div', { className: 'h-full rounded-full bg-gradient-to-r from-primary to-secondary-container', style: { width: `${dimension.score}%` } })
              )
            ])
          ))
        ])
      : null
    
  ]);
}

function trustTone(score) {
  if (score >= 80) return 'good';
  if (score >= 50) return 'warn';
  return 'bad';
}

function trustToneClass(score) {
  const tone = trustTone(score);
  if (tone === 'good') return 'text-green-700 bg-green-50 border-green-100';
  if (tone === 'warn') return 'text-amber-700 bg-amber-50 border-amber-100';
  return 'text-rose-700 bg-rose-50 border-rose-100';
}

function useClickOutside(open, onClose) {
  const ref = React.useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    function handlePointer(event) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target)) onClose();
    }
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);
  return ref;
}

function Combobox({
  ariaLabel, dataAttr, disabled, disabledHint, emptyHint, items, onSelect,
  placeholder, renderOption, renderTrigger, searchPlaceholder, value
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useClickOutside(open, () => setOpen(false));
  const inputRef = React.useRef(null);

  const filtered = useMemo(() => {
    const norm = search.trim().toLowerCase();
    if (!norm) return items;
    return items.filter((item) => item.searchText.toLowerCase().includes(norm));
  }, [items, search]);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setActiveIndex(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (activeIndex >= filtered.length) setActiveIndex(Math.max(0, filtered.length - 1));
  }, [filtered.length, activeIndex]);

  function commit(item) {
    onSelect(item.value);
    setOpen(false);
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((idx) => Math.min(idx + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((idx) => Math.max(idx - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = filtered[activeIndex];
      if (item) commit(item);
    }
  }

  return h('div', {
    ref: containerRef,
    [dataAttr]: 'combobox',
    'data-combobox-open': open ? 'true' : 'false',
    className: 'relative flex-1 min-w-[220px]'
  }, [
    h('button', {
      'aria-expanded': open ? 'true' : 'false',
      'aria-haspopup': 'listbox',
      'aria-label': ariaLabel,
      className: [
        'flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left transition-all',
        disabled
          ? 'cursor-not-allowed border-dashed border-outline-variant/40 bg-surface-container-low text-outline'
          : open
            ? 'border-primary shadow-[0_0_22px_rgba(0,102,255,0.18)]'
            : 'border-outline-variant/40 hover:border-primary/50'
      ].join(' '),
      disabled,
      onClick: () => !disabled && setOpen((prev) => !prev),
      type: 'button'
    }, [
      renderTrigger(value, { disabled, disabledHint, placeholder }),
      h(MaterialIcon, {
        className: ['ml-auto text-[20px] transition-transform', open ? 'rotate-180 text-primary' : 'text-outline'].join(' '),
        name: 'expand_more'
      })
    ]),
    open
      ? h('div', {
          className: 'absolute left-0 right-0 z-30 mt-2 max-h-[420px] overflow-hidden rounded-2xl border border-outline-variant/40 bg-white shadow-[0_18px_50px_-20px_rgba(15,23,42,0.45)]',
          role: 'listbox'
        }, [
          h('div', { className: 'relative border-b border-outline-variant/40 bg-surface-container-low px-3 py-2' }, [
            h(MaterialIcon, { className: 'absolute left-5 top-1/2 -translate-y-1/2 text-[18px] text-outline', name: 'search' }),
            h('input', {
              className: 'w-full rounded-xl border-none bg-transparent py-1.5 pl-8 pr-2 text-sm outline-none',
              onChange: (event) => setSearch(event.target.value),
              onKeyDown: handleKeyDown,
              placeholder: searchPlaceholder,
              ref: inputRef,
              type: 'search',
              value: search
            })
          ]),
          filtered.length === 0
            ? h('p', { className: 'px-4 py-6 text-center text-sm text-outline' }, emptyHint)
            : h('ul', { className: 'max-h-[340px] space-y-1 overflow-auto p-2' }, filtered.map((item, index) =>
                h('li', {
                  'aria-selected': index === activeIndex ? 'true' : 'false',
                  className: [
                    'cursor-pointer rounded-xl border px-3 py-2 transition-all',
                    index === activeIndex
                      ? 'border-primary/40 bg-primary/5 shadow-[0_0_15px_rgba(0,102,255,0.12)]'
                      : 'border-transparent hover:border-outline-variant/40 hover:bg-surface-container-low/60'
                  ].join(' '),
                  key: item.key,
                  onClick: () => commit(item),
                  onMouseEnter: () => setActiveIndex(index),
                  role: 'option'
                }, renderOption(item, index === activeIndex))
              ))
        ])
      : null
  ]);
}

function AgentTriggerContent({ bucket, lang, placeholder, t }) {
  if (!bucket) {
    return h('div', { className: 'flex min-w-0 items-center gap-3' }, [
      h('div', { className: 'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-container-low text-outline' },
        h(MaterialIcon, { className: 'text-[20px]', name: 'smart_toy' })
      ),
      h('div', { className: 'min-w-0' }, [
        h('p', { className: 'text-label-caps font-label-caps uppercase tracking-wider text-outline' }, t.pickerAgentLabel),
        h('p', { className: 'mt-0.5 truncate text-sm font-semibold text-outline' }, placeholder)
      ])
    ]);
  }
  const accent = frameworkAccent(bucket.framework);
  return h('div', { className: 'flex min-w-0 items-center gap-3' }, [
    h('div', { className: `grid h-10 w-10 shrink-0 place-items-center rounded-xl ${accent.icon}` },
      h(MaterialIcon, { className: 'text-[20px]', filled: true, name: frameworkIcon(bucket.framework) })
    ),
    h('div', { className: 'min-w-0' }, [
      h('p', { className: 'text-label-caps font-label-caps uppercase tracking-wider text-outline' }, t.pickerAgentLabel),
      h('p', { className: 'mt-0.5 flex items-center gap-2 truncate text-sm font-semibold text-on-surface' }, [
        h('span', { className: 'truncate' }, bucket.framework),
        h('span', { className: 'shrink-0 rounded-full bg-surface-container-low px-2 py-0.5 font-mono text-[10px] text-outline' },
          `${bucket.sessionCount} ${t.agentSessionCount}`
        )
      ])
    ])
  ]);
}

function SessionTriggerContent({ session, disabled, disabledHint, lang, placeholder, t }) {
  if (disabled) {
    return h('div', { className: 'flex min-w-0 items-center gap-3' }, [
      h('div', { className: 'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-container-low text-outline' },
        h(MaterialIcon, { className: 'text-[20px]', name: 'lock' })
      ),
      h('div', { className: 'min-w-0' }, [
        h('p', { className: 'text-label-caps font-label-caps uppercase tracking-wider text-outline' }, t.pickerSessionLabel),
        h('p', { className: 'mt-0.5 truncate text-sm font-semibold text-outline' }, disabledHint)
      ])
    ]);
  }
  if (!session) {
    return h('div', { className: 'flex min-w-0 items-center gap-3' }, [
      h('div', { className: 'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-container-low text-outline' },
        h(MaterialIcon, { className: 'text-[20px]', name: 'receipt_long' })
      ),
      h('div', { className: 'min-w-0' }, [
        h('p', { className: 'text-label-caps font-label-caps uppercase tracking-wider text-outline' }, t.pickerSessionLabel),
        h('p', { className: 'mt-0.5 truncate text-sm font-semibold text-outline' }, placeholder)
      ])
    ]);
  }
  const score = trustScoreValue(session.quality);
  return h('div', { className: 'flex min-w-0 items-center gap-3' }, [
    h('div', { className: 'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary-container' },
      h(MaterialIcon, { className: 'text-[20px]', filled: true, name: 'receipt_long' })
    ),
    h('div', { className: 'min-w-0' }, [
      h('p', { className: 'text-label-caps font-label-caps uppercase tracking-wider text-outline' }, t.pickerSessionLabel),
      h('p', { className: 'mt-0.5 flex items-center gap-2 truncate text-sm font-semibold text-on-surface' }, [
        h('span', { className: 'truncate font-mono' }, `#${session.session_id}`),
        h('span', { className: `shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] ${trustToneClass(score)}` }, `${score}%`),
        h('span', { className: 'shrink-0 font-mono text-[10px] text-outline' }, relativeTimeLabel(session.last_event_at || session.started_at, lang))
      ])
    ])
  ]);
}

function AgentOption({ bucket, t, lang }) {
  const accent = frameworkAccent(bucket.framework);
  return h('div', { className: 'flex items-center gap-3' }, [
    h('div', { className: `grid h-10 w-10 shrink-0 place-items-center rounded-xl ${accent.icon}` },
      h(MaterialIcon, { className: 'text-[20px]', filled: true, name: frameworkIcon(bucket.framework) })
    ),
    h('div', { className: 'min-w-0 flex-1' }, [
      h('div', { className: 'flex items-center justify-between gap-3' }, [
        h('span', { className: 'truncate text-sm font-semibold text-on-surface' }, bucket.framework),
        h('span', { className: 'shrink-0 rounded-full bg-surface-container-low px-2 py-0.5 font-mono text-[10px] text-outline' },
          `${bucket.sessionCount} ${t.agentSessionCount}`
        )
      ]),
      h('div', { className: 'mt-1 flex items-center gap-3 text-[11px] text-outline' }, [
        h('span', { className: 'flex items-center gap-1' }, [
          h(MaterialIcon, { className: 'text-[14px]', name: 'verified' }),
          `${bucket.avgTrust}% ${t.agentAvgTrust}`
        ]),
        h('span', { className: 'flex items-center gap-1' }, [
          h(MaterialIcon, { className: 'text-[14px]', name: 'schedule' }),
          relativeTimeLabel(bucket.lastEventAt, lang)
        ])
      ])
    ])
  ]);
}

function SessionOption({ session, t, lang, withAgentPrefix = false }) {
  const score = trustScoreValue(session.quality);
  const tele = session.telemetry || {};
  const failedVerifications = Number(tele.verification_failed_count || 0);
  return h('div', { className: 'flex items-center gap-3' }, [
    h('div', { className: `grid h-10 w-10 shrink-0 place-items-center rounded-xl ${trustToneClass(score)} border` },
      h('span', { className: 'font-mono text-[11px] font-bold' }, `${score}`)
    ),
    h('div', { className: 'min-w-0 flex-1' }, [
      h('div', { className: 'flex items-center justify-between gap-3' }, [
        h('span', { className: 'truncate font-mono text-sm font-semibold text-on-surface' },
          withAgentPrefix ? `${session.framework} · #${session.session_id}` : `#${session.session_id}`
        ),
        h('span', { className: 'shrink-0 font-mono text-[10px] text-outline' },
          relativeTimeLabel(session.last_event_at || session.started_at, lang)
        )
      ]),
      h('div', { className: 'mt-1 flex flex-wrap items-center gap-2 text-[11px] text-outline' }, [
        h('span', null, `${Number(session.event_count || 0).toLocaleString()} ${t.sessionEvents}`),
        h('span', null, `${Number(tele.total_tokens || 0).toLocaleString()} ${t.tokens}`),
        failedVerifications > 0
          ? h('span', { className: 'text-rose-600' }, `${failedVerifications} ${t.failed}`)
          : null,
        session.satisfaction?.label
          ? h('span', { className: session.satisfaction.label === 'accepted' ? 'text-green-700' : '' }, session.satisfaction.label)
          : null
      ])
    ])
  ]);
}

function PickerBar({
  agentBuckets, agent, lang, latestSession, onOpenPalette, onSelectAgent,
  onSelectSession, selectedSession, sessionsForAgent, t
}) {
  const currentBucket = agentBuckets.find((bucket) => bucket.framework === agent) || null;
  const agentItems = agentBuckets.map((bucket) => ({
    key: bucket.framework,
    value: bucket.framework,
    searchText: `${bucket.framework} ${bucket.sessionCount}`,
    bucket
  }));
  const sessionItems = sessionsForAgent.map((session) => ({
    key: session.session_id,
    value: session.session_id,
    searchText: `${session.session_id} ${session.satisfaction?.label || ''}`,
    session
  }));

  const score = selectedSession ? trustScoreValue(selectedSession.quality) : null;
  const tele = selectedSession?.telemetry || {};

  return h('section', {
    'data-picker-bar': 'agent-session',
    className: 'sticky top-16 z-30 -mx-2 px-2 pb-2 pt-1'
  }, [
    h('div', { className: 'glass-card-strong rounded-3xl border border-white/40 p-md backdrop-blur-xl' }, [
      h('div', { className: 'flex flex-wrap items-stretch gap-3' }, [
        h(Combobox, {
          ariaLabel: t.pickerAgentLabel,
          dataAttr: 'data-agent-combobox',
          disabled: agentBuckets.length === 0,
          disabledHint: t.pickerNoAgents,
          emptyHint: t.pickerNoMatches,
          items: agentItems,
          onSelect: onSelectAgent,
          placeholder: t.pickerAgentPlaceholder,
          renderOption: (item) => h(AgentOption, { bucket: item.bucket, lang, t }),
          renderTrigger: (_value, opts) => h(AgentTriggerContent, { bucket: currentBucket, lang, placeholder: opts.placeholder, t }),
          searchPlaceholder: t.pickerSearchAgents,
          value: agent
        }),
        h('div', { 'aria-hidden': 'true', className: 'pointer-events-none flex shrink-0 items-center' }, [
          h('span', { className: 'h-px w-3 bg-outline-variant' }),
          h('span', { className: ['mx-1 grid h-6 w-6 place-items-center rounded-full border', agent ? 'border-primary/40 bg-primary/10 text-primary' : 'border-outline-variant/50 bg-white text-outline'].join(' ') },
            h(MaterialIcon, { className: 'text-[14px]', name: 'chevron_right' })
          ),
          h('span', { className: 'h-px w-3 bg-outline-variant' })
        ]),
        h(Combobox, {
          ariaLabel: t.pickerSessionLabel,
          dataAttr: 'data-session-combobox',
          disabled: !agent,
          disabledHint: t.pickerSessionDisabled,
          emptyHint: t.pickerNoMatches,
          items: sessionItems,
          onSelect: onSelectSession,
          placeholder: t.pickerSessionPlaceholder,
          renderOption: (item) => h(SessionOption, { session: item.session, lang, t }),
          renderTrigger: (_value, opts) => h(SessionTriggerContent, {
            disabled: opts.disabled,
            disabledHint: opts.disabledHint,
            lang,
            placeholder: opts.placeholder,
            session: selectedSession,
            t
          }),
          searchPlaceholder: t.pickerSearchSessions,
          value: selectedSession?.session_id || null
        }),
        h('button', {
          'data-action': 'open-jump-palette',
          'aria-label': t.pickerSearchAll,
          className: 'flex shrink-0 items-center gap-2 rounded-2xl border border-outline-variant/40 bg-white px-3 text-xs font-semibold text-on-surface-variant transition-all hover:border-primary/40 hover:text-primary',
          onClick: onOpenPalette,
          title: t.pickerSearchAll,
          type: 'button'
        }, [
          h(MaterialIcon, { className: 'text-[18px]', name: 'search' }),
          h('span', { className: 'hidden md:inline font-mono' }, '⌘K')
        ])
      ]),
      selectedSession
        ? h('div', {
            'data-picker-summary': 'true',
            className: 'mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-outline-variant/30 bg-white/60 px-md py-2 text-xs text-on-surface-variant'
          }, [
            currentBucket
              ? h('span', { className: 'inline-flex items-center gap-1' }, [
                  h(MaterialIcon, { className: 'text-[14px] text-outline', name: 'smart_toy' }),
                  h('span', null, `${currentBucket.framework} · ${currentBucket.sessionCount} ${t.agentSessionCount}`)
                ])
              : null,
            h('span', { className: 'inline-flex items-center gap-1' }, [
              h(MaterialIcon, { className: 'text-[14px] text-outline', name: 'verified' }),
              h('span', null, `${t.finalConfidence} ${score}%`)
            ]),
            h('span', { className: 'inline-flex items-center gap-1' }, [
              h(MaterialIcon, { className: 'text-[14px] text-outline', name: 'bolt' }),
              h('span', null, `${Number(selectedSession.event_count || 0).toLocaleString()} ${t.sessionEvents}`)
            ]),
            h('span', { className: 'inline-flex items-center gap-1' }, [
              h(MaterialIcon, { className: 'text-[14px] text-outline', name: 'memory' }),
              h('span', null, `${Number(tele.total_tokens || 0).toLocaleString()} ${t.tokens}`)
            ]),
            h('span', { className: 'inline-flex items-center gap-1' }, [
              h(MaterialIcon, { className: 'text-[14px] text-outline', name: 'schedule' }),
              h('span', null, relativeTimeLabel(selectedSession.last_event_at || selectedSession.started_at, lang))
            ])
          ])
        : null
    ])
  ]);
}

function JumpToSessionPalette({ sessions, onClose, onSelect, t, lang }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = React.useRef(null);

  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const norm = query.trim().toLowerCase();
  const filtered = norm
    ? sessions.filter((session) => [session.session_id, session.framework, session.satisfaction?.label].filter(Boolean).join(' ').toLowerCase().includes(norm))
    : sessions.slice(0, 20);

  useEffect(() => {
    if (activeIndex >= filtered.length) setActiveIndex(Math.max(0, filtered.length - 1));
  }, [filtered.length, activeIndex]);

  function commit(session) {
    onSelect(session);
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((idx) => Math.min(idx + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((idx) => Math.max(idx - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const session = filtered[activeIndex];
      if (session) commit(session);
    }
  }

  return h('div', {
    'aria-modal': 'true',
    'data-jump-palette': 'open',
    className: 'fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/45 px-4 pt-[12vh] backdrop-blur-sm',
    onClick: (event) => { if (event.target === event.currentTarget) onClose(); },
    role: 'dialog'
  }, [
    h('div', { className: 'w-full max-w-[640px] overflow-hidden rounded-3xl border border-outline-variant/40 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.6)]' }, [
      h('div', { className: 'relative border-b border-outline-variant/40 bg-surface-container-low px-4 py-3' }, [
        h(MaterialIcon, { className: 'absolute left-6 top-1/2 -translate-y-1/2 text-[20px] text-outline', name: 'search' }),
        h('input', {
          className: 'w-full rounded-xl border-none bg-transparent py-1.5 pl-9 pr-2 text-sm outline-none',
          onChange: (event) => setQuery(event.target.value),
          onKeyDown: handleKeyDown,
          placeholder: t.pickerSearchAll,
          ref: inputRef,
          type: 'search',
          value: query
        }),
        h('button', {
          'aria-label': t.closeDialog,
          className: 'absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-outline transition-colors hover:bg-surface-container-low hover:text-primary',
          onClick: onClose,
          type: 'button'
        }, h(MaterialIcon, { className: 'text-[18px]', name: 'close' }))
      ]),
      filtered.length === 0
        ? h('p', { className: 'px-4 py-8 text-center text-sm text-outline' }, t.pickerNoMatches)
        : h('ul', { className: 'max-h-[55vh] space-y-1 overflow-auto p-2', role: 'listbox' }, filtered.map((session, index) =>
            h('li', {
              'aria-selected': index === activeIndex ? 'true' : 'false',
              className: [
                'cursor-pointer rounded-xl border px-3 py-2',
                index === activeIndex
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-transparent hover:border-outline-variant/40 hover:bg-surface-container-low/60'
              ].join(' '),
              key: session.session_id,
              onClick: () => commit(session),
              onMouseEnter: () => setActiveIndex(index),
              role: 'option'
            }, h(SessionOption, { lang, session, t, withAgentPrefix: true }))
          ))
    ])
  ]);
}

function EmptyTraceState({ t, lang, recentSessions = [], onSelectSession }) {
  return h('section', {
    'data-trace-empty': 'true',
    className: 'glass-card rounded-3xl border border-dashed border-outline-variant/50 p-lg'
  }, [
    h('div', { className: 'flex flex-wrap items-start justify-between gap-4' }, [
      h('div', { className: 'flex items-start gap-4 max-w-[640px]' }, [
        h('div', { className: 'grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary-container' },
          h(MaterialIcon, { className: 'text-[24px]', filled: true, name: 'route' })
        ),
        h('div', null, [
          h('span', { className: 'text-label-caps font-label-caps uppercase tracking-wider text-primary' }, t.pickerSessionLabel),
          h('h3', { className: 'mt-1 text-h3 font-h3 tracking-tight text-on-surface' }, t.pickerEmptyMain),
          h('p', { className: 'mt-2 text-sm leading-6 text-on-surface-variant' }, t.pickerEmptyMainSub)
        ])
      ])
    ]),
    recentSessions.length
      ? h('div', { className: 'mt-lg' }, [
          h('div', { className: 'mb-sm flex items-center justify-between' }, [
            h('span', { className: 'text-label-caps font-label-caps uppercase tracking-wider text-outline' }, t.pickerMostRecent),
            h('span', { className: 'font-mono text-[11px] text-outline' }, `${recentSessions.length}`)
          ]),
          h('ul', { 'data-trace-empty-recent': 'true', className: 'divide-y divide-outline-variant/30 overflow-hidden rounded-2xl border border-outline-variant/30 bg-white/70' },
            recentSessions.map((session) => {
              const score = trustScoreValue(session.quality);
              const tele = session.telemetry || {};
              return h('li', { key: session.session_id }, h('button', {
                className: 'group flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-primary/5',
                'data-action': 'open-recent-session',
                onClick: () => onSelectSession(session.session_id),
                type: 'button'
              }, [
                h('span', { className: `grid h-10 w-10 shrink-0 place-items-center rounded-xl border font-mono text-[11px] font-bold ${trustToneClass(score)}` }, `${score}`),
                h('div', { className: 'min-w-0 flex-1' }, [
                  h('div', { className: 'flex items-center gap-2' }, [
                    h(MaterialIcon, { className: 'text-[14px] text-outline', name: frameworkIcon(session.framework) }),
                    h('span', { className: 'truncate font-mono text-sm font-semibold text-on-surface' }, `${session.framework} · #${session.session_id}`)
                  ]),
                  h('div', { className: 'mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-outline' }, [
                    h('span', null, `${Number(session.event_count || 0).toLocaleString()} ${t.sessionEvents}`),
                    h('span', null, `${Number(tele.total_tokens || 0).toLocaleString()} ${t.tokens}`),
                    session.satisfaction?.label
                      ? h('span', { className: session.satisfaction.label === 'accepted' ? 'text-green-700' : '' }, session.satisfaction.label)
                      : null,
                    h('span', null, relativeTimeLabel(session.last_event_at || session.started_at, lang))
                  ])
                ]),
                h(MaterialIcon, { className: 'text-[18px] text-outline transition-transform group-hover:translate-x-1 group-hover:text-primary', name: 'arrow_forward' })
              ]));
            })
          )
        ])
      : null
  ]);
}


function Inspector({ session, events, selectedEvent, t }) {
  const tele = session?.telemetry || {};
  const toolCalls = tele.tool_call_count || 0;
  const trustScore = trustScoreValue(session?.quality);
  const dimensions = trustBreakdownEntries(session?.quality);
  return h('aside', { className: 'space-y-gutter' }, [
    h(SelectedEventPanel, { event: selectedEvent, key: 'selected', t }),
    h('section', { className: 'glass-card rounded-3xl p-lg' }, [
      h('h2', { className: 'mb-md text-h3 font-h3 tracking-tight' }, t.sessionInspector),
      h('div', { className: 'space-y-2 text-sm' }, [
        h('div', { className: 'flex justify-between gap-3' }, [h('span', { className: 'text-outline' }, 'session_id'), h('span', { className: 'truncate font-mono text-mono' }, session?.session_id || '-')]),
        h('div', { className: 'flex justify-between gap-3' }, [h('span', { className: 'text-outline' }, t.framework), h('span', { className: 'font-mono text-mono' }, session?.framework || '-')]),
        h('div', { className: 'flex justify-between gap-3' }, [h('span', { className: 'text-outline' }, t.satisfaction), h('span', { className: 'font-mono text-mono' }, session?.satisfaction?.label || t.noSignal)])
      ])
    ]),
    h('section', { className: 'glass-card rounded-3xl p-lg' }, [
      h('h3', { className: 'mb-md text-label-caps font-label-caps uppercase text-outline' }, t.keyMetrics),
      h('div', { className: 'grid grid-cols-2 gap-md' }, [
        h('div', null, [
          h('div', { className: 'text-label-caps font-label-caps uppercase text-outline' }, t.totalTokens),
          h('div', { className: 'mt-1 font-mono text-h3 font-h3 tracking-tight' }, Number(tele.total_tokens || 0).toLocaleString())
        ]),
        h('div', null, [
          h('div', { className: 'text-label-caps font-label-caps uppercase text-outline' }, t.eventCount),
          h('div', { className: 'mt-1 font-mono text-h3 font-h3 tracking-tight' }, session?.event_count || events.length)
        ]),
        h('div', null, [
          h('div', { className: 'text-label-caps font-label-caps uppercase text-outline' }, t.modelCalls),
          h('div', { className: 'mt-1 font-mono text-h3 font-h3 tracking-tight' }, tele.model_call_count || 0)
        ]),
        h('div', null, [
          h('div', { className: 'text-label-caps font-label-caps uppercase text-outline' }, t.commands),
          h('div', { className: 'mt-1 font-mono text-h3 font-h3 tracking-tight' }, tele.command_count || 0)
        ]),
        h('div', null, [
          h('div', { className: 'text-label-caps font-label-caps uppercase text-outline' }, t.tools),
          h('div', { className: 'mt-1 font-mono text-h3 font-h3 tracking-tight' }, toolCalls)
        ])
      ])
    ]),
    h('section', { className: 'glass-card rounded-3xl p-lg' }, [
      h('h3', { className: 'mb-md text-label-caps font-label-caps uppercase text-outline' }, t.scoring),
      h('div', { className: 'space-y-2' }, [
        h('div', { className: 'flex items-center justify-between text-sm' }, [
          h('span', { className: 'text-on-surface-variant' }, t.finalConfidence),
          h('span', { className: 'font-mono text-mono font-bold text-primary' }, `${trustScore}%`)
        ]),
        h('div', { className: 'h-1.5 overflow-hidden rounded-full bg-slate-100' },
          h('div', { className: 'h-full bg-gradient-to-r from-primary to-secondary-container', style: { width: `${trustScore}%` } })
        ),
        dimensions.length
          ? h('div', { className: 'mt-md space-y-2' }, dimensions.map((dimension) =>
              h('div', { className: 'rounded-xl bg-surface-container-low/60 p-2', key: dimension.key }, [
                h('div', { className: 'flex items-center justify-between gap-2 text-xs' }, [
                  h('span', { className: 'font-semibold text-on-surface-variant' }, dimension.label),
                  h('span', { className: 'font-mono text-mono text-primary' }, `${dimension.score}%`)
                ])
              ])
            ))
          : null,
        Number(tele.verification_failed_count || 0) > 0
          ? h('p', { className: 'mt-md rounded-2xl bg-error-container/60 px-3 py-2 text-sm text-on-error-container' }, `${tele.verification_failed_count} ${t.failed}`)
          : null
      ])
    ]),
    h('section', { className: 'glass-card rounded-3xl p-lg text-sm' }, [
      h('h3', { className: 'mb-md text-label-caps font-label-caps uppercase text-outline' }, t.metadata),
      h('div', { className: 'space-y-2' }, [
        h('div', { className: 'flex justify-between gap-3' }, [h('span', { className: 'text-outline' }, t.lastSeen), h('span', { className: 'truncate font-mono text-mono' }, session?.last_event_at || session?.started_at || '-')]),
        h('div', { className: 'flex justify-between gap-3' }, [h('span', { className: 'text-outline' }, 'score_version'), h('span', { className: 'font-mono text-mono' }, session?.quality?.score_version || '-')])
      ])
    ])
  ]);
}

export function AgentTraceExplorer({ initialSessions = [], initialEvents = [], initialLang = 'zh', initialSelectedAgent = null, initialSelectedEventId = null, initialSelectedSessionId = null }) {
  const [lang, setLangState] = useState(() => normalizeLang(initialLang));
  const t = traceCopy[lang];
  const [sessions, setSessions] = useState(initialSessions);
  const [events, setEvents] = useState(initialEvents);
  const initialSessionMatch = initialSessions.find((session) => session.session_id === initialSelectedSessionId) ?? null;
  const [selectedAgent, setSelectedAgent] = useState(initialSessionMatch?.framework ?? initialSelectedAgent ?? null);
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionMatch?.session_id ?? null);
  const [query, setQuery] = useState('');
  const [selectedEventId, setSelectedEventId] = useState(initialSelectedEventId ?? firstInspectableEventId(initialEvents));
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  useEffect(() => {
    const stored = getStoredLang();
    const normalized = normalizeLang(stored);
    if (stored && normalized !== lang) setLangState(normalized);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      refresh().catch(() => {});
    }, SESSION_AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [selectedSessionId]);

  useEffect(() => {
    if (!selectedSessionId) return undefined;
    // For very long timelines, polling every 3s would re-fetch + re-parse +
    // re-render thousands of events and starve the main thread. Slow it down.
    const interval = events.length > LARGE_EVENT_THRESHOLD
      ? EVENT_AUTO_REFRESH_MS_LARGE
      : EVENT_AUTO_REFRESH_MS;
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      refreshEventsForSession(selectedSessionId).catch(() => {});
    }, interval);
    return () => clearInterval(timer);
  }, [selectedSessionId, events.length]);

  useEffect(() => {
    updateUrl(selectedAgent, selectedSessionId);
  }, [selectedAgent, selectedSessionId]);

  function setLang(next) {
    const normalized = normalizeLang(next);
    setStoredLang(normalized);
    setLangState(normalized);
  }

  const agentBuckets = useMemo(() => aggregateAgents(sessions), [sessions]);
  const agentSessions = useMemo(() => {
    if (!selectedAgent) return [];
    return sessions
      .filter((session) => session.framework === selectedAgent)
      .sort((a, b) => (b.last_event_at || '').localeCompare(a.last_event_at || ''));
  }, [sessions, selectedAgent]);

  const selectedSession = sessions.find((s) => s.session_id === selectedSessionId) ?? null;
  const latestSession = useMemo(() => {
    const pool = selectedAgent ? agentSessions : sessions;
    if (!pool.length) return null;
    return [...pool].sort((a, b) => (b.last_event_at || '').localeCompare(a.last_event_at || ''))[0];
  }, [agentSessions, sessions, selectedAgent]);
  const allSessionsSorted = useMemo(() =>
    [...sessions].sort((a, b) => (b.last_event_at || '').localeCompare(a.last_event_at || '')),
    [sessions]
  );
  const recentSessionsForEmpty = useMemo(() => {
    const pool = selectedAgent ? agentSessions : allSessionsSorted;
    return pool.slice(0, 5);
  }, [allSessionsSorted, agentSessions, selectedAgent]);

  const [paletteOpen, setPaletteOpen] = useState(false);

  const groupedEvents = groupEvents(events, t);
  const tasks = useMemo(() => buildSessionTasks(events, t), [events, t]);
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks[0] ?? null;
  const actionFlow = useMemo(() => buildAgentActionFlow(selectedTask?.events || []), [selectedTask]);
  const selectedEvent = useMemo(() => events.find((e) => e.event_id === selectedEventId) ?? events[0] ?? null, [events, selectedEventId]);
  const notificationCount = sessions.reduce((sum, session) =>
    sum + (session.recommendations || []).filter((rec) => !rec.state || rec.state.status === 'new').length,
    0
  );

  useEffect(() => {
    function handleKey(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  async function refresh() {
    const response = await fetch('/api/sessions');
    setSessions(await response.json());
  }

  function selectAgent(agent) {
    setSelectedAgent(agent);
    setSelectedSessionId(null);
    setEvents([]);
    setQuery('');
    setSelectedTaskId(null);
    setSelectedEventId(null);
  }

  async function selectSession(sessionId) {
    const target = sessions.find((session) => session.session_id === sessionId);
    if (target?.framework) setSelectedAgent(target.framework);
    setSelectedSessionId(sessionId);
    setPaletteOpen(false);
    const next = await refreshEventsForSession(sessionId);
    setSelectedTaskId(null);
    setSelectedEventId(firstInspectableEventId(next));
  }

  async function refreshEventsForSession(sessionId) {
    const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/events`);
    const next = await response.json();
    // Skip the state update — and the cascade of memo recomputes + ReactFlow
    // rebuild — when the event count and last timestamp are unchanged.
    // Cheap stable-snapshot check covers the common idle case.
    setEvents((prev) => {
      if (prev.length === next.length && prev[prev.length - 1]?.event_id === next[next.length - 1]?.event_id) {
        return prev;
      }
      return next;
    });
    return next;
  }

  function selectTask(taskId) {
    setSelectedTaskId(taskId);
    const task = tasks.find((item) => item.id === taskId);
    const firstAction = buildAgentActionFlow(task?.events || [])[0];
    if (firstAction) setSelectedEventId(firstAction.event_id);
  }

  const traceActions = selectedSession
    ? h('div', { className: 'flex flex-wrap gap-3' }, [
        h('a', {
          className: 'flex items-center gap-2 rounded-xl bg-surface-container-highest px-4 py-2 font-semibold text-on-surface transition-all hover:bg-surface-container-high',
          href: `/api/sessions/${encodeURIComponent(selectedSession.session_id)}/events`
        }, [h(MaterialIcon, { className: 'text-[20px]', name: 'download' }), t.exportJson]),
        h('a', {
          className: 'flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-2 font-semibold transition-all hover:scale-[1.02] active:scale-95 inner-glow',
          href: `/sessions?q=${encodeURIComponent(selectedSession.session_id)}`
        }, [h(MaterialIcon, { className: 'text-[20px]', name: 'arrow_forward' }), t.openSession])
      ])
    : null;

  const traceArea = selectedSession
    ? h('div', { 'data-trace-area': 'mounted', key: 'trace', className: 'space-y-margin' }, [
        h(ResultBadge, { key: 'badge', session: selectedSession, t }),
        h(RunSummaryPanel, { actions: actionFlow, key: 'run-summary', selectedTask, session: selectedSession, t }),
        h('div', { className: 'grid grid-cols-1 lg:grid-cols-12 gap-gutter', key: 'body' }, [
          h('section', { className: 'lg:col-span-8 space-y-gutter' }, [
            h(TaskList, { key: 'tasks', onSelectTask: selectTask, selectedTaskId: selectedTask?.id || '', tasks, t }),
            h(TaskFlow, { actions: actionFlow, key: 'task-flow', onSelectEvent: setSelectedEventId, selectedEventId: selectedEvent?.event_id ?? null, selectedTask, t }),
            h('div', { className: 'glass-card-strong rounded-3xl p-lg' }, [
              h('span', { className: 'text-label-caps font-label-caps uppercase text-primary' }, t.evidenceTimeline),
              h('h3', { className: 'mt-2 text-h3 font-h3 tracking-tight' }, t.groupedTraceEvents)
            ]),
            groupedEvents.length === 0
              ? h('p', { className: 'glass-card rounded-3xl border-dashed p-lg text-sm text-outline' }, t.selectSession)
              : h('div', { className: 'space-y-lg', 'data-evidence-list': 'event-groups' }, groupedEvents.map((g) =>
                  h(TimelineGroup, {
                    group: g, key: g.id,
                    onSelectEvent: setSelectedEventId,
                    selectedEventId: selectedEvent?.event_id ?? null, t
                  })
                ))
          ]),
          h('aside', { className: 'lg:col-span-4 space-y-gutter' }, [
            h(Inspector, { events, selectedEvent, session: selectedSession, t })
          ])
        ])
      ])
    : h(EmptyTraceState, { key: 'empty', lang, onSelectSession: selectSession, recentSessions: recentSessionsForEmpty, t });

  return h('div', {
    className: 'min-h-screen text-on-background',
    'data-auto-refresh-events-ms': EVENT_AUTO_REFRESH_MS,
    'data-auto-refresh-sessions-ms': SESSION_AUTO_REFRESH_MS,
    'data-selected-agent': selectedAgent || '',
    'data-selected-session-id': selectedSession?.session_id || ''
  }, [
    h(Sidebar, { activeView: 'traces', key: 'sidebar' }),
    h(TopBar, { key: 'top', lang, notificationCount, onRefresh: refresh, searchQuery: query, setLang, t }),
    h('main', { className: 'ml-20 pt-16 px-8 pb-12 min-h-screen' }, [
      h('div', { className: 'mx-auto max-w-[1400px] space-y-margin' }, [
        h('header', { className: 'mb-lg flex flex-wrap items-end justify-between gap-4', key: 'head' }, [
          h('div', null, [
            h('span', { className: 'font-mono text-xs font-bold uppercase tracking-widest text-primary' }, t.eyebrow),
            h('h2', { className: 'mt-2 text-h2 font-h2 tracking-tight text-on-surface' }, t.title),
            h('p', { className: 'mt-2 max-w-2xl text-body-md text-on-surface-variant' }, t.subtitle)
          ]),
          traceActions
        ]),
        h(PickerBar, {
          agent: selectedAgent,
          agentBuckets,
          key: 'picker-bar',
          lang,
          latestSession,
          onOpenPalette: () => setPaletteOpen(true),
          onSelectAgent: selectAgent,
          onSelectSession: selectSession,
          selectedSession,
          sessionsForAgent: agentSessions,
          t
        }),
        traceArea,
        paletteOpen
          ? h(JumpToSessionPalette, {
              key: 'palette',
              lang,
              onClose: () => setPaletteOpen(false),
              onSelect: (session) => selectSession(session.session_id),
              sessions: allSessionsSorted,
              t
            })
          : null
      ])
    ])
  ]);
}
