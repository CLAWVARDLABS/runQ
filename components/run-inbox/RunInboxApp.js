'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { eventKind, percent, summarizeEvent, trustBreakdownEntries, trustScoreValue } from './format.js';

function h(type, props, ...children) {
  const normalizedChildren = children.flatMap((child) =>
    Array.isArray(child) ? React.Children.toArray(child.filter(Boolean)) : [child]
  );
  return React.createElement(type, props, ...normalizedChildren);
}

const copy = {
  zh: {
    productName: 'RunQ',
    productSubtitle: 'Agent 体验观测',
    workspace: 'Local Workspace',
    refresh: '刷新',
    languageToggle: 'English',
    notifications: '提醒',
    notificationCenter: '提醒中心',
    notificationCenterBody: '集中处理新建议、已采纳但待验证的改进项，以及已经被后续运行验证的结果。',
    pendingRecommendations: '待处理建议',
    pendingImpact: '等待验证',
    verifiedImpact: '已验证效果',
    searchPlaceholder: '搜索运行 ID / Agent / 建议',
    dataSource: '数据源',
    helpDocs: '帮助文档',
    chooseDataSource: '切换数据源',
    availableDataSources: '可用数据源',
    dataSourceEmptyTitle: '当前数据库没有运行数据',
    dataSourceEmptyBody: '这个页面正在读取 {dbPath}。如果你想看之前的 E2E 结果，请切换到有 session 的 .db；如果想生成示例数据，可以运行下面的命令。',
    demoDataCommand: 'node src/cli.js demo --db .runq/runq.db',
    eyebrowOverview: 'System Overview',
    eyebrowSessions: 'Run Telemetry',
    eyebrowAdvisor: 'Recommendation Queue',
    eyebrowSetup: 'Setup Health',
    eyebrowEvaluations: 'Evaluation Loop',
    productSections: '产品模块',
    realDataFirst: '真实数据优先',
    evaluationLoop: '评估闭环',
    recommendationQueue: '优化队列',
    setupGuide: '接入向导',
    navAgents: 'Agent',
    navSessions: '运行',
    navTraces: '追踪',
    navEvaluations: '评估',
    navRecommendations: '建议',
    navSetup: '接入',
    navDocs: '文档',
    docsTitle: '产品文档',
    docsBody: '面向使用者和集成开发者的 RunQ 快速入口。',
    docsUserGuide: '用户指南',
    docsUserBody: '从本地控制台查看 Agent 状态、运行质量、追踪证据、评估信号和建议队列。',
    docsDeveloperGuide: '开发者接入',
    docsDeveloperBody: '用 CLI 初始化 hooks、接入本地数据库、启动开发服务，并通过事件协议上报真实运行。',
    docsStartConsole: '启动控制台',
    docsStartConsoleBody: '开发 UI 时运行 Next.js 服务；查看指定数据库时运行 Run Inbox。',
    docsConnectAgents: '连接 Agent',
    docsConnectAgentsBody: '自动配置 Claude Code、Codex hooks、OpenClaw 和 Hermes 的本地采集入口。',
    docsInspectRuns: '查看运行',
    docsInspectRunsBody: '从 Agents 进入具体 Agent，再打开 Sessions 或 Traces 查看运行证据。',
    docsImproveWorkflow: '改进工作流',
    docsImproveWorkflowBody: '在 Recommendations 中采纳或忽略建议，用后续运行验证效果。',
    portfolio: 'Portfolio',
    agentsModuleBody: '从 Claude Code、Codex、OpenClaw、Hermes 的接入状态开始，而不是先看散乱运行。',
    sessionsModuleBody: '运行历史、满意度、失败/放弃、成本和验证信号集中到一个可过滤列表。',
    tracesModuleBody: '把模型、命令、文件、测试、反馈展开成证据时间线，用来解释每次结果。',
    evaluationsModuleBody: '用真实任务集评估 agent 表现，形成满意度、通过率和回归趋势。',
    recommendationsModuleBody: '把观测到的问题转成可采纳的优化建议，并追踪采纳后的效果。',
    setupModuleBody: '选择要接入的 agent，配置本地 hook、上报、隐私和健康检查。',
    setupWizardTitle: '接入 Agent',
    setupWizardBody: '选择一个 agent 类型，复制命令或让 agent 读取接入说明，完成后检查连接状态。',
    setupChooseAgent: '选择 Agent 类型',
    setupSteps: '操作步骤',
    setupSuccess: '接入成功提醒',
    commandLineSetup: '命令行接入',
    agentSelfSetup: 'Agent 自接入',
    agentSelfSetupBody: '让当前 agent 读取这段 SKILL.md 说明，并按步骤执行接入命令。',
    checkConnection: '检查连接',
    connectedNotice: '已接入。后续运行会自动进入 RunQ。',
    pendingNotice: '完成步骤后点击检查连接；成功后这里会显示 Connected。',
    agentOverview: 'Agent 总览',
    agentFleet: 'Agent 队列',
    capabilityOverview: '能力总览',
    capabilityOverviewBody: '这里是 Agent 画像，汇总该 Agent 在当前数据源中的模型、命令、验证、文件和建议能力，不代表单次 trace。',
    fileChanges: '文件变更',
    agentDetail: 'Agent 观测详情',
    selectAgent: '选择一个 Agent 查看它的运行质量、历史与建议。',
    connected: 'Connected',
    needsSetup: 'Setup Needed',
    connectedAgents: 'Connected',
    supportedAgents: '支持 Agent',
    lastSeen: '最后活动',
    totalRuns: 'Total Runs',
    confidence: 'Trust Score',
    trustScore: 'RunQ 信任分',
    trustModel: 'Trust Model',
    outcomeEvidence: 'Outcome 证据',
    failureRate: 'Failure Rate',
    runs: '运行',
    runCount: '运行总数',
    avgConfidence: '平均信任分',
    recommendations: '优化建议',
    failed: '失败',
    accepted: '已接受',
    needsReview: '需复核',
    allRuns: '全部运行',
    activity: '活动量',
    modelCalls: '模型调用',
    commandCount: '命令数',
    verificationCount: '验证数',
    realData: '本地事件库',
    noModelData: '暂无真实模型调用数据',
    tokenConsumption: 'Token 消耗与成本趋势',
    inputTokens: 'Input',
    outputTokens: 'Output',
    confidenceTrend: '信任分趋势',
    activityTrend: '命令 / 验证活动',
    runInbox: '运行收件箱',
    searchRuns: '搜索运行',
    timeline: '时间线',
    qualityInspector: '质量检查器',
    setupHealth: '接入健康度',
    eventType: '事件类型',
    searchEvents: '搜索事件',
    noRuns: '还没有采集到运行。先连接一个本地 agent hook 开始记录。',
    noRunMatch: '没有运行匹配当前过滤条件。',
    noEvents: '没有事件匹配当前过滤条件。',
    noRecommendations: '这个运行暂时没有证据支持的优化建议。',
    noAgentRunsTitle: '等待首次运行',
    noAgentRunsBody: '已接入；当前数据库还没有采集到运行。完成一次 agent 任务后这里会显示质量指标。',
    selectRun: '选择一个运行查看时间线和质量信号。',
    satisfaction: '满意度',
    details: '详情',
    eventPayload: '事件载荷',
    metadataFirst: 'metadata-first 采集',
    events: '事件',
    noSignal: '尚未记录人工或评估器判断。',
    setupUnavailable: '接入检查暂不可用。',
    fix: '修复',
    connectAction: '接入',
    configureAction: '配置',
    copied: '已复制',
    copyFailed: '复制失败',
    healthy: 'Ready',
    check: 'Check',
    scoreReasons: '评分证据',
    evidenceEvents: '证据事件',
    viewEvidence: '查看证据',
    likelyCompleted: 'Likely completed',
    needsReviewVerdict: 'Needs review',
    insufficientEvidence: 'Insufficient evidence',
    likelyFailed: 'Likely failed',
    accept: '采纳',
    dismiss: '忽略',
    stateNew: 'New',
    stateAccepted: 'Accepted',
    stateDismissed: 'Dismissed',
    impactVerified: '效果已验证',
    impactPending: '等待后续验证',
    followupRuns: '次后续运行',
    viewFollowupRuns: '查看后续运行',
    decidedAt: '处理于',
    feedbackNote: '备注',
    feedbackError: '更新建议状态失败',
    feedbackNotePlaceholder: '添加处理备注',
    runHistory: '运行历史',
    activeRecommendations: 'RunQ Advisor',
    runId: 'Run ID',
    status: '状态',
    timestamp: '时间戳',
    viewAll: 'View All',
    framework: '框架',
    advisorBody: '基于本地观测得到的优化建议，全部由真实事件驱动。',
    advisorEmpty: '当前没有需要关注的建议。',
    seeAll: '查看全部决策分析',
    realDataNote: '本地事件库 · metadata-first',
    evalsBody: '用真实任务集评估 agent 表现。下方指标全部来自当前 Agent 的本地事件。',
    evalsPassRate: '通过率',
    evalsCoverage: '验证覆盖',
    evalsAccepted: '满意度采纳',
    evalQueue: '评估队列',
    openTrace: '打开追踪',
    noEvalQueue: '当前没有需要复核的运行。',
    setupReady: 'Ready',
    setupCheck: 'Needs check',
    insightsEngine: 'Insights Engine',
    insightsBody: '正在分析本地事件流 · 真实数据驱动，没有外部上传。',
    avgSuccess: 'Avg Success',
    totalLogic: 'Total Tokens',
    computeLoad: 'Verification',
    last24h: '近 24 小时',
    last7d: '近 7 天',
    deployNew: '接入 Agent',
    filterSort: '筛选排序',
    descClaudeCode: '本地 Claude Code 终端编码',
    descCodex: 'Codex 命令行编码代理',
    descOpenClaw: '开源自主编码代理',
    descHermes: '通用 hook 适配器',
    healthReportEyebrow: 'Agent 体检',
    healthReportTitle: 'Agent 观测报告',
    healthReportBody: '一键完成接入:装好 hooks,导入历史会话,给出该 Agent 的健康度报告。完成后新 session 会自动入库。',
    runCheckup: '一键接入并体检',
    runCheckupAgain: '重新体检',
    runningCheckup: '体检中…',
    checkupResultPrefix: '已导入',
    checkupResultEventsSuffix: '条新事件,跨',
    checkupResultSessionsSuffix: '个会话',
    checkupHooksInstalledSuffix: ' · 实时 hook 已就绪',
    checkupEmpty: '未发现本地历史会话',
    checkupAbsent: 'Agent 未在本机安装',
    checkupError: '体检失败',
    sessionCount: '会话总数',
    eventTotal: '事件总数',
    timeRange: '时间跨度',
    medianTrust: 'Trust Score 中位数',
    topTools: '工具调用 Top 10',
    activityRecent: '近 7 天活跃度',
    trustDistribution: 'Trust Score 分布',
    topSessions: '最高分会话',
    bottomSessions: '最低分会话',
    inputTokens: '输入 token',
    outputTokens: '输出 token',
    noToolCalls: '暂无工具调用记录',
    noSessions: '暂无会话',
    sourceLabel: '数据源'
  },
  en: {
    productName: 'RunQ',
    productSubtitle: 'Agent Experience Observability',
    workspace: 'Local Workspace',
    refresh: 'Refresh',
    languageToggle: '中文',
    notifications: 'Notifications',
    notificationCenter: 'Notification Center',
    notificationCenterBody: 'Triage new recommendations, accepted improvements awaiting validation, and items verified by later runs.',
    pendingRecommendations: 'Pending recommendations',
    pendingImpact: 'Awaiting validation',
    verifiedImpact: 'Verified impact',
    searchPlaceholder: 'Search run ID, agent, or recommendation',
    dataSource: 'Data source',
    helpDocs: 'Help docs',
    chooseDataSource: 'Switch data source',
    availableDataSources: 'Available data sources',
    dataSourceEmptyTitle: 'Current database has no run data',
    dataSourceEmptyBody: 'This page is reading {dbPath}. Switch to a .db with sessions to inspect previous E2E results, or generate demo data with the command below.',
    demoDataCommand: 'node src/cli.js demo --db .runq/runq.db',
    eyebrowOverview: 'System Overview',
    eyebrowSessions: 'Run Telemetry',
    eyebrowAdvisor: 'Recommendation Queue',
    eyebrowSetup: 'Setup Health',
    eyebrowEvaluations: 'Evaluation Loop',
    productSections: 'Product Modules',
    realDataFirst: 'Real data first',
    evaluationLoop: 'Evaluation loop',
    recommendationQueue: 'Recommendation queue',
    setupGuide: 'Setup guide',
    navAgents: 'Agents',
    navSessions: 'Sessions',
    navTraces: 'Traces',
    navEvaluations: 'Evaluations',
    navRecommendations: 'Recommendations',
    navSetup: 'Setup',
    navDocs: 'Docs',
    docsTitle: 'Product Docs',
    docsBody: 'A practical RunQ guide for users and integration developers.',
    docsUserGuide: 'User Guide',
    docsUserBody: 'Use the local console to inspect agent status, run quality, trace evidence, evaluation signals, and recommendations.',
    docsDeveloperGuide: 'Developer Integration',
    docsDeveloperBody: 'Initialize hooks, connect the local database, start the development server, and report real runs through the event protocol.',
    docsStartConsole: 'Start the console',
    docsStartConsoleBody: 'Run the Next.js server while developing UI, or Run Inbox against a specific database.',
    docsConnectAgents: 'Connect agents',
    docsConnectAgentsBody: 'Configure local collection for Claude Code, Codex hooks, OpenClaw, and Hermes.',
    docsInspectRuns: 'Inspect runs',
    docsInspectRunsBody: 'Start from Agents, open an agent, then use Sessions or Traces to inspect evidence.',
    docsImproveWorkflow: 'Improve workflows',
    docsImproveWorkflowBody: 'Accept or dismiss recommendations, then use later runs to verify whether the change helped.',
    portfolio: 'Portfolio',
    agentsModuleBody: 'Start from Claude Code, Codex, OpenClaw, and Hermes connection health instead of raw run rows.',
    sessionsModuleBody: 'Run history, satisfaction, failures, cost, and verification signals live in one filterable table.',
    tracesModuleBody: 'Model calls, commands, files, tests, and feedback expand into an evidence timeline.',
    evaluationsModuleBody: 'Evaluate agents against real task suites and track satisfaction, pass rate, and regressions.',
    recommendationsModuleBody: 'Convert observed issues into actionable recommendations and track their impact.',
    setupModuleBody: 'Choose an agent integration and configure local hooks, reporting, privacy, and health checks.',
    setupWizardTitle: 'Connect Agent',
    setupWizardBody: 'Choose an agent type, copy a command or hand the setup instructions to the agent, then check connection status.',
    setupChooseAgent: 'Choose Agent Type',
    setupSteps: 'Setup Steps',
    setupSuccess: 'Connection Success',
    commandLineSetup: 'Command-line setup',
    agentSelfSetup: 'Agent self-setup',
    agentSelfSetupBody: 'Ask the current agent to read this SKILL.md instruction and run the setup command.',
    checkConnection: 'Check Connection',
    connectedNotice: 'Connected. Future runs will be captured by RunQ.',
    pendingNotice: 'Run the setup steps, then check the connection. Connected agents will show Ready here.',
    agentOverview: 'Agent Overview',
    agentFleet: 'Agent Fleet',
    capabilityOverview: 'Capability Overview',
    capabilityOverviewBody: 'This is the agent profile across the current data source: model, command, verification, file, and recommendation capability. It is not a single trace.',
    fileChanges: 'File changes',
    agentDetail: 'Agent Observability Detail',
    selectAgent: 'Select an agent to inspect quality, history, and recommendations.',
    connected: 'Connected',
    needsSetup: 'Setup Needed',
    connectedAgents: 'Connected',
    supportedAgents: 'Supported Agents',
    lastSeen: 'Last seen',
    totalRuns: 'Total Runs',
    confidence: 'Trust Score',
    trustScore: 'RunQ Trust Score',
    trustModel: 'Trust Model',
    outcomeEvidence: 'Outcome evidence',
    failureRate: 'Failure Rate',
    runs: 'runs',
    runCount: 'Total runs',
    avgConfidence: 'Avg trust score',
    recommendations: 'Recommendations',
    failed: 'failed',
    accepted: 'Accepted',
    needsReview: 'Needs review',
    allRuns: 'All runs',
    activity: 'Activity',
    modelCalls: 'Model calls',
    commandCount: 'Commands',
    verificationCount: 'Verifications',
    realData: 'From local event store',
    noModelData: 'No real model-call data yet',
    tokenConsumption: 'Token consumption & cost trend',
    inputTokens: 'Input',
    outputTokens: 'Output',
    confidenceTrend: 'Trust score trend',
    activityTrend: 'Command / verification activity',
    runInbox: 'Run Inbox',
    searchRuns: 'Search runs',
    timeline: 'Timeline',
    qualityInspector: 'Quality Inspector',
    setupHealth: 'Setup Health',
    eventType: 'Event type',
    searchEvents: 'Search events',
    noRuns: 'No runs captured yet. Connect a local agent hook to start collecting.',
    noRunMatch: 'No runs match the current filters.',
    noEvents: 'No events match the current filters.',
    noRecommendations: 'No evidence-backed workflow recommendation for this run yet.',
    noAgentRunsTitle: 'Waiting for first run',
    noAgentRunsBody: 'Connected, but this database has not captured a run yet. Run one agent task and quality metrics will appear here.',
    selectRun: 'Select a run to inspect timeline and quality signals.',
    satisfaction: 'Satisfaction',
    details: 'Details',
    eventPayload: 'Event payload',
    metadataFirst: 'metadata-first telemetry',
    events: 'events',
    noSignal: 'No human or evaluator judgment recorded yet.',
    setupUnavailable: 'Setup checks are not available yet.',
    fix: 'Fix',
    connectAction: 'Connect',
    configureAction: 'Configure',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    healthy: 'Ready',
    check: 'Check',
    scoreReasons: 'Score evidence',
    evidenceEvents: 'evidence events',
    viewEvidence: 'View evidence',
    likelyCompleted: 'Likely completed',
    needsReviewVerdict: 'Needs review',
    insufficientEvidence: 'Insufficient evidence',
    likelyFailed: 'Likely failed',
    accept: 'Accept',
    dismiss: 'Dismiss',
    stateNew: 'New',
    stateAccepted: 'Accepted',
    stateDismissed: 'Dismissed',
    impactVerified: 'Impact verified',
    impactPending: 'Awaiting follow-up',
    followupRuns: 'follow-up runs',
    viewFollowupRuns: 'View follow-up runs',
    decidedAt: 'Decided at',
    feedbackNote: 'Note',
    feedbackError: 'Failed to update recommendation state',
    feedbackNotePlaceholder: 'Add a decision note',
    runHistory: 'Run history',
    activeRecommendations: 'RunQ Advisor',
    runId: 'Run ID',
    status: 'Status',
    timestamp: 'Timestamp',
    viewAll: 'View all',
    framework: 'Framework',
    advisorBody: 'Optimization suggestions derived entirely from local observed events.',
    advisorEmpty: 'No advisory items right now.',
    seeAll: 'See all decision analyses',
    realDataNote: 'Local event store · metadata-first',
    evalsBody: 'Evaluate agents against real task suites. Metrics below come from local events for the selected agent.',
    evalsPassRate: 'Pass rate',
    evalsCoverage: 'Verification coverage',
    evalsAccepted: 'Satisfaction accepted',
    evalQueue: 'Evaluation queue',
    openTrace: 'Open trace',
    noEvalQueue: 'No runs need review right now.',
    setupReady: 'Ready',
    setupCheck: 'Needs check',
    insightsEngine: 'Insights Engine',
    insightsBody: 'Analyzing the local event stream · powered entirely by your captured runs.',
    avgSuccess: 'Avg Success',
    totalLogic: 'Total Tokens',
    computeLoad: 'Verifications',
    last24h: 'Last 24h',
    last7d: 'Last 7d',
    deployNew: 'Connect Agent',
    filterSort: 'Filter & Sort',
    descClaudeCode: 'Claude Code terminal coding agent',
    descCodex: 'OpenAI Codex code automation',
    descOpenClaw: 'Open-source autonomous coding agent',
    descHermes: 'Generic hook adapter',
    healthReportEyebrow: 'Agent Check-up',
    healthReportTitle: 'Agent Health Report',
    healthReportBody: 'One-click onboarding: install hooks, backfill historical sessions, and surface a per-agent observation report. Future sessions stream in automatically.',
    runCheckup: 'Connect & run check-up',
    runCheckupAgain: 'Re-run check-up',
    runningCheckup: 'Running…',
    checkupResultPrefix: 'Imported',
    checkupResultEventsSuffix: ' new event(s) across',
    checkupResultSessionsSuffix: 'session(s)',
    checkupHooksInstalledSuffix: ' · live hook ready',
    checkupEmpty: 'No historical sessions found locally',
    checkupAbsent: 'Agent is not installed on this machine',
    checkupError: 'Check-up failed',
    sessionCount: 'Sessions',
    eventTotal: 'Events',
    timeRange: 'Time range',
    medianTrust: 'Median trust score',
    topTools: 'Top 10 tools',
    activityRecent: 'Last 7 days activity',
    trustDistribution: 'Trust score distribution',
    topSessions: 'Top sessions',
    bottomSessions: 'Lowest scoring sessions',
    inputTokens: 'Input tokens',
    outputTokens: 'Output tokens',
    noToolCalls: 'No tool calls recorded yet',
    noSessions: 'No sessions yet',
    sourceLabel: 'Source'
  }
};

const knownAgents = [
  ['claude_code', 'Claude Code', 'Anthropic', 'claude', 'from-[#D97757] to-[#8B4A2F]'],
  ['codex', 'Codex', 'OpenAI', 'openai', 'from-[#111827] to-[#0B0F19]'],
  ['openclaw', 'OpenClaw', 'OSS', 'openclaw', 'from-slate-700 to-slate-900'],
  ['hermes', 'Hermes', 'Nous', 'hermes', 'from-fuchsia-500 to-pink-600']
];

const SESSION_AUTO_REFRESH_MS = 10000;
const EVENT_AUTO_REFRESH_MS = 3000;

const sidebarItems = [
  { href: '/agents', viewKey: 'agents', icon: 'dashboard' },
  { href: '/sessions', viewKey: 'sessions', icon: 'smart_toy' },
  { href: '/traces', viewKey: 'traces', icon: 'timeline' },
  { href: '/recommendations', viewKey: 'recommendations', icon: 'monitoring' },
  { href: '/setup', viewKey: 'setup', icon: 'settings' }
];

function normalizeLang(lang) { return lang === 'en' ? 'en' : 'zh'; }
function getStoredLang() { if (typeof window === 'undefined') return null; return window.localStorage.getItem('runq.lang'); }
function setStoredLang(lang) { if (typeof window !== 'undefined') window.localStorage.setItem('runq.lang', lang); }
function apiDbQuery(dbPath) { return dbPath ? `?db=${encodeURIComponent(dbPath)}` : ''; }
function appendDbParam(href, dbPath) {
  if (!dbPath || href.startsWith('http') || href.startsWith('#')) return href;
  const joiner = href.includes('?') ? '&' : '?';
  return `${href}${joiner}db=${encodeURIComponent(dbPath)}`;
}
function switchDataSource(dbPath) {
  if (typeof window === 'undefined' || !dbPath) return;
  const next = new URL(window.location.href);
  next.searchParams.set('db', dbPath);
  window.location.href = next.toString();
}

function MaterialIcon({ name, className = '', filled = false, style }) {
  return h('span', {
    'aria-hidden': 'true',
    className: ['material-symbols-outlined', filled ? 'filled' : '', className].filter(Boolean).join(' '),
    'data-icon': name,
    style
  }, name);
}

function RunqLogo({ className = 'h-10 w-10' }) {
  return h('svg', {
    'aria-hidden': 'true',
    className,
    'data-logo': 'runq',
    viewBox: '0 0 128 128'
  }, [
    h('defs', null, [
      h('linearGradient', { id: 'runq-mark-bg', gradientUnits: 'userSpaceOnUse', x1: '16', x2: '116', y1: '12', y2: '118' }, [
        h('stop', { stopColor: '#111827' }),
        h('stop', { offset: '1', stopColor: '#0050CB' })
      ]),
      h('linearGradient', { id: 'runq-mark-orbit', gradientUnits: 'userSpaceOnUse', x1: '26', x2: '102', y1: '30', y2: '100' }, [
        h('stop', { stopColor: '#00EEFC' }),
        h('stop', { offset: '1', stopColor: '#0066FF' })
      ])
    ]),
    h('rect', { fill: 'url(#runq-mark-bg)', height: '128', rx: '28', width: '128' }),
    h('path', { d: 'M30 66c0-21.5 15.7-38 37-38 17.6 0 30.8 11.4 34.4 27.7', fill: 'none', stroke: 'url(#runq-mark-orbit)', strokeLinecap: 'round', strokeWidth: '10' }),
    h('path', { d: 'M98 65c0 21.5-15.7 38-37 38-18 0-31.5-11.9-34.7-28.7', fill: 'none', stroke: '#F8FAFC', strokeLinecap: 'round', strokeWidth: '10' }),
    h('path', { d: 'M75 87l18 18', stroke: '#F8FAFC', strokeLinecap: 'round', strokeWidth: '10' }),
    h('circle', { cx: '67', cy: '66', fill: '#F8FAFC', r: '16' }),
    h('circle', { cx: '67', cy: '66', fill: '#0050CB', r: '7' }),
    h('circle', { cx: '101', cy: '54', fill: '#22C55E', r: '8' }),
    h('path', { d: 'M97.5 54.2l2.4 2.5 5.1-6', fill: 'none', stroke: '#F8FAFC', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2.8' })
  ]);
}

function AgentLogo({ logo, className = 'h-6 w-6' }) {
  const common = {
    'aria-hidden': 'true',
    className,
    'data-logo': logo
  };
  if (logo === 'openai') {
    return h('svg', { ...common, fill: 'none', viewBox: '0 0 64 64' }, [
      h('path', {
        d: 'M32 9.5c5.1-5.6 14.5-2.7 15.7 4.8 7.5 1.2 10.4 10.6 4.8 15.7 5.6 5.1 2.7 14.5-4.8 15.7-1.2 7.5-10.6 10.4-15.7 4.8-5.1 5.6-14.5 2.7-15.7-4.8-7.5-1.2-10.4-10.6-4.8-15.7-5.6-5.1-2.7-14.5 4.8-15.7C17.5 6.8 26.9 3.9 32 9.5Z',
        stroke: 'currentColor',
        strokeLinejoin: 'round',
        strokeWidth: '5'
      }),
      h('path', {
        d: 'M20.5 23.5 32 17l11.5 6.5v13L32 43l-11.5-6.5v-13Z',
        stroke: 'currentColor',
        strokeLinejoin: 'round',
        strokeWidth: '4'
      })
    ]);
  }
  if (logo === 'claude') {
    return h('span', { ...common, className: `${className} grid place-items-center font-serif text-[28px] leading-none` }, '✶');
  }
  if (logo === 'openclaw') {
    return h('svg', { ...common, fill: 'none', viewBox: '0 0 120 120' }, [
      h('path', {
        d: 'M60 10 C30 10 15 35 15 55 C15 75 30 95 45 100 L45 110 L55 110 L55 100 C55 100 60 102 65 100 L65 110 L75 110 L75 100 C90 95 105 75 105 55 C105 35 90 10 60 10Z',
        fill: 'currentColor'
      }),
      h('path', {
        d: 'M20 45 C5 40 0 50 5 60 C10 70 20 65 25 55 C28 48 25 45 20 45Z',
        fill: 'currentColor'
      }),
      h('path', {
        d: 'M100 45 C115 40 120 50 115 60 C110 70 100 65 95 55 C92 48 95 45 100 45Z',
        fill: 'currentColor'
      }),
      h('path', {
        d: 'M45 15 Q35 5 30 8',
        stroke: 'currentColor',
        strokeLinecap: 'round',
        strokeWidth: '5'
      }),
      h('path', {
        d: 'M75 15 Q85 5 90 8',
        stroke: 'currentColor',
        strokeLinecap: 'round',
        strokeWidth: '5'
      }),
      h('circle', { cx: '45', cy: '35', fill: '#050810', r: '6' }),
      h('circle', { cx: '75', cy: '35', fill: '#050810', r: '6' }),
      h('circle', { cx: '46', cy: '34', fill: '#00e5cc', r: '2' }),
      h('circle', { cx: '76', cy: '34', fill: '#00e5cc', r: '2' })
    ]);
  }
  if (logo === 'hermes') {
    return h('span', { ...common, className: `${className} grid place-items-center font-serif text-[26px] leading-none` }, '☤');
  }
  return h(MaterialIcon, { className, name: 'smart_toy' });
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

function statusPill(connected, t) {
  const tone = connected
    ? { wrapper: 'bg-green-50 text-green-600', dot: 'bg-green-500', label: t.connected, animate: true }
    : { wrapper: 'bg-amber-50 text-amber-600', dot: 'bg-amber-500', label: t.needsSetup, animate: false };
  return h('div', { className: `flex items-center gap-2 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${tone.wrapper}` }, [
    h('span', { className: `inline-block h-1.5 w-1.5 rounded-full status-glow ${tone.dot} ${tone.animate ? 'animate-pulse' : ''}` }),
    tone.label
  ]);
}

function runMatchesFilter(session, filter) {
  const sat = session.satisfaction?.label;
  const trust = trustScoreValue(session.quality) / 100;
  if (filter === 'needs_review') return trust < 0.7 || sat === 'needs_review' || sat === 'abandoned';
  if (filter === 'accepted') return sat === 'accepted' || trust >= 0.85;
  if (filter === 'failed') return sat === 'abandoned' || (session.quality?.reasons || []).some((r) => r.includes('failed'));
  return true;
}

function runMatchesSearch(session, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    session.session_id, session.framework, session.satisfaction?.label,
    ...(session.quality?.reasons || []),
    ...(session.recommendations || []).flatMap((r) => [r.title, r.category, r.summary])
  ].filter(Boolean).join(' ').toLowerCase().includes(normalized);
}

function eventMatchesSearch(event, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [event.event_type, event.framework, event.source, summarizeEvent(event), JSON.stringify(event.payload || {})]
    .join(' ').toLowerCase().includes(normalized);
}

function calcStats(sessions) {
  const total = sessions.length;
  const failed = sessions.filter((s) => runMatchesFilter(s, 'failed')).length;
  const avgConfidence = total ? sessions.reduce((sum, s) => sum + trustScoreValue(s.quality), 0) / total / 100 : 0;
  const recommendationCount = sessions.reduce((sum, s) => sum + (s.recommendations || []).length, 0);
  const telemetry = sessions.reduce((acc, s) => {
    const t = s.telemetry || {};
    acc.modelCalls += Number(t.model_call_count || 0);
    acc.inputTokens += Number(t.input_tokens || 0);
    acc.outputTokens += Number(t.output_tokens || 0);
    acc.totalTokens += Number(t.total_tokens || 0);
    acc.commands += Number(t.command_count || 0);
    acc.verifications += Number(t.verification_count || 0);
    acc.failedVerifications += Number(t.verification_failed_count || 0);
    acc.fileChanges += Number(t.file_change_count || 0);
    return acc;
  }, { modelCalls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, commands: 0, verifications: 0, failedVerifications: 0, fileChanges: 0 });
  return { total, failed, failureRate: total ? failed / total : 0, avgConfidence, recommendationCount, telemetry };
}

function agentMeta(agentId) {
  return knownAgents.find(([id]) => id === agentId) || [agentId, agentId, 'Custom', 'auto_awesome', 'from-slate-500 to-slate-700'];
}

function knownAgentIdForSetupCheck(check) {
  if (check?.agent_id) return check.agent_id;
  const normalizedLabel = check?.label?.toLowerCase();
  return knownAgents.find(([, label]) => label.toLowerCase() === normalizedLabel)?.[0] ?? null;
}

function setupCheckForAgent(setupHealth, agentId) {
  return (setupHealth?.checks || []).find((check) => knownAgentIdForSetupCheck(check) === agentId) ?? null;
}

function defaultSetupCommand(agentId) {
  const target = agentId === 'claude_code' ? 'claude-code' : agentId;
  return `node src/cli.js init ${target} --db .runq/runq.db`;
}

function setupCommandForAgent(setupHealth, agentId) {
  const check = setupCheckForAgent(setupHealth, agentId);
  return check?.remediation && !check.remediation.startsWith('No action')
    ? check.remediation
    : defaultSetupCommand(agentId);
}

function setupSkillForAgent(agent, command) {
  return [
    '# RunQ Agent Setup',
    '',
    `You are setting up ${agent[1]} for RunQ local run-quality capture.`,
    `Run this command from the RunQ repo root: ${command}`,
    'Then run: node src/cli.js doctor --db .runq/runq.db',
    'If the agent status is not ok, report the exact doctor output.'
  ].join('\n');
}

function deriveAgents(sessions, setupHealth) {
  const agentChecks = (setupHealth?.checks || [])
    .map((check) => ({ check, agentId: knownAgentIdForSetupCheck(check) }))
    .filter(({ agentId }) => agentId);
  const connectedSetupIds = agentChecks
    .filter(({ check }) => check.status === 'ok')
    .map(({ agentId }) => agentId);
  const sessionAgentIds = sessions.map((s) => s.framework).filter(Boolean);
  // Surface an agent on the page only if it's actually installed locally (hook setup found)
  // or has produced real sessions in the DB. Agents whose home dir is missing
  // (status === 'absent') are hidden until they appear.
  const ids = new Set([...sessionAgentIds, ...connectedSetupIds]);
  const setupByAgentId = new Map(agentChecks.map(({ check, agentId }) => [agentId, check]));
  return Array.from(ids).map((id) => {
    const [, displayName, brand, logo, gradient] = agentMeta(id);
    const agentSessions = sessions.filter((s) => s.framework === id);
    const stats = calcStats(agentSessions);
    const setup = setupByAgentId.get(id);
    const connected = setup?.status === 'ok' || agentSessions.length > 0;
    return {
      agent_id: id, display_name: displayName, brand, logo, gradient,
      sessions: agentSessions, stats, setup, connected,
      last_seen: agentSessions[0]?.last_event_at || setup?.summary || null,
      recommendation_count: agentSessions.reduce((sum, s) => sum + (s.recommendations || []).length, 0)
    };
  }).sort((a, b) => {
    if (a.connected !== b.connected) return a.connected ? -1 : 1;
    return a.display_name.localeCompare(b.display_name);
  });
}

function groupRunsForChart(sessions) {
  const sorted = [...sessions].sort((a, b) => (a.started_at || a.last_event_at || '').localeCompare(b.started_at || b.last_event_at || ''));
  return sorted.slice(-7).map((session, i) => ({
    label: (session.started_at || session.last_event_at || '').slice(5, 10) || `#${i + 1}`,
    input: Number(session.telemetry?.input_tokens || 0),
    output: Number(session.telemetry?.output_tokens || 0),
    commands: Number(session.telemetry?.command_count || 0),
    verifications: Number(session.telemetry?.verification_count || 0),
    confidence: trustScoreValue(session.quality) / 100,
    activity: Number(session.telemetry?.command_count || 0) + Number(session.telemetry?.verification_count || 0)
  }));
}

function verdictFor(session, t) {
  const score = trustScoreValue(session?.quality) / 100;
  const hasSat = Boolean(session?.satisfaction?.label);
  if (score >= 0.8) return { label: t.likelyCompleted, tone: 'good' };
  if (score >= 0.5) return { label: t.needsReviewVerdict, tone: 'warn' };
  if (!hasSat && (session?.quality?.verification_coverage || 0) === 0) return { label: t.insufficientEvidence, tone: 'neutral' };
  return { label: t.likelyFailed, tone: 'bad' };
}

function satisfactionTone(label) {
  if (label === 'accepted') return 'good';
  if (label === 'corrected' || label === 'rerun' || label === 'needs_review') return 'warn';
  if (label === 'abandoned' || label === 'escalated') return 'bad';
  return 'neutral';
}

function statusDot(tone) {
  const map = { good: 'bg-green-500', warn: 'bg-amber-500', bad: 'bg-error', info: 'bg-primary-container', neutral: 'bg-outline' };
  return h('span', { className: `inline-block h-1.5 w-1.5 rounded-full ${map[tone] || map.neutral}` });
}

/* ---------------- Shell ---------------- */

function Sidebar({ activeView, dbPath, t }) {
  return h('nav', {
    className: 'fixed left-0 top-0 z-50 hidden h-screen w-20 flex-col items-center border-r border-white/20 bg-white/80 py-8 shadow-2xl shadow-blue-500/5 backdrop-blur-xl sm:flex'
  }, [
    h('a', {
      'aria-label': 'RunQ Agents',
      className: 'mb-12 rounded-2xl hover:scale-105 transition-transform duration-200',
      href: appendDbParam('/agents', dbPath),
      key: 'logo'
    }, h(RunqLogo, { className: 'h-11 w-11' })),
    h('div', { className: 'flex flex-1 flex-col gap-8', key: 'nav-items' }, sidebarItems.map((item) => {
      const active = item.viewKey === activeView;
      return h('a', {
        className: active
          ? 'rounded-xl bg-primary/10 p-3 text-primary-container shadow-[0_0_15px_rgba(0,102,255,0.3)] hover:scale-105 transition-transform cursor-pointer'
          : 'p-3 text-slate-400 hover:text-slate-600 hover:scale-105 transition-all cursor-pointer text-center',
        href: appendDbParam(item.href, dbPath),
        key: item.viewKey
      }, [
        h(MaterialIcon, { className: 'text-[22px]', filled: active, name: item.icon, key: 'icon' }),
        h('span', { className: 'sr-only', key: 'label' }, t['nav' + item.viewKey.charAt(0).toUpperCase() + item.viewKey.slice(1)] || item.viewKey)
      ]);
    })),
    h('div', { className: 'mt-auto flex flex-col items-center gap-6', key: 'footer' }, [
      h('a', {
        className: 'p-3 text-slate-400 hover:text-slate-600 hover:scale-105 transition-all cursor-pointer',
        href: appendDbParam('/evaluations', dbPath),
        key: 'evals'
      }, [
        h(MaterialIcon, { className: 'text-[22px]', name: 'grading', key: 'i' }),
        h('span', { className: 'sr-only', key: 'l' }, t.navEvaluations)
      ]),
      h('a', {
        className: activeView === 'docs'
          ? 'rounded-xl bg-primary/10 p-3 text-primary-container shadow-[0_0_15px_rgba(0,102,255,0.3)] hover:scale-105 transition-transform cursor-pointer'
          : 'p-3 text-slate-400 hover:text-slate-600 hover:scale-105 transition-all cursor-pointer',
        href: appendDbParam('/docs', dbPath),
        key: 'docs'
      }, [
        h(MaterialIcon, { className: 'text-[22px]', filled: activeView === 'docs', name: 'menu_book', key: 'i' }),
        h('span', { className: 'sr-only', key: 'l' }, t.navDocs)
      ]),
      h('div', { className: 'h-10 w-10 grid place-items-center rounded-full bg-gradient-to-br from-primary to-secondary-container text-white text-[11px] font-bold border-2 border-primary-fixed' }, 'YOU')
    ])
  ]);
}

function MobileNav({ activeView, dbPath, t }) {
  const items = [
    ...sidebarItems,
    { href: '/evaluations', viewKey: 'evaluations', icon: 'grading' },
    { href: '/docs', viewKey: 'docs', icon: 'menu_book' }
  ];
  return h('nav', {
    className: 'fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-white/30 bg-white/90 px-2 py-2 shadow-2xl shadow-blue-500/10 backdrop-blur-xl sm:hidden'
  }, items.map((item) => {
    const active = item.viewKey === activeView;
    return h('a', {
      className: active
        ? 'grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary-container'
        : 'grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100',
      href: appendDbParam(item.href, dbPath),
      key: item.viewKey
    }, [
      h(MaterialIcon, { className: 'text-[21px]', filled: active, name: item.icon, key: 'icon' }),
      h('span', { className: 'sr-only', key: 'label' }, t['nav' + item.viewKey.charAt(0).toUpperCase() + item.viewKey.slice(1)] || item.viewKey)
    ]);
  }));
}

function TopBar({ t, lang, setLang, onRefresh, activeView, selectedAgent, notificationCount = 0, notificationHref = '/recommendations', searchQuery = '', dbPath = '', dataSources = [] }) {
  const moduleLabel = {
    agents: t.navAgents,
    sessions: t.navSessions,
    traces: t.navTraces,
    evaluations: t.navEvaluations,
    recommendations: t.navRecommendations,
    setup: t.navSetup,
    docs: t.navDocs
  }[activeView] || t.workspace;
  const contextLabel = selectedAgent && (activeView === 'sessions' || activeView === 'evaluations')
    ? `${moduleLabel} / ${selectedAgent.display_name}`
    : moduleLabel;
  return h('header', {
    className: 'fixed top-0 right-0 left-0 z-40 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/80 px-4 py-3 backdrop-blur-md sm:left-20 sm:h-16 sm:flex-nowrap sm:px-8 sm:py-0'
  }, [
    h('div', { className: 'flex flex-col gap-0.5', key: 'left' }, [
      h('h1', { className: 'font-sans text-sm font-semibold uppercase tracking-widest text-primary' }, `${t.productName} Console`),
      h('p', { className: 'flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500' }, [
        h('span', { key: 'context' }, contextLabel),
        dbPath ? h('span', {
          className: 'hidden max-w-[280px] truncate rounded-full bg-surface-container-low px-2 py-0.5 font-mono text-[10px] text-slate-500 lg:inline-block',
          key: 'db',
          title: `${t.dataSource}: ${dbPath}`
        }, dbPath) : null
      ])
    ]),
    h('div', { className: 'flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-4', key: 'right' }, [
      h('form', { action: '/sessions', className: 'relative hidden min-w-0 sm:block', key: 'search', method: 'get' }, [
        h(MaterialIcon, { className: 'absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 scale-75', name: 'search' }),
        dbPath ? h('input', { name: 'db', type: 'hidden', value: dbPath }) : null,
        h('input', {
          defaultValue: searchQuery,
          className: 'w-64 rounded-full border-none bg-surface-container-low py-1.5 pl-10 pr-4 text-xs transition-all focus:ring-2 focus:ring-primary',
          name: 'q',
          placeholder: t.searchPlaceholder,
          type: 'search'
        })
      ]),
      dataSources.length > 0 ? h('label', { className: 'relative hidden min-w-[180px] lg:block', key: 'datasource', title: `${t.dataSource}: ${dbPath}` }, [
        h('span', { className: 'sr-only' }, t.chooseDataSource),
        h('select', {
          'aria-label': t.chooseDataSource,
          className: 'w-full appearance-none rounded-full border-none bg-surface-container-low py-1.5 pl-3 pr-8 text-xs font-medium text-slate-600 outline-none transition-all focus:ring-2 focus:ring-primary',
          onChange: (event) => switchDataSource(event.target.value),
          value: dbPath
        }, dataSources.map((source) =>
          h('option', { key: source.path, value: source.path }, `${source.label} · ${source.session_count}`)
        )),
        h(MaterialIcon, { className: 'pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-slate-400', name: 'database' })
      ]) : null,
      h('div', { className: 'flex gap-2', key: 'actions' }, [
        h('button', {
          className: 'p-2 text-slate-500 hover:bg-slate-100/50 rounded-lg transition-all',
          onClick: onRefresh,
          title: t.refresh,
          type: 'button'
        }, h(MaterialIcon, { name: 'refresh' })),
        h('button', {
          className: 'p-2 text-slate-500 hover:bg-slate-100/50 rounded-lg transition-all',
          onClick: () => setLang(lang === 'en' ? 'zh' : 'en'),
          title: t.languageToggle,
          type: 'button'
        }, h(MaterialIcon, { name: 'language' })),
        h('a', {
          'aria-label': `${t.notifications} ${notificationCount}`,
          'data-action': 'open-notifications',
          className: 'p-2 text-slate-500 hover:bg-slate-100/50 rounded-lg transition-all relative',
          href: notificationHref,
          title: `${t.notifications} ${notificationCount}`
        }, [
          h(MaterialIcon, { name: 'notifications', key: 'i' }),
          notificationCount > 0
            ? h('span', { className: 'absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full border-2 border-white bg-primary px-1 text-[9px] font-bold leading-none text-white', key: 'd' }, notificationCount > 9 ? '9+' : String(notificationCount))
            : null
        ])
      ])
    ])
  ]);
}

/* ---------------- Page Header ---------------- */

function PageHeader({ eyebrow, title, subtitle, actions }) {
  return h('header', { className: 'flex flex-wrap justify-between items-end gap-4 mb-lg' }, [
    h('div', null, [
      h('span', { className: 'font-mono text-xs font-bold tracking-widest uppercase text-primary' }, eyebrow),
      h('h2', { className: 'mt-2 text-h2 font-h2 text-on-surface tracking-tight' }, title),
      subtitle ? h('p', { className: 'mt-2 text-body-md text-on-surface-variant max-w-2xl' }, subtitle) : null
    ].filter(Boolean)),
    actions ? h('div', { className: 'flex gap-3' }, actions) : null
  ].filter(Boolean));
}

/* ---------------- Agent Cards ---------------- */

function AgentCardActions({ agent, onOpenSetupWizard, t }) {
  const actionClass = 'grid h-10 w-10 place-items-center rounded-xl border border-outline-variant/30 bg-white/70 text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30';
  return h('div', { className: 'flex items-center gap-2 pt-1' }, [
    h('a', {
      'aria-label': `${agent.display_name} ${t.details}`,
      'data-action': 'open-agent-detail',
      'data-agent-id': agent.agent_id,
      className: actionClass,
      href: `/agents/${encodeURIComponent(agent.agent_id)}/sessions`,
      title: t.details
    }, h(MaterialIcon, { className: 'text-[20px]', name: 'arrow_forward' })),
    h('a', {
      'aria-label': `${agent.display_name} ${t.recommendations}`,
      'data-action': 'open-agent-recommendations',
      'data-agent-id': agent.agent_id,
      className: actionClass,
      href: `/agents/${encodeURIComponent(agent.agent_id)}/recommendations`,
      title: t.recommendations
    }, h(MaterialIcon, { className: 'text-[20px]', name: 'monitoring' })),
    h('a', {
      'aria-label': `${agent.display_name} ${t.navEvaluations}`,
      'data-action': 'open-agent-evaluations',
      'data-agent-id': agent.agent_id,
      className: actionClass,
      href: `/agents/${encodeURIComponent(agent.agent_id)}/evaluations`,
      title: t.navEvaluations
    }, h(MaterialIcon, { className: 'text-[20px]', name: 'grading' })),
    h('a', {
      'aria-label': `${agent.display_name} ${t.healthReportTitle}`,
      'data-action': 'open-agent-health-report',
      'data-agent-id': agent.agent_id,
      className: actionClass,
      href: `/agents/${encodeURIComponent(agent.agent_id)}/health-report`,
      title: t.healthReportTitle
    }, h(MaterialIcon, { className: 'text-[20px]', name: 'health_and_safety' })),
    h('a', {
      'aria-label': `${agent.display_name} ${t.navSetup}`,
      'data-action': 'open-agent-setup-wizard',
      'data-agent-id': agent.agent_id,
      className: actionClass,
      href: `/agents/${encodeURIComponent(agent.agent_id)}/setup`,
      onClick: (event) => {
        event.preventDefault();
        onOpenSetupWizard?.(agent.agent_id);
      },
      title: t.navSetup
    }, h(MaterialIcon, { className: 'text-[20px]', name: 'settings' }))
  ]);
}

function AgentCard({ agent, t, accent, description, onOpenSetupWizard }) {
  const stats = agent.stats;
  const failureRate = stats.total ? stats.failed / stats.total : 0;
  const confidencePct = Math.round(stats.avgConfidence * 100);
  return h('div', {
    className: [
      'glass-card p-6 rounded-3xl flex flex-col gap-6 group hover:translate-y-[-4px] transition-all duration-300',
      accent ? 'shimmer-border' : ''
    ].filter(Boolean).join(' ')
  }, [
    h('div', { className: 'flex justify-between items-start' }, [
      h('div', { className: `w-12 h-12 rounded-2xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center text-white` },
        h(AgentLogo, { className: 'h-7 w-7 text-white', logo: agent.logo })
      ),
      h('div', { className: `flex items-center gap-2 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${agent.connected ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}` }, [
        h('span', { className: `w-1.5 h-1.5 rounded-full status-glow ${agent.connected ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}` }),
        agent.connected ? t.connected : t.needsSetup
      ])
    ]),
    h('div', null, [
      h('h3', { className: 'font-h3 text-lg' }, agent.display_name),
      h('p', { className: 'text-slate-500 text-xs mt-1' }, description)
    ]),
    agent.connected && stats.total === 0
      ? h('div', { className: 'space-y-4' }, [
          h('div', { className: 'flex justify-between items-end' }, [
            h('span', { className: 'text-slate-400 text-xs uppercase font-bold tracking-tighter' }, t.totalRuns),
            h('span', { className: 'font-mono text-sm font-semibold' }, '0')
          ]),
          h('div', { className: 'rounded-2xl border border-dashed border-outline-variant/50 bg-white/60 p-3' }, [
            h('p', { className: 'text-xs font-semibold text-on-surface' }, t.noAgentRunsTitle),
            h('p', { className: 'mt-1 text-xs leading-5 text-on-surface-variant' }, t.noAgentRunsBody)
          ]),
          h(AgentCardActions, { agent, onOpenSetupWizard, t })
        ])
      : agent.connected
      ? h('div', { className: 'space-y-4' }, [
          h('div', { className: 'flex justify-between items-end' }, [
            h('span', { className: 'text-slate-400 text-xs uppercase font-bold tracking-tighter' }, t.totalRuns),
            h('span', { className: 'font-mono text-sm font-semibold' }, stats.total.toLocaleString())
          ]),
          h('div', { className: 'space-y-1.5' }, [
            h('div', { className: 'flex justify-between text-[10px] font-bold uppercase text-slate-400' }, [
              h('span', null, t.confidence),
              h('span', { className: 'text-primary' }, `${confidencePct}%`)
            ]),
            h('div', { className: 'h-1.5 w-full bg-slate-100 rounded-full overflow-hidden' },
              h('div', {
                className: 'h-full bg-gradient-to-r from-primary to-secondary-container rounded-full shadow-[0_0_8px_rgba(0,102,255,0.4)]',
                style: { width: `${Math.max(4, confidencePct)}%` }
              })
            )
          ]),
          h('div', { className: 'flex justify-between text-xs pt-2' }, [
            h('span', { className: 'text-slate-400' }, t.failureRate),
            h('span', { className: failureRate > 0.1 ? 'text-error font-semibold' : 'text-green-600 font-semibold' }, `${(failureRate * 100).toFixed(2)}%`)
          ]),
          h(AgentCardActions, { agent, onOpenSetupWizard, t })
        ])
      : h('div', { className: 'space-y-4' }, [
          h('div', { className: 'flex justify-between items-end' }, [
            h('span', { className: 'text-slate-400 text-xs uppercase font-bold tracking-tighter' }, t.totalRuns),
            h('span', { className: 'font-mono text-sm font-semibold' }, '--')
          ]),
          h('div', { className: 'space-y-1.5 opacity-40' }, [
            h('div', { className: 'flex justify-between text-[10px] font-bold uppercase text-slate-400' }, [
              h('span', null, t.confidence),
              h('span', null, '0%')
            ]),
            h('div', { className: 'h-1.5 w-full bg-slate-100 rounded-full overflow-hidden' },
              h('div', { className: 'h-full bg-slate-300 w-0 rounded-full' })
            )
          ]),
          h('a', {
            'data-action': 'open-agent-setup-wizard',
            'data-agent-id': agent.agent_id,
            className: 'block w-full py-2 bg-slate-50 text-primary font-label-caps text-[10px] rounded-lg hover:bg-primary hover:text-white transition-all text-center',
            href: `/agents/${encodeURIComponent(agent.agent_id)}/setup`,
            onClick: (event) => {
              event.preventDefault();
              onOpenSetupWizard?.(agent.agent_id);
            }
          }, t.needsSetup)
        ])
  ]);
}

function AddAgentCard({ onOpen, t }) {
  return h('a', {
    'data-action': 'open-agent-setup-wizard',
    className: 'border-2 border-dashed border-slate-200 p-6 rounded-3xl flex flex-col items-center justify-center gap-4 group hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer',
    href: '/setup',
    onClick: (event) => {
      event.preventDefault();
      onOpen?.();
    }
  }, [
    h('div', { className: 'w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all' },
      h(MaterialIcon, { className: 'text-3xl', name: 'add_circle' })
    ),
    h('div', { className: 'text-center' }, [
      h('span', { className: 'font-label-caps text-label-caps block text-slate-400 group-hover:text-primary transition-all' }, t.deployNew),
      h('span', { className: 'text-[10px] text-slate-300 block mt-1' }, t.setupGuide)
    ])
  ]);
}

function AgentFleet({ agents, onOpenSetupWizard, t }) {
  const descriptions = {
    claude_code: t.descClaudeCode,
    codex: t.descCodex,
    openclaw: t.descOpenClaw,
    hermes: t.descHermes
  };
  return h('section', { id: 'agents', className: 'space-y-8' }, [
    h('div', { className: 'flex justify-between items-end' }, [
      h('div', null, [
        h('span', { className: 'text-primary font-mono text-xs font-bold tracking-widest uppercase' }, t.eyebrowOverview),
        h('h2', { className: 'font-h2 text-h2 text-on-surface mt-1' }, t.agentOverview),
        h('p', { className: 'sr-only' }, t.agentFleet)
      ]),
      h('div', { className: 'flex gap-3' }, [
        h('a', {
          className: 'px-4 py-2 rounded-xl bg-white border border-slate-200 text-on-surface hover:bg-slate-50 transition-all flex items-center gap-2',
          href: '/sessions'
        }, [h(MaterialIcon, { className: 'text-base', name: 'tune' }), h('span', { className: 'font-label-caps text-label-caps' }, t.filterSort)]),
        h('a', {
          className: 'px-6 py-2 rounded-xl bg-primary text-white hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-primary/20',
          'data-action': 'open-agent-setup-wizard',
          href: '/setup',
          onClick: (event) => {
            event.preventDefault();
            onOpenSetupWizard?.();
          }
        }, [h(MaterialIcon, { className: 'text-base', name: 'add' }), h('span', { className: 'font-label-caps text-label-caps' }, t.deployNew)])
      ])
    ]),
    h('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter' }, [
      ...agents.slice(0, 3).map((agent, i) => h(AgentCard, {
        accent: i === 0,
        agent,
        description: descriptions[agent.agent_id] || agent.brand,
        key: agent.agent_id,
        onOpenSetupWizard,
        t
      })),
      h(AddAgentCard, { key: 'add', onOpen: onOpenSetupWizard, t })
    ])
  ]);

  // (closure capture for descriptions language)
}

function DataSourceEmptyState({ dbPath, dataSources, t }) {
  const alternatives = (dataSources || []).filter((source) => source.path !== dbPath && source.session_count > 0).slice(0, 3);
  return h('section', { className: 'glass-card-strong rounded-3xl border border-amber-100/80 p-lg shadow-lg shadow-amber-500/5', id: 'empty-data-source' }, [
    h('div', { className: 'flex flex-wrap items-start justify-between gap-4' }, [
      h('div', { className: 'max-w-3xl' }, [
        h('div', { className: 'mb-2 flex items-center gap-2 text-amber-700' }, [
          h(MaterialIcon, { className: 'text-[20px]', name: 'database' }),
          h('span', { className: 'font-label-caps text-label-caps uppercase' }, t.dataSource)
        ]),
        h('h3', { className: 'text-h3 font-h3 tracking-tight text-on-surface' }, t.dataSourceEmptyTitle),
        h('p', { className: 'mt-2 text-sm leading-6 text-on-surface-variant' }, t.dataSourceEmptyBody.replace('{dbPath}', dbPath || '.runq/runq.db')),
        h('code', { className: 'mt-4 block w-fit rounded-xl bg-slate-950 px-md py-3 font-mono text-mono text-blue-300' }, t.demoDataCommand)
      ]),
      alternatives.length > 0 ? h('div', { className: 'min-w-56 space-y-2' }, [
        h('p', { className: 'text-label-caps font-label-caps uppercase text-outline' }, t.availableDataSources || t.chooseDataSource),
        ...alternatives.map((source) => h('button', {
          className: 'flex w-full items-center justify-between gap-3 rounded-xl border border-outline-variant/40 bg-white/70 px-3 py-2 text-left text-sm font-medium hover:border-primary/40',
          key: source.path,
          onClick: () => switchDataSource(source.path),
          type: 'button'
        }, [
          h('span', { className: 'truncate' }, source.label),
          h('span', { className: 'rounded-full bg-primary/10 px-2 py-0.5 font-mono text-mono text-primary' }, source.session_count)
        ]))
      ]) : null
    ])
  ]);
}

/* ---------------- Performance + Advisor ---------------- */

function smoothBezier(points) {
  if (points.length < 2) return '';
  const cmds = [`M${points[0][0]},${points[0][1]}`];
  for (let i = 1; i < points.length; i += 1) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const cx = (x0 + x1) / 2;
    cmds.push(`C${cx},${y0} ${cx},${y1} ${x1},${y1}`);
  }
  return cmds.join(' ');
}

function PerformanceTrend({ chartPoints, stats, t }) {
  const width = 800; const height = 240;
  const max = Math.max(1, ...chartPoints.map((p) => p.input + p.output));
  const totalTokens = chartPoints.reduce((sum, p) => sum + p.input + p.output, 0);
  const points = chartPoints.length === 0
    ? []
    : chartPoints.map((p, i) => {
        const x = chartPoints.length === 1 ? width / 2 : (i / (chartPoints.length - 1)) * width;
        const y = height - ((p.input + p.output) / max) * (height - 40) - 20;
        return [x, y];
      });
  const linePath = smoothBezier(points);
  const areaPath = points.length === 0 ? '' : `${linePath} L${points[points.length - 1][0]},${height} L0,${height} Z`;
  const lastIndex = points.length - 1;
  const tipLeft = lastIndex >= 0 ? Math.min(width - 110, points[lastIndex][0] + 10) : 0;
  const tipTop = lastIndex >= 0 ? Math.max(8, points[lastIndex][1] - 30) : 0;
  return h('div', { className: 'lg:col-span-2 glass-card rounded-3xl p-8 space-y-8' }, [
    h('div', { className: 'flex justify-between items-start' }, [
      h('div', null, [
        h('h3', { className: 'font-h3 text-xl' }, t.tokenConsumption),
        h('p', { className: 'text-slate-500 text-sm' }, t.advisorBody)
      ]),
      h('div', { className: 'flex gap-2' }, [
        h('span', { className: 'px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium' }, t.last24h),
        h('span', { className: 'px-3 py-1 rounded-full bg-slate-50 text-slate-400 text-xs font-medium' }, t.last7d)
      ])
    ]),
    h('div', { className: 'relative h-64 w-full' }, [
      h('svg', { className: 'w-full h-full', preserveAspectRatio: 'none', viewBox: `0 0 ${width} ${height}` }, [
        h('defs', { key: 'defs' },
          h('linearGradient', { id: 'chartGradient', x1: '0', x2: '0', y1: '0', y2: '1' }, [
            h('stop', { key: 's0', offset: '0%', stopColor: '#0066FF', stopOpacity: 0.2 }),
            h('stop', { key: 's1', offset: '100%', stopColor: '#0066FF', stopOpacity: 0 })
          ])
        ),
        h('line', { key: 'g1', stroke: '#f1f5f9', strokeWidth: 1, x1: 0, x2: width, y1: 40, y2: 40 }),
        h('line', { key: 'g2', stroke: '#f1f5f9', strokeWidth: 1, x1: 0, x2: width, y1: 100, y2: 100 }),
        h('line', { key: 'g3', stroke: '#f1f5f9', strokeWidth: 1, x1: 0, x2: width, y1: 160, y2: 160 }),
        h('line', { key: 'g4', stroke: '#f1f5f9', strokeWidth: 1, x1: 0, x2: width, y1: 220, y2: 220 }),
        areaPath ? h('path', { key: 'area', d: areaPath, fill: 'url(#chartGradient)' }) : null,
        linePath ? h('path', { key: 'line', d: linePath, fill: 'none', stroke: '#0066FF', strokeLinecap: 'round', strokeWidth: 3 }) : null,
        lastIndex >= 0 ? h('circle', { key: 'last', cx: points[lastIndex][0], cy: points[lastIndex][1], fill: '#0066FF', r: 6, stroke: 'white', strokeWidth: 3 }) : null
      ].filter(Boolean)),
      lastIndex >= 0
        ? h('div', { className: 'glass-card absolute p-2 rounded-xl shadow-xl border border-white/40', style: { top: `${tipTop}px`, left: `${tipLeft}px` } }, [
            h('p', { className: 'text-[10px] font-bold text-slate-400 uppercase' }, t.totalLogic),
            h('p', { className: 'text-sm font-mono font-bold text-primary' }, totalTokens.toLocaleString())
          ])
        : null,
      h('div', { className: 'flex justify-between mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2' },
        chartPoints.length === 0
          ? ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'].map((label, i) => h('span', { key: i }, label))
          : chartPoints.map((p, i) => h('span', { key: i }, p.label))
      )
    ]),
    h('div', { className: 'grid grid-cols-3 gap-8 pt-4 border-t border-slate-50' }, [
      h('div', null, [
        h('p', { className: 'text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1' }, t.avgSuccess),
        h('p', { className: 'text-2xl font-h2 text-on-surface' }, `${(stats.avgConfidence * 100).toFixed(1)}%`)
      ]),
      h('div', null, [
        h('p', { className: 'text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1' }, t.totalLogic),
        h('p', { className: 'text-2xl font-h2 text-on-surface' }, [
          (stats.telemetry.totalTokens || stats.telemetry.inputTokens + stats.telemetry.outputTokens).toLocaleString(),
          h('span', { className: 'text-xs text-green-500 font-normal ml-1', key: 'unit' }, 'tokens')
        ])
      ]),
      h('div', null, [
        h('p', { className: 'text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1' }, t.computeLoad),
        h('p', { className: 'text-2xl font-h2 text-on-surface' }, `${stats.telemetry.verifications - stats.telemetry.failedVerifications}/${stats.telemetry.verifications}`)
      ])
    ])
  ]);
}

function recommendationStateLabel(state, t) {
  const status = state?.status || 'new';
  if (status === 'accepted') return t.stateAccepted;
  if (status === 'dismissed') return t.stateDismissed;
  return t.stateNew;
}

function recommendationStateTone(state) {
  const status = state?.status || 'new';
  if (status === 'accepted') return 'good';
  if (status === 'dismissed') return 'neutral';
  return 'info';
}

function sessionTime(session) {
  return session.last_event_at || session.ended_at || session.started_at || '';
}

function recommendationImpact(rec, sessions) {
  if (rec.impact) {
    return {
      status: rec.impact.status,
      followupCount: Number(rec.impact.followup_count || 0)
    };
  }
  if (rec.state?.status !== 'accepted' || !rec.state?.decided_at) return null;
  const followups = sessions.filter((session) =>
    session.framework === rec.framework &&
    session.session_id !== rec.session_id &&
    sessionTime(session) > rec.state.decided_at
  );
  const verified = followups.some((session) =>
    session.satisfaction?.label === 'accepted' ||
    trustScoreValue(session.quality) >= 80 ||
    Number(session.telemetry?.verification_passed_count || 0) > 0
  );
  return { followupCount: followups.length, status: verified ? 'verified' : 'pending' };
}

function AdvisorPanel({ recommendations, t }) {
  const palette = [
    { left: 'border-blue-500', icon: 'bolt', wrap: 'bg-blue-50 text-blue-600', tag: 'COST SAVING', tagCls: 'text-blue-600 bg-blue-50' },
    { left: 'border-amber-500', icon: 'update', wrap: 'bg-amber-50 text-amber-600', tag: 'URGENT', tagCls: 'text-amber-600 bg-amber-50' },
    { left: 'border-green-500', icon: 'hub', wrap: 'bg-green-50 text-green-600', tag: 'EFFICIENCY', tagCls: 'text-green-600 bg-green-50' }
  ];
  return h('div', { className: 'space-y-gutter' }, [
    h('div', { className: 'flex items-center justify-between' }, [
      h('h3', { className: 'font-h3 text-lg flex items-center gap-2' }, [
        h(MaterialIcon, { className: 'text-primary', filled: true, name: 'auto_awesome' }),
        t.activeRecommendations
      ]),
      h('a', { className: 'text-xs text-primary font-semibold cursor-pointer', href: '/recommendations' }, t.viewAll)
    ]),
    h('div', { className: 'space-y-4' },
      recommendations.length === 0
        ? h('div', { className: 'glass-card rounded-2xl p-5 text-sm text-slate-500' }, t.advisorEmpty)
        : recommendations.slice(0, 3).map((rec, i) => {
            const p = palette[i % palette.length];
            return h('div', { className: `glass-card p-5 rounded-2xl border-l-4 ${p.left} group cursor-pointer hover:bg-white transition-all`, key: rec.recommendation_id || i },
              h('div', { className: 'flex gap-4' }, [
                h('div', { className: `w-10 h-10 rounded-xl ${p.wrap} flex items-center justify-center shrink-0` },
                  h(MaterialIcon, { className: 'text-[20px]', name: p.icon })
                ),
                h('div', { className: 'space-y-1' }, [
                  h('h4', { className: 'text-sm font-semibold text-on-surface' }, rec.title),
                  h('p', { className: 'text-xs text-slate-500 leading-relaxed' }, rec.summary),
                  h('div', { className: 'flex items-center gap-2 pt-2' }, [
                    h('span', { className: `text-[10px] font-bold ${p.tagCls} px-2 py-0.5 rounded-full uppercase tracking-wider` }, rec.category || p.tag),
                    h('span', { className: 'text-[10px] text-slate-400' }, recommendationStateLabel(rec.state, t))
                  ])
                ])
              ])
            );
          })
    ),
    h('div', { className: 'relative rounded-3xl overflow-hidden aspect-video group glass-card' }, [
      h('div', { className: 'absolute inset-0 dot-grid opacity-60' }),
      h('div', { className: 'absolute inset-0 bg-gradient-to-br from-primary/30 via-secondary-container/40 to-primary/10' }),
      h('div', { className: 'absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex flex-col justify-end p-6' }, [
        h('p', { className: 'text-white text-xs font-bold uppercase tracking-widest opacity-80' }, t.insightsEngine),
        h('p', { className: 'text-white text-sm font-medium leading-snug' }, t.insightsBody)
      ])
    ])
  ]);
}

function FloatingHelp({ t }) {
  return h('div', { className: 'fixed bottom-8 right-8 z-50' },
    h('a', {
      className: 'w-14 h-14 bg-primary text-white rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-90 transition-all',
      href: '/docs',
      'aria-label': t.helpDocs,
      title: t.helpDocs
    }, h(MaterialIcon, { className: 'text-3xl', name: 'menu_book' }))
  );
}

/* ---------------- Run History Table ---------------- */

function RunHistoryTable({ sessions, selectedSessionId, onSelect, t }) {
  return h('section', { className: 'glass-card-strong overflow-hidden rounded-3xl' }, [
    h('div', { className: 'flex items-center justify-between border-b border-white/40 px-lg py-md' }, [
      h('h3', { className: 'text-h3 font-h3 tracking-tight' }, t.runHistory),
      h('a', { className: 'text-xs font-semibold text-primary hover:underline', href: '/sessions' }, t.viewAll)
    ]),
    sessions.length === 0
      ? h('p', { className: 'p-lg text-sm text-outline' }, t.noRuns)
      : h('div', { className: 'overflow-x-auto' },
          h('table', { className: 'w-full text-left' }, [
            h('thead', { className: 'bg-surface-container-low/60' },
              h('tr', null, [
                h('th', { className: 'p-md text-label-caps font-label-caps uppercase text-outline' }, t.runId),
                h('th', { className: 'p-md text-label-caps font-label-caps uppercase text-outline' }, t.framework),
                h('th', { className: 'p-md text-label-caps font-label-caps uppercase text-outline' }, t.satisfaction),
                h('th', { className: 'p-md text-label-caps font-label-caps uppercase text-outline' }, t.status),
                h('th', { className: 'p-md text-right text-label-caps font-label-caps uppercase text-outline' }, t.confidence)
              ])
            ),
            h('tbody', { className: 'divide-y divide-white/40 text-sm' },
              sessions.map((session) => {
                const verdict = verdictFor(session, t);
                return h('tr', {
                  className: [
                    'transition-colors cursor-pointer hover:bg-white/60',
                    selectedSessionId === session.session_id ? 'bg-primary/5' : ''
                  ].join(' '),
                  key: session.session_id,
                  onClick: () => onSelect?.(session.session_id)
                }, [
                  h('td', { className: 'p-md font-mono text-mono text-primary' }, `#${session.session_id}`),
                  h('td', { className: 'p-md font-semibold' }, agentMeta(session.framework)[1]),
                  h('td', { className: 'p-md' }, chip(session.satisfaction?.label || 'unknown', satisfactionTone(session.satisfaction?.label), 'sat')),
                  h('td', { className: 'p-md' },
                    h('span', { className: 'flex items-center gap-2' }, [statusDot(verdict.tone), h('span', null, verdict.label)])
                  ),
                  h('td', { className: 'p-md text-right font-mono text-mono' }, `${trustScoreValue(session.quality)}%`)
                ]);
              })
            )
          ])
        )
  ]);
}

/* ---------------- Sessions Page ---------------- */

function MetricStat({ label, value, suffix, deltaIcon, deltaText, deltaTone, fillPct, fillTone }) {
  const dCls = { good: 'text-green-600', bad: 'text-error', neutral: 'text-outline' }[deltaTone] || 'text-outline';
  const fCls = { primary: 'bg-gradient-to-r from-primary to-secondary-container', error: 'bg-error', good: 'bg-green-500', warn: 'bg-amber-500' }[fillTone] || 'bg-primary';
  return h('article', { className: 'glass-card rounded-2xl p-5 flex flex-col gap-1' }, [
    h('span', { className: 'text-label-caps font-label-caps uppercase text-outline' }, label),
    h('div', { className: 'flex items-baseline justify-between' }, [
      h('span', { className: 'font-mono text-h2 font-h2 tracking-tight text-on-surface' }, [value, suffix ? h('span', { className: 'ml-1 text-sm text-outline', key: 's' }, suffix) : null]),
      deltaText ? h('span', { className: `flex items-center gap-1 text-sm ${dCls}` }, [
        deltaIcon ? h(MaterialIcon, { className: 'text-sm', name: deltaIcon, key: 'i' }) : null,
        deltaText
      ]) : null
    ]),
    h('div', { className: 'mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100' },
      h('div', { className: `h-full rounded-full ${fCls}`, style: { width: `${Math.min(100, Math.max(0, fillPct))}%` } })
    )
  ]);
}

function metricStrip(label, value, tone) {
  const pct = percent(value);
  const colors = { primary: 'bg-gradient-to-r from-primary to-secondary-container', error: 'bg-error', warn: 'bg-amber-500', info: 'bg-primary-fixed-dim' };
  return h('div', { className: 'rounded-2xl border border-outline-variant/30 bg-surface-container-low/60 p-3' }, [
    h('div', { className: 'flex justify-between text-sm font-medium text-on-surface-variant' }, [
      h('span', null, label),
      h('span', { className: 'font-mono text-on-surface' }, `${pct}%`)
    ]),
    h('div', { className: 'mt-2 h-1 overflow-hidden rounded-full bg-slate-100' },
      h('div', { className: `h-full ${colors[tone] || colors.primary}`, style: { width: `${pct}%` } })
    )
  ]);
}

function ConfidenceBars({ chartPoints, t }) {
  if (chartPoints.length === 0) return h('div', { className: 'grid h-32 place-items-center rounded-xl border border-dashed border-outline-variant/40 text-sm text-outline' }, t.noModelData);
  return h('div', { className: 'flex h-32 items-end justify-between gap-1 px-2' }, chartPoints.map((p, i) => {
    const pct = Math.round(p.confidence * 100);
    return h('div', { className: 'flex w-full flex-col items-center gap-1', key: i, title: `${p.label} · ${pct}%` }, [
      h('div', { className: 'flex h-28 w-full items-end overflow-hidden rounded-t-md bg-primary-fixed/40' },
        h('div', { className: 'w-full rounded-t-md bg-gradient-to-t from-primary to-primary-container shadow-[0_0_8px_rgba(0,102,255,0.3)]', style: { height: `${Math.max(8, pct)}%` } })
      ),
      h('span', { className: 'text-[10px] text-outline' }, p.label || `#${i + 1}`)
    ]);
  }));
}

function RunInbox({ sessions, selectedSessionId, onSelect, runSearch, setRunSearch, runFilter, setRunFilter, t }) {
  return h('section', { className: 'glass-card-strong overflow-hidden rounded-3xl lg:col-span-8', id: 'sessions' }, [
    h('div', { className: 'flex flex-wrap items-center justify-between gap-3 border-b border-white/40 px-lg py-md' }, [
      h('h3', { className: 'text-h3 font-h3 tracking-tight' }, t.runInbox),
      h('div', { className: 'flex items-center gap-2' }, [
        h('div', { className: 'relative' }, [
          h(MaterialIcon, { className: 'absolute left-2 top-1/2 -translate-y-1/2 text-[18px] text-outline', name: 'search' }),
          h('input', {
            className: 'w-56 rounded-lg border-none bg-surface-container-low pl-8 pr-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary',
            onChange: (e) => setRunSearch(e.target.value),
            placeholder: t.searchRuns,
            type: 'search',
            value: runSearch
          })
        ]),
        h('select', {
          className: 'rounded-lg border-none bg-surface-container-low px-2 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary',
          onChange: (e) => setRunFilter(e.target.value),
          value: runFilter
        }, [
          h('option', { value: 'all' }, t.allRuns),
          h('option', { value: 'needs_review' }, t.needsReview),
          h('option', { value: 'accepted' }, t.accepted),
          h('option', { value: 'failed' }, t.failed)
        ])
      ])
    ]),
    sessions.length === 0
      ? h('p', { className: 'p-lg text-sm text-outline' }, runSearch ? t.noRunMatch : t.noRuns)
      : h('div', { className: 'overflow-x-auto' },
          h('table', { className: 'w-full text-left' }, [
            h('thead', { className: 'border-b border-white/40 bg-surface-container-low/60' },
              h('tr', null, [
                h('th', { className: 'p-md text-label-caps font-label-caps uppercase text-outline' }, t.runId),
                h('th', { className: 'p-md text-label-caps font-label-caps uppercase text-outline' }, t.status),
                h('th', { className: 'p-md text-right text-label-caps font-label-caps uppercase text-outline' }, t.confidence),
                h('th', { className: 'p-md text-label-caps font-label-caps uppercase text-outline' }, t.satisfaction),
                h('th', { className: 'p-md text-right text-label-caps font-label-caps uppercase text-outline' }, t.events)
              ])
            ),
            h('tbody', { className: 'text-sm' },
              sessions.map((session) => {
                const verdict = verdictFor(session, t);
                return h('tr', {
                  className: [
                    'cursor-pointer border-b border-white/30 transition-colors hover:bg-white/60',
                    selectedSessionId === session.session_id ? 'bg-primary/5' : ''
                  ].join(' '),
                  key: session.session_id,
                  onClick: () => onSelect(session.session_id)
                }, [
                  h('td', { className: 'p-md font-mono text-mono text-primary' }, `#${session.session_id}`),
                  h('td', { className: 'p-md' },
                    h('span', { className: 'flex items-center gap-2' }, [statusDot(verdict.tone), h('span', null, verdict.label)])
                  ),
                  h('td', { className: 'p-md text-right font-mono text-mono' }, `${trustScoreValue(session.quality)}%`),
                  h('td', { className: 'p-md' }, chip(session.satisfaction?.label || 'unknown', satisfactionTone(session.satisfaction?.label), 'sat')),
                  h('td', { className: 'p-md text-right font-mono text-mono text-outline' }, session.event_count)
                ]);
              })
            )
          ])
        )
  ]);
}

function QualityInspector({ session, t }) {
  if (!session) {
    return h('section', { className: 'glass-card rounded-3xl p-lg lg:col-span-4' }, [
      h('h3', { className: 'mb-3 text-h3 font-h3 tracking-tight' }, t.qualityInspector),
      h('p', { className: 'rounded-2xl bg-surface-container-low/60 p-md text-sm text-outline' }, t.selectRun)
    ]);
  }
  const quality = session.quality || {};
  const recs = session.recommendations || [];
  const verdict = verdictFor(session, t);
  const trustScore = trustScoreValue(quality);
  const dimensions = trustBreakdownEntries(quality);
  return h('section', { className: 'glass-card overflow-hidden rounded-3xl lg:col-span-4' }, [
    h('div', { className: 'flex items-center justify-between border-b border-white/40 bg-surface-container-low/40 px-lg py-md' }, [
      h('h3', { className: 'text-h3 font-h3 tracking-tight' }, t.qualityInspector),
      chip(session.satisfaction?.label || 'unknown', satisfactionTone(session.satisfaction?.label))
    ]),
    h('div', { className: 'space-y-md p-lg' }, [
      h('div', { className: 'rounded-2xl bg-surface-container-low/60 p-md' }, [
        h('div', { className: 'flex items-baseline gap-2' }, [
          h('span', { className: 'font-mono text-h2 font-h2 tracking-tight' }, `${trustScore}%`),
          h('span', { className: 'text-sm text-outline' }, verdict.label)
        ]),
        h('p', { className: 'mt-1 text-label-caps font-label-caps uppercase text-primary' }, t.trustScore),
        h('p', { className: 'mt-2 text-sm text-on-surface-variant' }, session.satisfaction?.signal || t.noSignal)
      ]),
      h('div', { className: 'grid gap-2 md:grid-cols-2' }, [
        metricStrip(t.trustScore, trustScore / 100, 'primary'),
        metricStrip('Verification', quality.verification_coverage, 'info'),
        metricStrip('Rework', quality.rework_risk, 'error'),
        metricStrip('Loop', quality.loop_risk, 'warn')
      ]),
      h('div', null, [
        h('h4', { className: 'mb-2 text-label-caps font-label-caps uppercase text-outline' }, t.trustModel),
        dimensions.length === 0
          ? h('p', { className: 'rounded-2xl bg-surface-container-low/60 p-3 text-sm text-outline' }, t.noSignal)
          : h('div', { className: 'space-y-2' }, dimensions.map((dimension) =>
              h('article', { className: 'rounded-2xl border border-outline-variant/30 bg-white/60 p-3', key: dimension.key }, [
                h('div', { className: 'flex items-center justify-between gap-3 text-sm' }, [
                  h('span', { className: 'font-semibold text-on-surface' }, dimension.label),
                  h('span', { className: 'font-mono text-mono font-bold text-primary' }, `${dimension.score}%`)
                ]),
                h('div', { className: 'mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100' },
                  h('div', { className: 'h-full rounded-full bg-gradient-to-r from-primary to-secondary-container', style: { width: `${dimension.score}%` } })
                ),
                dimension.reasons.length
                  ? h('p', { className: 'mt-2 text-xs leading-5 text-outline' }, dimension.reasons.slice(0, 2).join(' · '))
                  : null
              ])
            ))
      ]),
      h('div', null, [
        h('h4', { className: 'mb-2 text-label-caps font-label-caps uppercase text-outline' }, t.outcomeEvidence),
        h('div', { className: 'flex flex-wrap gap-2' },
          (quality.reasons || []).length === 0
            ? h('span', { className: 'text-sm text-outline' }, t.noSignal)
            : (quality.reasons || []).map((r) => chip(r, 'neutral', r))
        )
      ]),
      h('div', null, [
        h('h4', { className: 'mb-2 text-label-caps font-label-caps uppercase text-outline' }, t.recommendations),
        recs.length === 0
          ? h('p', { className: 'rounded-2xl bg-surface-container-low/60 p-3 text-sm text-outline' }, t.noRecommendations)
          : h('div', { className: 'space-y-2' }, recs.map((rec) =>
              h('article', { className: 'rounded-2xl border border-outline-variant/30 bg-white/60 p-3', key: rec.recommendation_id || rec.title }, [
                h('div', { className: 'mb-2 flex items-start justify-between gap-2' }, [
                  chip(rec.category, 'info', 'cat'),
                  chip(recommendationStateLabel(rec.state, t), recommendationStateTone(rec.state), 'state')
                ]),
                h('p', { className: 'text-sm font-semibold text-on-surface' }, rec.title),
                h('p', { className: 'mt-1 text-xs text-outline' }, rec.summary),
                h('p', { className: 'mt-2 text-xs text-outline' }, rec.suggested_action),
                h('div', { className: 'mt-2 flex flex-wrap items-center gap-2' }, [
                  h('a', {
                    'data-action': 'open-recommendation-evidence',
                    className: 'rounded-lg border border-outline-variant/40 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary hover:border-primary/40',
                    href: `/traces?session=${encodeURIComponent(session.session_id)}`
                  }, t.viewEvidence),
                  h('span', { className: 'text-[10px] uppercase tracking-wider text-outline' }, `${(rec.evidence_event_ids || []).length} ${t.evidenceEvents}`)
                ])
              ])
            ))
      ])
    ])
  ]);
}

function Timeline({ session, events, t, eventSearch, setEventSearch, eventTypeFilter, setEventTypeFilter }) {
  const types = ['all', ...Array.from(new Set(events.map((e) => e.event_type))).sort()];
  const visible = events.filter((e) => (eventTypeFilter === 'all' || e.event_type === eventTypeFilter) && eventMatchesSearch(e, eventSearch));
  return h('section', { className: 'glass-card-strong overflow-hidden rounded-3xl' }, [
    h('div', { className: 'flex flex-wrap items-center justify-between gap-3 border-b border-white/40 px-lg py-md' }, [
      h('h3', { className: 'text-h3 font-h3 tracking-tight' }, [
        session?.session_id ? `#${session.session_id} · ` : '',
        `${events.length} ${t.events}`
      ]),
      h('div', { className: 'flex items-center gap-2' }, [
        h('input', {
          className: 'w-44 rounded-lg border-none bg-surface-container-low px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary',
          onChange: (e) => setEventSearch(e.target.value),
          placeholder: t.searchEvents,
          type: 'search',
          value: eventSearch
        }),
        h('select', {
          className: 'w-44 rounded-lg border-none bg-surface-container-low px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary',
          onChange: (e) => setEventTypeFilter(e.target.value),
          value: eventTypeFilter
        }, types.map((type) => h('option', { key: type, value: type }, type === 'all' ? t.eventType : type)))
      ])
    ]),
    visible.length === 0
      ? h('p', { className: 'p-lg text-sm text-outline' }, t.noEvents)
      : h('div', { className: 'divide-y divide-white/40' }, visible.map((event) => {
          const kind = eventKind(event);
          const tone = { success: 'good', failure: 'bad', file: 'info', model: 'info', command: 'info', satisfaction: 'warn' }[kind] || 'neutral';
          return h('details', { className: 'group px-lg py-md hover:bg-white/40', key: event.event_id }, [
            h('summary', { className: 'flex cursor-pointer items-center justify-between gap-3 [&::-webkit-details-marker]:hidden' }, [
              h('div', { className: 'flex min-w-0 items-center gap-3' }, [
                h('span', { className: 'font-mono text-mono text-outline' }, event.timestamp?.slice(11, 19) || ''),
                chip(event.event_type, tone, 'type'),
                h('span', { className: 'truncate text-sm font-medium' }, summarizeEvent(event))
              ]),
              h('span', { className: 'flex items-center gap-2 text-sm text-outline' }, [
                event.payload?.exit_code !== undefined ? h('span', { className: 'font-mono text-mono', key: 'ex' }, `Exit ${event.payload.exit_code}`) : null,
                h(MaterialIcon, { className: 'text-[16px] transition-transform group-open:rotate-180', name: 'expand_more', key: 'caret' })
              ])
            ]),
            h('pre', { className: 'mt-3 max-h-60 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-mono text-blue-300' }, JSON.stringify(event.payload || {}, null, 2))
          ]);
        }))
  ]);
}

function AgentCapabilityOverview({ stats, t }) {
  const items = [
    { icon: 'memory', label: t.modelCalls, value: stats.telemetry.modelCalls },
    { icon: 'terminal', label: t.commandCount, value: stats.telemetry.commands },
    { icon: 'fact_check', label: t.verificationCount, value: stats.telemetry.verifications },
    { icon: 'description', label: t.fileChanges, value: stats.telemetry.fileChanges },
    { icon: 'auto_awesome', label: t.recommendations, value: stats.recommendationCount }
  ];
  return h('section', {
    className: 'glass-card-strong rounded-3xl p-lg',
    'data-agent-capability-overview': 'true'
  }, [
    h('div', { className: 'mb-md flex flex-wrap items-start justify-between gap-3' }, [
      h('div', null, [
        h('p', { className: 'text-label-caps font-label-caps uppercase text-primary' }, t.agentOverview),
        h('h3', { className: 'mt-2 text-h3 font-h3 tracking-tight' }, t.capabilityOverview),
        h('p', { className: 'mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant' }, t.capabilityOverviewBody)
      ]),
      chip(t.realDataNote, 'neutral', 'source')
    ]),
    h('div', { className: 'grid grid-cols-2 gap-md md:grid-cols-5' }, items.map((item) =>
      h('article', { className: 'rounded-2xl border border-outline-variant/30 bg-white/65 p-md', key: item.label }, [
        h('div', { className: 'mb-3 flex items-center justify-between gap-2' }, [
          h('span', { className: 'text-label-caps font-label-caps uppercase text-outline' }, item.label),
          h('span', { className: 'grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary' },
            h(MaterialIcon, { className: 'text-[18px]', name: item.icon })
          )
        ]),
        h('p', { className: 'font-mono text-h3 font-h3 tracking-tight text-on-surface' }, Number(item.value || 0).toLocaleString())
      ])
    ))
  ]);
}

function SessionsDetail({ selectedAgent, agents, agentSessions, visibleSessions, selectedSession, selectedSessionId, selectSession, selectedEvents, runFilter, setRunFilter, runSearch, setRunSearch, eventSearch, setEventSearch, eventTypeFilter, setEventTypeFilter, t }) {
  const allStats = calcStats(agentSessions);
  const chartPoints = groupRunsForChart(visibleSessions.length ? visibleSessions : agentSessions);
  return h('div', { className: 'space-y-lg' }, [
    h(PageHeader, {
      eyebrow: t.eyebrowSessions,
      title: t.agentDetail,
      subtitle: selectedAgent ? `${selectedAgent.display_name} · ${selectedAgent.brand}` : t.supportedAgents,
      actions: h('div', { className: 'flex flex-wrap gap-2' }, agents.map((agent) =>
        h('a', {
          className: [
            'rounded-lg border px-3 py-1.5 text-label-caps font-label-caps uppercase transition-colors',
            selectedAgent?.agent_id === agent.agent_id
              ? 'border-primary bg-primary/10 text-primary-container'
              : 'border-outline-variant/40 bg-white text-on-surface hover:border-primary/40'
          ].join(' '),
          href: `/agents/${encodeURIComponent(agent.agent_id)}`,
          key: agent.agent_id
        }, agent.display_name)
      ))
    }),
    h(AgentCapabilityOverview, { key: 'capabilities', stats: allStats, t }),
    h('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter' }, [
      h(MetricStat, {
        key: 'runs',
        label: t.runCount,
        value: allStats.total.toLocaleString(),
        suffix: t.runs,
        deltaIcon: 'analytics',
        deltaText: t.realData,
        deltaTone: 'neutral',
        fillPct: Math.min(100, allStats.total * 5),
        fillTone: 'primary'
      }),
      h(MetricStat, {
        key: 'failure',
        label: t.failureRate,
        value: `${(allStats.failureRate * 100).toFixed(1)}`,
        suffix: '%',
        deltaIcon: allStats.failureRate > 0 ? 'trending_up' : 'check_circle',
        deltaText: `${allStats.failed}/${allStats.total} ${t.failed}`,
        deltaTone: allStats.failureRate > 0.1 ? 'bad' : 'good',
        fillPct: allStats.failureRate * 100,
        fillTone: 'error'
      }),
      h(MetricStat, {
        key: 'confidence',
        label: t.avgConfidence,
        value: `${(allStats.avgConfidence * 100).toFixed(1)}`,
        suffix: '%',
        deltaIcon: 'check_circle',
        deltaText: t.realData,
        deltaTone: 'good',
        fillPct: allStats.avgConfidence * 100,
        fillTone: 'good'
      }),
      h(MetricStat, {
        key: 'recs',
        label: t.recommendations,
        value: allStats.recommendationCount,
        suffix: '',
        deltaIcon: 'bolt',
        deltaText: t.realDataNote,
        deltaTone: 'neutral',
        fillPct: Math.min(100, allStats.recommendationCount * 12),
        fillTone: 'warn'
      })
    ]),
    h('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-gutter' }, [
      h(PerformanceTrend, { chartPoints, key: 'perf', stats: allStats, t }),
      h('div', { className: 'glass-card rounded-3xl p-lg' }, [
        h('h3', { className: 'mb-md text-h3 font-h3 tracking-tight' }, t.confidenceTrend),
        h(ConfidenceBars, { chartPoints, t }),
        h('div', { className: 'mt-md flex flex-col gap-2' }, [
          h('div', { className: 'flex items-center justify-between border-b border-outline-variant/30 py-2' }, [
            h('span', { className: 'text-sm text-on-surface-variant' }, t.commandCount),
            h('span', { className: 'font-mono text-mono' }, allStats.telemetry.commands)
          ]),
          h('div', { className: 'flex items-center justify-between border-b border-outline-variant/30 py-2' }, [
            h('span', { className: 'text-sm text-on-surface-variant' }, t.verificationCount),
            h('span', { className: 'font-mono text-mono' }, `${allStats.telemetry.verifications - allStats.telemetry.failedVerifications}/${allStats.telemetry.verifications}`)
          ])
        ])
      ])
    ]),
    h('div', { className: 'grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start' }, [
      h(RunInbox, { key: 'inbox', sessions: visibleSessions, selectedSessionId, onSelect: selectSession, runSearch, setRunSearch, runFilter, setRunFilter, t }),
      h(QualityInspector, { key: 'quality', session: selectedSession, t })
    ]),
    selectedSession ? h(Timeline, { events: selectedEvents, eventSearch, eventTypeFilter, key: 'timeline', session: selectedSession, setEventSearch, setEventTypeFilter, t }) : null
  ].filter(Boolean));
}

/* ---------------- Recommendations Page ---------------- */

function RecommendationsPage({ sessions, t, onFeedback, feedbackPending, feedbackError, recommendationNotes = {}, setRecommendationNote = () => {} }) {
  const recs = sessions.flatMap((s) =>
    (s.recommendations || []).map((r) => ({ ...r, session_id: s.session_id, framework: s.framework }))
  );
  const grouped = {
    new: recs.filter((r) => (r.state?.status || 'new') === 'new'),
    accepted: recs.filter((r) => r.state?.status === 'accepted'),
    dismissed: recs.filter((r) => r.state?.status === 'dismissed')
  };
  const acceptedImpacts = grouped.accepted.map((rec) => recommendationImpact(rec, sessions)).filter(Boolean);
  const pendingImpactCount = acceptedImpacts.filter((impact) => impact.status !== 'verified').length;
  const verifiedImpactCount = acceptedImpacts.filter((impact) => impact.status === 'verified').length;
  return h('section', { className: 'space-y-lg', id: 'recommendations' }, [
    h(PageHeader, {
      eyebrow: t.eyebrowAdvisor,
      title: t.navRecommendations,
      subtitle: t.recommendationsModuleBody
    }),
    feedbackError ? h('p', { className: 'glass-card rounded-2xl border border-error/30 bg-error-container/40 px-lg py-md text-sm text-on-error-container' }, feedbackError) : null,
    h('section', { className: 'glass-card-strong rounded-3xl p-lg', id: 'notifications' }, [
      h('div', { className: 'mb-md flex flex-wrap items-start justify-between gap-4' }, [
        h('div', null, [
          h('div', { className: 'flex items-center gap-3' }, [
            h('div', { className: 'grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary' },
              h(MaterialIcon, { className: 'text-[20px]', name: 'notifications' })
            ),
            h('h3', { className: 'text-h3 font-h3 tracking-tight' }, t.notificationCenter)
          ]),
          h('p', { className: 'mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant' }, t.notificationCenterBody)
        ]),
        chip(`${grouped.new.length}`, grouped.new.length ? 'info' : 'neutral', 'notification-count')
      ]),
      h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-md' }, [
        summaryStat(t.pendingRecommendations, grouped.new.length, grouped.new.length ? 'info' : 'neutral', 'notifications_active'),
        summaryStat(t.pendingImpact, pendingImpactCount, pendingImpactCount ? 'warn' : 'neutral', 'pending_actions'),
        summaryStat(t.verifiedImpact, verifiedImpactCount, verifiedImpactCount ? 'good' : 'neutral', 'verified')
      ])
    ]),
    h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-gutter' }, [
      summaryStat(t.stateNew, grouped.new.length, 'info', 'inbox'),
      summaryStat(t.stateAccepted, grouped.accepted.length, 'good', 'check_circle'),
      summaryStat(t.stateDismissed, grouped.dismissed.length, 'neutral', 'cancel')
    ]),
    recs.length === 0
      ? h('p', { className: 'glass-card rounded-3xl border border-dashed border-outline-variant/40 p-xl text-center text-sm text-outline' }, t.noRecommendations)
      : h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-gutter' }, recs.map((rec) => {
          const id = rec.recommendation_id || rec.title;
          const state = rec.state || { status: 'new' };
          const pendingKey = `${rec.session_id}:${id}`;
          const pending = feedbackPending === pendingKey;
          const disabled = pending || !rec.recommendation_id;
          const impact = recommendationImpact(rec, sessions);
          const noteValue = recommendationNotes[pendingKey] || '';
          return h('article', { className: 'glass-card-strong rounded-3xl p-lg hover:translate-y-[-2px] transition-all', key: `${rec.session_id}-${id}` }, [
            h('div', { className: 'mb-3 flex items-start justify-between gap-2' }, [
              h('div', { className: 'min-w-0 space-y-2' }, [
                h('div', { className: 'flex items-center gap-2' }, [
                  chip(rec.category, 'info', 'cat'),
                  chip(recommendationStateLabel(state, t), recommendationStateTone(state), 'state')
                ]),
                h('h3', { className: 'text-h3 font-h3 tracking-tight' }, rec.title)
              ]),
              h('div', { className: 'grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary' },
                h(MaterialIcon, { className: 'text-[20px]', name: 'auto_awesome' })
              )
            ]),
            h('p', { className: 'text-sm text-on-surface-variant' }, rec.summary),
            rec.suggested_action ? h('p', { className: 'mt-2 text-sm text-outline' }, rec.suggested_action) : null,
            h('div', { className: 'mt-md flex flex-wrap items-center gap-2' }, [
              h('a', {
                'data-action': 'open-recommendation-evidence',
                className: 'rounded-lg border border-outline-variant/40 bg-white px-3 py-1.5 text-label-caps font-label-caps uppercase text-primary hover:border-primary/40',
                href: `/traces?session=${encodeURIComponent(rec.session_id)}`
              }, t.viewEvidence),
              h('span', { className: 'font-mono text-xs text-outline' }, `${(rec.evidence_event_ids || []).length} ${t.evidenceEvents}`)
            ]),
            state.note ? h('p', { className: 'mt-2 text-sm text-outline' }, `${t.feedbackNote}: ${state.note}`) : null,
            state.decided_at ? h('p', { className: 'mt-1 font-mono text-xs text-outline' }, `${t.decidedAt}: ${state.decided_at}`) : null,
            impact ? h('div', { className: 'mt-md rounded-2xl border border-outline-variant/30 bg-surface-container-low/60 p-md' }, [
              h('div', { className: 'flex flex-wrap items-center justify-between gap-3' }, [
                h('div', { className: 'flex items-center gap-3' }, [
                  h('div', {
                    className: [
                      'grid h-9 w-9 place-items-center rounded-xl',
                      impact.status === 'verified' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    ].join(' ')
                  }, h(MaterialIcon, { className: 'text-[18px]', name: impact.status === 'verified' ? 'verified' : 'pending_actions' })),
                  h('div', null, [
                    h('p', { className: 'text-sm font-semibold text-on-surface' }, impact.status === 'verified' ? t.impactVerified : t.impactPending),
                    h('p', { className: 'text-xs text-outline' }, `${impact.followupCount} ${t.followupRuns}`)
                  ])
                ]),
                h('a', {
                  'data-action': 'verify-recommendation-impact',
                  className: 'rounded-lg border border-outline-variant/40 bg-white px-3 py-1.5 text-label-caps font-label-caps uppercase text-primary hover:border-primary/40',
                  href: `/sessions?q=${encodeURIComponent(rec.framework || '')}`
                }, t.viewFollowupRuns)
              ])
            ]) : null,
            h('div', { className: 'mt-md border-t border-outline-variant/30 pt-md' }, [
              h('textarea', {
                'aria-label': t.feedbackNote,
                className: 'mb-3 min-h-20 w-full resize-y rounded-2xl border border-outline-variant/40 bg-white/70 px-3 py-2 text-sm text-on-surface placeholder:text-outline focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15',
                'data-action': 'recommendation-note',
                disabled,
                onChange: (event) => setRecommendationNote(pendingKey, event.target.value),
                placeholder: t.feedbackNotePlaceholder,
                value: noteValue
              }),
              h('div', { className: 'flex flex-wrap items-center justify-between gap-3' }, [
                h('div', { className: 'truncate font-mono text-xs text-outline' }, `#${rec.session_id} · ${id}`),
                h('div', { className: 'flex gap-2' }, [
                h('button', {
                  'data-action': 'accept-recommendation',
                  'data-session-id': rec.session_id,
                  'data-recommendation-id': id,
                  className: [
                    'rounded-lg border px-3 py-1.5 text-label-caps font-label-caps uppercase transition-colors',
                    state.status === 'accepted'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-outline-variant/40 bg-white text-on-surface hover:border-green-300 hover:text-green-700',
                    disabled ? 'opacity-60' : ''
                  ].join(' '),
                  disabled,
                  key: 'accept',
                  onClick: () => onFeedback?.(rec.session_id, id, 'accepted', noteValue),
                  type: 'button'
                }, pending ? '…' : t.accept),
                h('button', {
                  'data-action': 'dismiss-recommendation',
                  'data-session-id': rec.session_id,
                  'data-recommendation-id': id,
                  className: [
                    'rounded-lg border px-3 py-1.5 text-label-caps font-label-caps uppercase transition-colors',
                    state.status === 'dismissed'
                      ? 'border-outline-variant/40 bg-surface-container text-on-surface-variant'
                      : 'border-outline-variant/40 bg-white text-on-surface hover:border-outline',
                    disabled ? 'opacity-60' : ''
                  ].join(' '),
                  disabled,
                  key: 'dismiss',
                  onClick: () => onFeedback?.(rec.session_id, id, 'dismissed', noteValue),
                  type: 'button'
                }, pending ? '…' : t.dismiss)
                ])
              ])
            ])
          ]);
        }))
  ].filter(Boolean));
}

function summaryStat(label, value, tone, icon) {
  const colors = { good: 'text-green-600 bg-green-50', bad: 'text-error bg-error-container', info: 'text-primary-container bg-primary/10', neutral: 'text-outline bg-surface-container', warn: 'text-amber-600 bg-amber-50' }[tone] || 'text-outline bg-surface-container';
  return h('article', { className: 'glass-card rounded-2xl p-lg flex items-center justify-between', key: label }, [
    h('div', null, [
      h('p', { className: 'text-label-caps font-label-caps uppercase text-outline' }, label),
      h('p', { className: 'mt-2 font-mono text-h2 font-h2 tracking-tight' }, value)
    ]),
    h('div', { className: `grid h-12 w-12 place-items-center rounded-xl ${colors}` },
      h(MaterialIcon, { className: 'text-[24px]', name: icon })
    )
  ]);
}

/* ---------------- Setup Page ---------------- */

function SetupPage({ copiedSetupCommand, onCopySetupCommand, selectedSetupAgentId, setSelectedSetupAgentId, setupAgentId = null, setupHealth, t }) {
  const setupAgentName = setupAgentId ? agentMeta(setupAgentId)[1] : null;
  const checks = (setupHealth?.checks || []).filter((check) =>
    setupAgentId
      ? check.agent_id === setupAgentId ||
        (!check.agent_id && setupAgentName && check.label.toLowerCase() === setupAgentName.toLowerCase())
      : Boolean(knownAgentIdForSetupCheck(check))
  );
  const scopedOk = checks.length > 0 && checks.every((check) => check.status === 'ok');
  const setupAgents = knownAgents.filter(([agentId]) => !setupAgentId || agentId === setupAgentId).map((agent) => {
    const [agentId] = agent;
    return { agent, check: setupCheckForAgent(setupHealth, agentId) };
  });
  const selectedId = setupAgentId || selectedSetupAgentId || setupAgents.find(({ check }) => check?.status !== 'ok')?.agent[0] || setupAgents[0]?.agent[0] || 'codex';
  const selectedAgent = agentMeta(selectedId);
  const selectedCheck = setupCheckForAgent(setupHealth, selectedId);
  const selectedCommand = setupCommandForAgent(setupHealth, selectedId);
  const selectedSkill = setupSkillForAgent(selectedAgent, selectedCommand);
  const selectedCopyState = copiedSetupCommand?.command === selectedCommand ? copiedSetupCommand.status : 'idle';
  const selectedCopyLabel = selectedCopyState === 'copied' ? t.copied : selectedCopyState === 'failed' ? t.copyFailed : t.connectAction;
  const selectedConnected = selectedCheck?.status === 'ok';
  return h('section', { className: 'space-y-lg', id: 'setup' }, [
    h(PageHeader, {
      eyebrow: t.eyebrowSetup,
      title: setupAgentName ? `${setupAgentName} · ${t.setupHealth}` : t.setupWizardTitle,
      subtitle: t.setupModuleBody,
      actions: [
        chip(scopedOk || (!setupAgentName && setupHealth?.ok) ? t.setupReady : t.setupCheck, scopedOk || (!setupAgentName && setupHealth?.ok) ? 'good' : 'warn', 'status')
      ]
    }),
    h('div', {
      'aria-modal': 'true',
      'data-action': 'open-agent-setup-wizard',
      className: 'glass-card-strong rounded-3xl border border-primary/10 p-lg shadow-2xl shadow-primary/10',
      role: 'dialog'
    }, [
      h('div', { className: 'mb-lg flex flex-wrap items-start justify-between gap-4' }, [
        h('div', null, [
          h('h3', { className: 'text-h3 font-h3 tracking-tight' }, t.setupWizardTitle),
          h('p', { className: 'mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant' }, t.setupWizardBody)
        ]),
        chip(selectedConnected ? t.setupReady : t.setupCheck, selectedConnected ? 'good' : 'warn')
      ]),
      h('div', { className: 'grid grid-cols-1 gap-gutter lg:grid-cols-[0.8fr_1.2fr_0.8fr]' }, [
        h('section', { className: 'space-y-sm' }, [
          h('h4', { className: 'text-label-caps font-label-caps uppercase text-outline' }, t.setupChooseAgent),
          ...setupAgents.map(({ agent, check }) => {
            const [agentId, label, brand, logo, gradient] = agent;
            const selected = agentId === selectedId;
            return h('button', {
              'data-action': 'select-setup-agent',
              'data-agent-id': agentId,
              className: [
                'flex w-full items-center justify-between gap-3 rounded-2xl border p-md text-left transition-all',
                selected ? 'border-primary/50 bg-primary/5' : 'border-outline-variant/30 bg-white/60 hover:border-primary/30'
              ].join(' '),
              key: agentId,
              onClick: () => setSelectedSetupAgentId?.(agentId),
              type: 'button'
            }, [
              h('span', { className: 'flex items-center gap-3' }, [
                h('span', { className: `grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${gradient} text-white` },
                  h(AgentLogo, { className: 'h-6 w-6 text-white', logo })
                ),
                h('span', null, [
                  h('span', { className: 'block text-sm font-semibold text-on-surface' }, label),
                  h('span', { className: 'block text-xs text-outline' }, brand)
                ])
              ]),
              chip(check?.status || 'missing', check?.status === 'ok' ? 'good' : 'warn')
            ]);
          })
        ]),
        h('section', { className: 'space-y-md' }, [
          h('h4', { className: 'text-label-caps font-label-caps uppercase text-outline' }, t.setupSteps),
          h('article', { className: 'rounded-2xl border border-outline-variant/30 bg-white/70 p-md' }, [
            h('div', { className: 'mb-sm flex items-center gap-2 font-semibold text-on-surface' }, [
              h(MaterialIcon, { className: 'text-[18px]', name: 'terminal' }),
              t.commandLineSetup
            ]),
            h('code', { className: 'block break-words rounded-xl bg-slate-950 px-md py-3 font-mono text-mono text-blue-300' }, `${t.connectAction}: ${selectedCommand}`),
            h('button', {
              'data-action': 'copy-setup-command',
              'data-command': selectedCommand,
              'data-copy-state': selectedCopyState,
              className: 'mt-sm inline-flex items-center gap-2 rounded-lg border border-outline-variant/40 bg-white px-3 py-1.5 text-label-caps font-label-caps uppercase text-on-surface hover:border-primary/40',
              onClick: () => onCopySetupCommand?.(selectedCommand),
              type: 'button'
            }, [
              h(MaterialIcon, { className: 'text-[16px]', name: selectedCopyState === 'copied' ? 'check' : selectedCopyState === 'failed' ? 'error' : 'content_copy' }),
              selectedCopyLabel
            ]),
            h('span', { 'aria-live': 'polite', className: 'ml-2 text-xs text-outline' }, selectedCopyState === 'idle' ? '' : selectedCopyLabel)
          ]),
          h('article', { className: 'rounded-2xl border border-outline-variant/30 bg-white/70 p-md' }, [
            h('div', { className: 'mb-sm flex items-center gap-2 font-semibold text-on-surface' }, [
              h(MaterialIcon, { className: 'text-[18px]', name: 'smart_toy' }),
              t.agentSelfSetup
            ]),
            h('p', { className: 'mb-sm text-sm text-on-surface-variant' }, t.agentSelfSetupBody),
            h('code', { className: 'block max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 px-md py-3 font-mono text-mono text-blue-300' }, selectedSkill)
          ])
        ]),
        h('section', { className: 'space-y-md rounded-2xl border border-outline-variant/30 bg-white/70 p-md' }, [
          h('h4', { className: 'text-label-caps font-label-caps uppercase text-outline' }, t.setupSuccess),
          h('div', { className: 'flex items-center gap-3' }, [
            h('div', { className: `grid h-12 w-12 place-items-center rounded-full ${selectedConnected ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}` },
              h(MaterialIcon, { className: 'text-[24px]', name: selectedConnected ? 'check_circle' : 'pending' })
            ),
            h('div', null, [
              h('p', { className: 'font-semibold text-on-surface' }, selectedConnected ? 'Connected' : selectedCheck?.status || 'Missing'),
              h('p', { className: 'text-sm text-on-surface-variant' }, selectedConnected ? t.connectedNotice : t.pendingNotice)
            ])
          ]),
          h('a', {
            'data-action': 'check-agent-connection',
            className: 'inline-flex items-center gap-2 rounded-lg border border-outline-variant/40 bg-white px-3 py-1.5 text-label-caps font-label-caps uppercase text-on-surface hover:border-primary/40',
            href: `/agents/${encodeURIComponent(selectedId)}/setup`
          }, [
            h(MaterialIcon, { className: 'text-[16px]', name: 'fact_check' }),
            t.checkConnection
          ])
        ])
      ])
    ])
  ]);
}

/* ---------------- Docs Page ---------------- */

function commandBlock(command, key) {
  return h('code', {
    className: 'block break-words rounded-xl bg-slate-950 px-md py-3 font-mono text-mono text-blue-300',
    key
  }, command);
}

function docStep(icon, title, body, commands = []) {
  return h('article', { className: 'glass-card rounded-3xl p-lg', key: title }, [
    h('div', { className: 'mb-md flex items-start gap-4' }, [
      h('div', { className: 'grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary-container' },
        h(MaterialIcon, { className: 'text-[24px]', name: icon })
      ),
      h('div', null, [
        h('h3', { className: 'text-h3 font-h3 tracking-tight' }, title),
        h('p', { className: 'mt-2 text-sm leading-6 text-on-surface-variant' }, body)
      ])
    ]),
    commands.length
      ? h('div', { className: 'space-y-sm' }, commands.map((command, index) => commandBlock(command, `${title}-${index}`)))
      : null
  ].filter(Boolean));
}

function DocsPage({ t }) {
  return h('section', { className: 'space-y-lg', id: 'docs' }, [
    h(PageHeader, {
      eyebrow: t.navDocs,
      title: t.docsTitle,
      subtitle: t.docsBody,
      actions: [chip(t.realDataFirst, 'info', 'real-data')]
    }),
    h('div', { className: 'grid grid-cols-1 xl:grid-cols-2 gap-gutter' }, [
      h('section', { className: 'space-y-md', key: 'user' }, [
        h('div', { className: 'glass-card-strong rounded-3xl p-lg' }, [
          h('h3', { className: 'text-h3 font-h3 tracking-tight' }, t.docsUserGuide),
          h('p', { className: 'mt-2 text-sm leading-6 text-on-surface-variant' }, t.docsUserBody)
        ]),
        docStep('dashboard', t.docsInspectRuns, t.docsInspectRunsBody),
        docStep('recommend', t.docsImproveWorkflow, t.docsImproveWorkflowBody)
      ]),
      h('section', { className: 'space-y-md', key: 'developer' }, [
        h('div', { className: 'glass-card-strong rounded-3xl p-lg' }, [
          h('h3', { className: 'text-h3 font-h3 tracking-tight' }, t.docsDeveloperGuide),
          h('p', { className: 'mt-2 text-sm leading-6 text-on-surface-variant' }, t.docsDeveloperBody)
        ]),
        docStep('terminal', t.docsStartConsole, t.docsStartConsoleBody, [
          'npm run dev',
          'npm run inbox -- --db .runq/dev.db --port 4545'
        ]),
        docStep('integration_instructions', t.docsConnectAgents, t.docsConnectAgentsBody, [
          'node src/cli.js init all --db .runq/runq.db',
          'node src/cli.js init codex --db .runq/runq.db',
          'node src/cli.js doctor --db .runq/runq.db'
        ])
      ])
    ])
  ]);
}

/* ---------------- Evaluations Page ---------------- */

function EvaluationsPage({ sessions, t }) {
  const stats = calcStats(sessions);
  const verified = sessions.filter((s) => Number(s.telemetry?.verification_count || 0) > 0).length;
  const accepted = sessions.filter((s) => s.satisfaction?.label === 'accepted').length;
  const reviewQueue = sessions.filter((session) => runMatchesFilter(session, 'needs_review'));
  return h('section', { className: 'space-y-lg', id: 'evaluations' }, [
    h(PageHeader, {
      eyebrow: t.eyebrowEvaluations,
      title: t.navEvaluations,
      subtitle: t.evalsBody,
      actions: [chip(t.realDataFirst, 'info', 'real-data')]
    }),
    h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-gutter' }, [
      summaryStat(t.evalsPassRate, `${(stats.avgConfidence * 100).toFixed(0)}%`, 'good', 'verified'),
      summaryStat(t.evalsCoverage, `${verified}/${sessions.length}`, 'info', 'task_alt'),
      summaryStat(t.evalsAccepted, `${accepted}/${sessions.length}`, 'good', 'thumb_up_alt')
    ]),
    h('div', { className: 'glass-card rounded-3xl p-lg' }, [
      h('div', { className: 'mb-md flex items-center justify-between gap-3' }, [
        h('h3', { className: 'text-h3 font-h3 tracking-tight' }, t.evalQueue),
        chip(t.needsReview, reviewQueue.length ? 'warn' : 'good', 'queue-status')
      ]),
      reviewQueue.length === 0
        ? h('p', { className: 'rounded-2xl bg-surface-container-low/60 p-md text-sm text-outline' }, t.noEvalQueue)
        : h('div', { className: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md' }, reviewQueue.map((session) => {
            const verdict = verdictFor(session, t);
            return h('article', { className: 'rounded-2xl border border-outline-variant/30 bg-white/60 p-md', key: `eval-${session.session_id}` }, [
              h('div', { className: 'mb-2 flex items-center justify-between gap-2' }, [
                h('span', { className: 'truncate font-mono text-mono text-primary' }, `#${session.session_id}`),
                chip(verdict.label, verdict.tone, 'verdict')
              ]),
              h('p', { className: 'text-sm font-semibold text-on-surface' }, agentMeta(session.framework)[1]),
              h('p', { className: 'mt-1 text-xs text-outline' }, `${t.confidence}: ${trustScoreValue(session.quality)}% · ${t.verificationCount}: ${session.telemetry?.verification_passed_count || 0}/${session.telemetry?.verification_count || 0}`),
              h('a', {
                'data-action': 'open-evaluation-trace',
                className: 'mt-md inline-flex items-center gap-2 rounded-lg border border-outline-variant/40 bg-white px-3 py-1.5 text-label-caps font-label-caps uppercase text-primary hover:border-primary/40',
                href: `/traces?session=${encodeURIComponent(session.session_id)}`
              }, [
                h(MaterialIcon, { className: 'text-[16px]', name: 'timeline' }),
                t.openTrace
              ])
            ]);
          }))
    ]),
    h('div', { className: 'glass-card-strong rounded-3xl overflow-hidden' }, [
      h('div', { className: 'border-b border-white/40 px-lg py-md' },
        h('h3', { className: 'text-h3 font-h3 tracking-tight' }, t.runHistory)
      ),
      sessions.length === 0
        ? h('p', { className: 'p-lg text-sm text-outline' }, t.noRuns)
        : h('table', { className: 'w-full text-left' }, [
            h('thead', { className: 'bg-surface-container-low/60' },
              h('tr', null, [
                h('th', { className: 'p-md text-label-caps font-label-caps uppercase text-outline' }, t.runId),
                h('th', { className: 'p-md text-label-caps font-label-caps uppercase text-outline' }, t.framework),
                h('th', { className: 'p-md text-label-caps font-label-caps uppercase text-outline' }, t.satisfaction),
                h('th', { className: 'p-md text-right text-label-caps font-label-caps uppercase text-outline' }, t.confidence),
                h('th', { className: 'p-md text-right text-label-caps font-label-caps uppercase text-outline' }, t.events)
              ])
            ),
            h('tbody', { className: 'divide-y divide-white/40 text-sm' },
              sessions.map((s) => h('tr', { className: 'hover:bg-white/40', key: s.session_id }, [
                h('td', { className: 'p-md font-mono text-mono text-primary' }, `#${s.session_id}`),
                h('td', { className: 'p-md font-semibold' }, agentMeta(s.framework)[1]),
                h('td', { className: 'p-md' }, chip(s.satisfaction?.label || 'unknown', satisfactionTone(s.satisfaction?.label), 'sat')),
                h('td', { className: 'p-md text-right font-mono text-mono' }, `${trustScoreValue(s.quality)}%`),
                h('td', { className: 'p-md text-right font-mono text-mono' }, s.event_count)
              ]))
            )
          ])
    ])
  ]);
}

/* ---------------- Health Report ---------------- */

function formatTokenCount(value) {
  const n = Number(value || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function HealthReportPage({ agentId, dbPath, initialReport, t, lang }) {
  const [report, setReport] = useState(initialReport);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const displayName = report?.display_name || agentMeta(agentId)[1];

  const runCheckup = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const url = `/api/agents/${encodeURIComponent(agentId)}/checkup${dbPath ? `?db=${encodeURIComponent(dbPath)}` : ''}`;
      const response = await fetch(url, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error || t.checkupError);
      } else {
        setResult(data);
        // Refresh the page so server-side getAgentHealthReport re-runs.
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }
    } catch (err) {
      setError(err?.message || t.checkupError);
    } finally {
      setRunning(false);
    }
  };

  const sessionCount = report?.session_count || 0;
  const hasSessions = sessionCount > 0;

  const headerActions = [
    h('button', {
      'data-action': 'run-agent-checkup',
      'data-agent-id': agentId,
      className: 'inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm transition hover:opacity-90 disabled:opacity-60',
      disabled: running,
      key: 'cta',
      onClick: runCheckup,
      type: 'button'
    }, [
      h(MaterialIcon, { className: 'text-[18px]', key: 'i', name: running ? 'sync' : 'health_and_safety' }),
      running ? t.runningCheckup : (hasSessions ? t.runCheckupAgain : t.runCheckup)
    ])
  ];

  const sourceChip = report?.first_seen
    ? chip(`${t.sourceLabel}: ${report.session_count} session(s)`, 'info', 'src')
    : chip(t.checkupEmpty, 'neutral', 'src');

  const timeRangeLabel = (report?.first_seen && report?.last_seen)
    ? `${String(report.first_seen).slice(0, 10)} → ${String(report.last_seen).slice(0, 10)}`
    : '—';

  const trustBuckets = Array.isArray(report?.trust_score_buckets) ? report.trust_score_buckets : [];
  const maxBucketCount = trustBuckets.reduce((m, b) => Math.max(m, b.count), 0) || 1;

  const activity = Array.isArray(report?.activity_by_day) ? report.activity_by_day : [];
  const maxActivity = activity.reduce((m, b) => Math.max(m, b.count), 0) || 1;

  const tools = Array.isArray(report?.tool_top) ? report.tool_top : [];
  const maxToolCount = tools.reduce((m, b) => Math.max(m, b.count), 0) || 1;

  const resultBanner = (() => {
    if (error) return chip(`${t.checkupError}: ${error}`, 'bad', 'err');
    if (!result) return null;
    if (result.status === 'absent') return chip(t.checkupAbsent, 'warn', 'absent');
    if (result.status === 'empty') {
      const suffix = result.hooks_installed ? t.checkupHooksInstalledSuffix : '';
      return chip(`${t.checkupEmpty}${suffix}`, result.hooks_installed ? 'info' : 'neutral', 'empty');
    }
    const hookSuffix = result.hooks_installed ? t.checkupHooksInstalledSuffix : '';
    const msg = `${t.checkupResultPrefix} ${result.imported_events}${t.checkupResultEventsSuffix} ${result.imported_sessions} ${t.checkupResultSessionsSuffix}${hookSuffix}`;
    return chip(msg, 'good', 'ok');
  })();

  return h('section', { className: 'space-y-lg', id: 'health-report' }, [
    h(PageHeader, {
      eyebrow: `${t.healthReportEyebrow} · ${displayName}`,
      title: `${displayName} ${t.healthReportTitle}`,
      subtitle: t.healthReportBody,
      actions: headerActions
    }),
    resultBanner ? h('div', { key: 'banner' }, resultBanner) : null,
    h('div', { className: 'grid grid-cols-1 md:grid-cols-4 gap-gutter', key: 'stats' }, [
      summaryStat(t.sessionCount, String(sessionCount), 'info', 'history'),
      summaryStat(t.eventTotal, String(report?.event_count || 0), 'info', 'timeline'),
      summaryStat(t.medianTrust, report?.trust_score_median == null ? '—' : `${report.trust_score_median}`, 'good', 'verified'),
      summaryStat(t.timeRange, timeRangeLabel, 'neutral', 'date_range')
    ]),
    h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-gutter', key: 'charts' }, [
      h('article', { className: 'glass-card rounded-3xl p-lg', key: 'trust' }, [
        h('h3', { className: 'text-h3 font-h3 tracking-tight' }, t.trustDistribution),
        h('div', { className: 'mt-md space-y-2' }, trustBuckets.map((b) =>
          h('div', { className: 'flex items-center gap-3', key: b.bucket }, [
            h('span', { className: 'w-16 font-mono text-mono text-outline' }, b.bucket),
            h('div', { className: 'h-3 flex-1 overflow-hidden rounded-full bg-surface-container-low' },
              h('div', {
                className: 'h-full rounded-full bg-primary/70',
                style: { width: `${(b.count / maxBucketCount) * 100}%` }
              })
            ),
            h('span', { className: 'w-8 text-right text-sm text-on-surface' }, String(b.count))
          ])
        ))
      ]),
      h('article', { className: 'glass-card rounded-3xl p-lg', key: 'activity' }, [
        h('h3', { className: 'text-h3 font-h3 tracking-tight' }, t.activityRecent),
        h('div', { className: 'mt-md flex items-end gap-2 h-32' }, activity.map((b) =>
          h('div', { className: 'flex flex-1 flex-col items-center gap-1', key: b.date }, [
            h('div', { className: 'w-full rounded-t bg-primary/70 transition-all', style: { height: `${(b.count / maxActivity) * 100}%`, minHeight: b.count > 0 ? '4px' : '0' } }),
            h('span', { className: 'text-[10px] text-outline' }, String(b.date).slice(5))
          ])
        ))
      ])
    ]),
    h('article', { className: 'glass-card rounded-3xl p-lg', key: 'tools' }, [
      h('h3', { className: 'text-h3 font-h3 tracking-tight' }, t.topTools),
      tools.length === 0
        ? h('p', { className: 'mt-md text-sm text-outline' }, t.noToolCalls)
        : h('ul', { className: 'mt-md space-y-2' }, tools.map((row) =>
            h('li', { className: 'flex items-center gap-3', key: row.tool }, [
              h('span', { className: 'w-48 truncate font-mono text-mono text-on-surface' }, row.tool),
              h('div', { className: 'h-3 flex-1 overflow-hidden rounded-full bg-surface-container-low' },
                h('div', { className: 'h-full rounded-full bg-primary/70', style: { width: `${(row.count / maxToolCount) * 100}%` } })
              ),
              h('span', { className: 'w-12 text-right text-sm text-on-surface' }, String(row.count))
            ])
          ))
    ]),
    h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-gutter', key: 'sessions' }, [
      h('article', { className: 'glass-card rounded-3xl p-lg', key: 'top' }, [
        h('h3', { className: 'text-h3 font-h3 tracking-tight' }, t.topSessions),
        (report?.top_sessions || []).length === 0
          ? h('p', { className: 'mt-md text-sm text-outline' }, t.noSessions)
          : h('ul', { className: 'mt-md space-y-2' }, report.top_sessions.map((s) =>
              h('li', { className: 'flex items-center justify-between gap-2 rounded-xl border border-outline-variant/30 bg-white/60 p-3', key: s.session_id }, [
                h('a', {
                  className: 'font-mono text-mono text-primary hover:underline',
                  href: `/traces?session=${encodeURIComponent(s.session_id)}${dbPath ? `&db=${encodeURIComponent(dbPath)}` : ''}`
                }, `#${String(s.session_id).slice(0, 16)}`),
                h('span', { className: 'font-mono text-mono text-on-surface' }, `trust ${s.trust_score}`)
              ])
            ))
      ]),
      h('article', { className: 'glass-card rounded-3xl p-lg', key: 'bottom' }, [
        h('h3', { className: 'text-h3 font-h3 tracking-tight' }, t.bottomSessions),
        (report?.bottom_sessions || []).length === 0
          ? h('p', { className: 'mt-md text-sm text-outline' }, t.noSessions)
          : h('ul', { className: 'mt-md space-y-2' }, report.bottom_sessions.map((s) =>
              h('li', { className: 'flex items-center justify-between gap-2 rounded-xl border border-outline-variant/30 bg-white/60 p-3', key: s.session_id }, [
                h('a', {
                  className: 'font-mono text-mono text-primary hover:underline',
                  href: `/traces?session=${encodeURIComponent(s.session_id)}${dbPath ? `&db=${encodeURIComponent(dbPath)}` : ''}`
                }, `#${String(s.session_id).slice(0, 16)}`),
                h('span', { className: 'font-mono text-mono text-on-surface' }, `trust ${s.trust_score}`)
              ])
            ))
      ])
    ]),
    h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-gutter', key: 'tokens' }, [
      summaryStat(t.inputTokens, formatTokenCount(report?.total_input_tokens), 'info', 'input'),
      summaryStat(t.outputTokens, formatTokenCount(report?.total_output_tokens), 'info', 'output')
    ])
  ]);
}

/* ---------------- App Root ---------------- */

export function RunInboxApp({ initialSessions = [], initialEvents = [], setupHealth = null, activeView = 'agents', initialLang = 'zh', initialAgentId = null, initialRunSearch = '', dbPath = '', dataSources = [], initialHealthReport = null }) {
  const [lang, setLangState] = useState(() => normalizeLang(initialLang));
  const t = copy[lang];
  const [sessions, setSessions] = useState(initialSessions);
  const initialAgentSessions = initialAgentId ? initialSessions.filter((s) => s.framework === initialAgentId) : initialSessions;
  const [selectedAgentId, setSelectedAgentId] = useState(initialAgentId ?? initialSessions[0]?.framework ?? 'claude_code');
  const [selectedSessionId, setSelectedSessionId] = useState(initialAgentSessions[0]?.session_id ?? initialSessions[0]?.session_id ?? null);
  const [events, setEvents] = useState(initialEvents);
  const [runFilter, setRunFilter] = useState('all');
  const [runSearch, setRunSearch] = useState(initialRunSearch);
  const [eventSearch, setEventSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [feedbackPending, setFeedbackPending] = useState(null);
  const [feedbackError, setFeedbackError] = useState(null);
  const [recommendationNotes, setRecommendationNotes] = useState({});
  const [copiedSetupCommand, setCopiedSetupCommand] = useState(null);
  const [selectedSetupAgentId, setSelectedSetupAgentId] = useState(initialAgentId ?? 'codex');
  const [setupWizardOpen, setSetupWizardOpen] = useState(false);

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
  }, [dbPath, selectedSessionId]);

  useEffect(() => {
    if (!selectedSessionId) return undefined;
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      refreshEventsForSession(selectedSessionId).catch(() => {});
    }, EVENT_AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [dbPath, selectedSessionId]);

  function setLang(next) {
    const normalized = normalizeLang(next);
    setStoredLang(normalized);
    setLangState(normalized);
  }

  const selectedSession = useMemo(() => sessions.find((s) => s.session_id === selectedSessionId) ?? null, [sessions, selectedSessionId]);
  const agents = useMemo(() => deriveAgents(sessions, setupHealth), [sessions, setupHealth]);
  const selectedAgent = useMemo(() => agents.find((a) => a.agent_id === selectedAgentId) ?? agents[0] ?? null, [agents, selectedAgentId]);
  const agentSessions = selectedAgent ? selectedAgent.sessions : [];
  const visibleSessions = useMemo(() => sessions.filter((s) =>
    runMatchesFilter(s, runFilter) && runMatchesSearch(s, runSearch) && (!selectedAgent || s.framework === selectedAgent.agent_id)
  ), [sessions, runFilter, runSearch, selectedAgent]);

  const stats = calcStats(sessions);
  const allRecs = useMemo(() =>
    sessions.flatMap((s) => (s.recommendations || []).map((r) => ({ ...r, session_id: s.session_id }))),
    [sessions]
  );
  const recommendationSessions = useMemo(() =>
    initialAgentId ? sessions.filter((s) => s.framework === initialAgentId) : sessions,
    [initialAgentId, sessions]
  );
  const notificationRecs = useMemo(() =>
    recommendationSessions.flatMap((s) => (s.recommendations || []).map((r) => ({ ...r, session_id: s.session_id }))),
    [recommendationSessions]
  );
  const notificationCount = notificationRecs.filter((r) => !r.state || r.state.status === 'new').length;
  const notificationHref = initialAgentId
    ? `/agents/${encodeURIComponent(initialAgentId)}/recommendations`
    : '/recommendations';
  const chartPoints = groupRunsForChart(sessions);

  async function refresh() {
    const response = await fetch(`/api/sessions${apiDbQuery(dbPath)}`);
    const next = await response.json();
    setSessions(next);
    const nextSelected = selectedSessionId && next.some((s) => s.session_id === selectedSessionId)
      ? selectedSessionId
      : next[0]?.session_id ?? null;
    setSelectedSessionId(nextSelected);
    if (nextSelected) await selectSession(nextSelected);
    else setEvents([]);
  }

  async function selectSession(sessionId) {
    setSelectedSessionId(sessionId);
    setEventSearch('');
    setEventTypeFilter('all');
    await refreshEventsForSession(sessionId);
  }

  async function refreshEventsForSession(sessionId) {
    const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/events${apiDbQuery(dbPath)}`);
    setEvents(await response.json());
  }

  function setRecommendationNote(key, note) {
    setRecommendationNotes((current) => ({ ...current, [key]: note }));
  }

  async function submitRecommendationFeedback(sessionId, recommendationId, decision, note = '') {
    if (!sessionId || !recommendationId || !decision) return;
    const key = `${sessionId}:${recommendationId}`;
    setFeedbackPending(key);
    setFeedbackError(null);
    try {
      const response = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/recommendations/${encodeURIComponent(recommendationId)}/feedback${apiDbQuery(dbPath)}`,
        { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ decision, note: note.trim() || null }) }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${response.status}`);
      }
      await refresh();
      setRecommendationNotes((current) => ({ ...current, [key]: '' }));
    } catch (error) {
      setFeedbackError(`${t.feedbackError}: ${error.message}`);
    } finally {
      setFeedbackPending(null);
    }
  }

  async function copySetupCommand(command) {
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command);
      setCopiedSetupCommand({ command, status: 'copied' });
    } catch {
      setCopiedSetupCommand({ command, status: 'failed' });
    }
  }

  function openSetupWizard(agentId = null) {
    if (agentId) setSelectedSetupAgentId(agentId);
    setSetupWizardOpen(true);
  }

  function closeSetupWizard() {
    setSetupWizardOpen(false);
  }

  const breadcrumbByView = {
    agents: t.navAgents,
    sessions: t.navSessions,
    traces: t.navTraces,
    evaluations: t.navEvaluations,
    recommendations: t.navRecommendations,
    setup: t.navSetup,
    docs: t.navDocs
  };

  const viewContent = {
    agents: [
      sessions.length === 0 ? h(DataSourceEmptyState, { dataSources, dbPath, key: 'empty-source', t }) : null,
      h(AgentFleet, { agents, key: 'fleet', onOpenSetupWizard: openSetupWizard, t }),
      h('p', { className: 'sr-only', key: 'product-modules' }, t.productSections),
      h('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-gutter', key: 'mid' }, [
        h(PerformanceTrend, { chartPoints, key: 'perf', stats, t }),
        h(AdvisorPanel, { key: 'advisor', recommendations: allRecs, t })
      ])
    ],
    sessions: [
      h(SessionsDetail, {
        agentSessions, eventSearch, eventTypeFilter, key: 'detail',
        agents, runFilter, runSearch, selectedAgent,
        selectedEvents: events, selectedSession, selectedSessionId, selectSession,
        setEventSearch, setEventTypeFilter, setRunFilter, setRunSearch, t, visibleSessions
      })
    ],
    evaluations: [h(EvaluationsPage, { key: 'evals', sessions: agentSessions, t })],
    recommendations: [
      h(RecommendationsPage, {
        feedbackError, feedbackPending, key: 'recs',
        onFeedback: submitRecommendationFeedback, recommendationNotes, sessions: recommendationSessions, setRecommendationNote, t
      })
    ],
    setup: [h(SetupPage, { copiedSetupCommand, key: 'setup', onCopySetupCommand: copySetupCommand, selectedSetupAgentId, setSelectedSetupAgentId, setupAgentId: initialAgentId, setupHealth, t })],
    docs: [h(DocsPage, { key: 'docs', t })],
    'health-report': [h(HealthReportPage, {
      agentId: initialAgentId,
      dbPath,
      initialReport: initialHealthReport,
      key: 'health-report',
      lang,
      t
    })]
  }[activeView] || [];

  const setupWizardOverlay = setupWizardOpen && activeView !== 'setup'
    ? h('div', { className: 'fixed inset-0 z-50', key: 'setup-wizard-overlay' }, [
        h('button', {
          'aria-label': 'Close setup wizard',
          className: 'absolute inset-0 h-full w-full bg-slate-950/40 backdrop-blur-sm',
          onClick: closeSetupWizard,
          type: 'button'
        }),
        h('div', { className: 'absolute inset-x-4 bottom-6 top-20 overflow-auto rounded-3xl bg-surface p-md shadow-2xl sm:left-24 sm:right-8' }, [
          h('button', {
            'data-action': 'close-agent-setup-wizard',
            'aria-label': 'Close setup wizard',
            className: 'absolute right-5 top-5 z-10 grid h-10 w-10 place-items-center rounded-full border border-outline-variant/40 bg-white text-on-surface shadow-sm hover:border-primary/40',
            onClick: closeSetupWizard,
            type: 'button'
          }, h(MaterialIcon, { className: 'text-[20px]', name: 'close' })),
          h(SetupPage, {
            copiedSetupCommand,
            key: 'setup-wizard',
            onCopySetupCommand: copySetupCommand,
            selectedSetupAgentId,
            setSelectedSetupAgentId,
            setupAgentId: null,
            setupHealth,
            t
          })
        ])
      ])
    : null;

  return h('div', {
    className: 'min-h-screen text-on-background',
    'data-auto-refresh-events-ms': EVENT_AUTO_REFRESH_MS,
    'data-auto-refresh-sessions-ms': SESSION_AUTO_REFRESH_MS
  }, [
    h(Sidebar, { activeView, dbPath, key: 'sidebar', t }),
    h(MobileNav, { activeView, dbPath, key: 'mobile-nav', t }),
    h(TopBar, { activeView, dataSources, dbPath, key: 'top', lang, notificationCount, notificationHref: appendDbParam(notificationHref, dbPath), onRefresh: refresh, searchQuery: runSearch, selectedAgent, setLang, t }),
    h('main', { className: 'min-h-screen px-4 pb-28 pt-24 sm:ml-20 sm:px-8 sm:pb-12' }, [
      h('div', { className: 'mx-auto max-w-[1400px] space-y-8', key: 'container' }, viewContent)
    ]),
    setupWizardOverlay,
    h(FloatingHelp, { key: 'fab', t })
  ]);
}
