'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { percent, summarizeEvent } from './format.js';

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
    eyebrow: 'Trace Telemetry',
    sessionList: '会话列表',
    allAgents: '全部 Agent',
    searchSession: '搜索会话',
    noSessions: '没有会话匹配当前过滤条件。',
    selectSession: '选择一个会话查看它的追踪。',
    evidenceTimeline: '证据时间线',
    groupedTraceEvents: '分组追踪事件',
    sessionInspector: '节点详情',
    noSessionSelected: '未选择会话',
    framework: '框架',
    modelCalls: '模型调用',
    commands: '命令',
    verification: '验证',
    failed: '失败',
    tokens: 'tokens',
    totalTokens: '总 Tokens',
    outcomeConfidence: 'Outcome 可信度',
    satisfaction: '满意度',
    keyMetrics: '关键指标',
    scoring: '评分与可信度',
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
    eyebrow: 'Trace Telemetry',
    sessionList: 'Session List',
    allAgents: 'All agents',
    searchSession: 'Search session',
    noSessions: 'No sessions match the current filters.',
    selectSession: 'Select a session to inspect its trace.',
    evidenceTimeline: 'Evidence timeline',
    groupedTraceEvents: 'Grouped trace events',
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
    scoring: 'Scoring & Confidence',
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

function timeLabel(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toISOString().slice(11, 19);
}

function Sidebar({ activeView }) {
  return h('aside', {
    className: 'fixed left-0 top-0 z-50 flex h-screen w-20 flex-col items-center border-r border-white/30 bg-white/70 py-8 shadow-2xl shadow-primary/5 backdrop-blur-xl'
  }, [
    h('a', {
      className: 'mb-12 font-mono text-xl font-black tracking-tighter text-primary-container hover:scale-105 transition-transform',
      href: '/agents',
      key: 'logo'
    }, 'RQ'),
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

function SessionPicker({ sessions, selectedSessionId, onSelect, framework, setFramework, query, setQuery, t }) {
  const frameworks = ['all', ...Array.from(new Set(sessions.map((s) => s.framework))).sort()];
  return h('section', { className: 'glass-card rounded-3xl p-lg' }, [
    h('div', { className: 'mb-md flex items-start justify-between gap-3' }, [
      h('div', { className: 'min-w-0' }, [
        h('div', { className: 'text-label-caps font-label-caps uppercase text-outline' }, t.sessionList),
        h('h3', { className: 'mt-2 truncate text-h3 font-h3 tracking-tight' }, selectedSessionId || t.noSessionSelected)
      ]),
      h('span', { className: 'rounded-full bg-surface-container-low/80 px-2 py-1 font-mono text-mono text-outline' }, sessions.length)
    ]),
    h('div', { className: 'grid gap-2' }, [
      h('select', {
        className: 'w-full rounded-lg border-none bg-surface-container-low px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-primary',
        onChange: (e) => setFramework(e.target.value),
        value: framework
      }, frameworks.map((value) => h('option', { key: value, value }, value === 'all' ? t.allAgents : value))),
      h('div', { className: 'relative' }, [
        h(MaterialIcon, { className: 'absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline', name: 'search' }),
        h('input', {
          className: 'w-full rounded-lg border-none bg-surface-container-low pl-10 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary',
          onChange: (e) => setQuery(e.target.value),
          placeholder: t.searchSession,
          type: 'search',
          value: query
        })
      ]),
      sessions.length === 0
        ? h('p', { className: 'rounded-2xl bg-surface-container-low/60 p-3 text-sm text-outline' }, t.noSessions)
        : h('div', { className: 'max-h-72 space-y-1 overflow-auto' }, sessions.map((session) =>
            h('button', {
              className: [
                'block w-full truncate rounded-xl border px-3 py-2 text-left font-mono text-mono transition-colors',
                session.session_id === selectedSessionId
                  ? 'border-primary bg-primary/5 text-primary-container'
                  : 'border-outline-variant/40 bg-white/60 text-on-surface hover:border-primary/40'
              ].join(' '),
              key: session.session_id,
              onClick: () => onSelect(session.session_id),
              type: 'button'
            }, `#${session.session_id}`)
          ))
    ])
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

function ResultBadge({ session, t }) {
  if (!session) return null;
  const score = Math.round((session.quality?.outcome_confidence || 0) * 100);
  const tokens = session.telemetry?.total_tokens || 0;
  const cmds = session.telemetry?.command_count || 0;
  const verified = (session.telemetry?.verification_count || 0) - (session.telemetry?.verification_failed_count || 0);
  return h('div', { className: 'glass-card-strong relative flex flex-wrap items-center justify-between gap-md overflow-hidden rounded-3xl p-lg' }, [
    h('div', { className: 'flex items-center gap-md' }, [
      h('div', { className: 'grid h-16 w-16 place-items-center rounded-2xl bg-green-500/10 text-green-600 shadow-[0_0_20px_rgba(34,197,94,0.20)]' },
        h(MaterialIcon, { className: 'text-[40px]', filled: true, name: 'check_circle' })
      ),
      h('div', null, [
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

function Inspector({ session, events, selectedEvent, t }) {
  const tele = session?.telemetry || {};
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
        ])
      ])
    ]),
    h('section', { className: 'glass-card rounded-3xl p-lg' }, [
      h('h3', { className: 'mb-md text-label-caps font-label-caps uppercase text-outline' }, t.scoring),
      h('div', { className: 'space-y-2' }, [
        h('div', { className: 'flex items-center justify-between text-sm' }, [
          h('span', { className: 'text-on-surface-variant' }, t.outcomeConfidence),
          h('span', { className: 'font-mono text-mono font-bold text-primary' }, `${percent(session?.quality?.outcome_confidence)}%`)
        ]),
        h('div', { className: 'h-1.5 overflow-hidden rounded-full bg-slate-100' },
          h('div', { className: 'h-full bg-gradient-to-r from-primary to-secondary-container', style: { width: `${percent(session?.quality?.outcome_confidence)}%` } })
        ),
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

export function AgentTraceExplorer({ initialSessions = [], initialEvents = [], initialLang = 'zh', initialSelectedEventId = null, initialSelectedSessionId = null }) {
  const [lang, setLangState] = useState(() => normalizeLang(initialLang));
  const t = traceCopy[lang];
  const [sessions, setSessions] = useState(initialSessions);
  const [events, setEvents] = useState(initialEvents);
  const [selectedSessionId, setSelectedSessionId] = useState(
    initialSessions.some((session) => session.session_id === initialSelectedSessionId)
      ? initialSelectedSessionId
      : initialSessions[0]?.session_id ?? null
  );
  const [framework, setFramework] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedEventId, setSelectedEventId] = useState(initialSelectedEventId ?? initialEvents[0]?.event_id ?? null);

  useEffect(() => {
    const stored = getStoredLang();
    const normalized = normalizeLang(stored);
    if (stored && normalized !== lang) setLangState(normalized);
  }, []);

  function setLang(next) {
    const normalized = normalizeLang(next);
    setStoredLang(normalized);
    setLangState(normalized);
  }

  const visibleSessions = useMemo(() => sessions.filter((s) => {
    if (framework !== 'all' && s.framework !== framework) return false;
    const norm = query.trim().toLowerCase();
    if (!norm) return true;
    return [s.session_id, s.framework, s.satisfaction?.label].filter(Boolean).join(' ').toLowerCase().includes(norm);
  }), [sessions, framework, query]);

  const selectedSession = sessions.find((s) => s.session_id === selectedSessionId) ?? visibleSessions[0] ?? null;
  const groupedEvents = groupEvents(events, t);
  const selectedEvent = useMemo(() => events.find((e) => e.event_id === selectedEventId) ?? events[0] ?? null, [events, selectedEventId]);
  const notificationCount = sessions.reduce((sum, session) =>
    sum + (session.recommendations || []).filter((rec) => !rec.state || rec.state.status === 'new').length,
    0
  );

  async function refresh() {
    const response = await fetch('/api/sessions');
    setSessions(await response.json());
  }

  async function selectSession(sessionId) {
    setSelectedSessionId(sessionId);
    const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/events`);
    const next = await response.json();
    setEvents(next);
    setSelectedEventId(next[0]?.event_id ?? null);
  }

  return h('div', { className: 'min-h-screen text-on-background', 'data-selected-session-id': selectedSession?.session_id || '' }, [
    h(Sidebar, { activeView: 'traces', key: 'sidebar' }),
    h(TopBar, { key: 'top', lang, notificationCount, onRefresh: refresh, searchQuery: query, setLang, t }),
    h('main', { className: 'ml-20 pt-16 px-8 pb-12 min-h-screen' }, [
      h('div', { className: 'mx-auto max-w-[1400px] space-y-margin' }, [
        h('header', { className: 'flex flex-wrap justify-between items-end gap-4', key: 'head' }, [
          h('div', null, [
            h('nav', { className: 'flex items-center gap-2 text-outline text-xs mb-2' }, [
              h('span', null, t.home),
              h(MaterialIcon, { className: 'text-[12px]', name: 'chevron_right', key: 'arr' }),
              h('span', null, t.traceExplorer),
              h(MaterialIcon, { className: 'text-[12px]', name: 'chevron_right', key: 'arr2' }),
              h('span', { className: 'font-semibold text-primary font-mono text-mono' }, selectedSession?.session_id || '-')
            ]),
            h('span', { className: 'text-xs font-mono font-bold uppercase tracking-widest text-primary' }, t.eyebrow),
            h('h2', { className: 'mt-1 text-h2 font-h2 tracking-tight' }, t.title),
            h('p', { className: 'mt-2 max-w-2xl text-body-md text-on-surface-variant' }, t.subtitle)
          ]),
          h('div', { className: 'flex gap-3' }, [
            h('a', {
              className: 'flex items-center gap-2 rounded-xl bg-surface-container-highest px-4 py-2 font-semibold text-on-surface transition-all hover:bg-surface-container-high',
              href: `/api/sessions/${encodeURIComponent(selectedSession?.session_id || '')}/events`
            }, [h(MaterialIcon, { className: 'text-[20px]', name: 'download' }), t.exportJson]),
            h('a', {
              className: 'flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-2 font-semibold transition-all hover:scale-[1.02] active:scale-95 inner-glow',
              href: selectedSession?.session_id ? `/sessions?q=${encodeURIComponent(selectedSession.session_id)}` : '/sessions'
            }, [h(MaterialIcon, { className: 'text-[20px]', name: 'arrow_forward' }), t.openSession])
          ])
        ]),
        selectedSession ? h(ResultBadge, { key: 'badge', session: selectedSession, t }) : null,
        h('div', { className: 'grid grid-cols-1 lg:grid-cols-12 gap-gutter', key: 'body' }, [
          h('section', { className: 'lg:col-span-8 space-y-gutter' }, [
            h('div', { className: 'glass-card-strong rounded-3xl p-lg' }, [
              h('span', { className: 'text-label-caps font-label-caps uppercase text-primary' }, t.evidenceTimeline),
              h('h3', { className: 'mt-2 text-h3 font-h3 tracking-tight' }, t.groupedTraceEvents)
            ]),
            groupedEvents.length === 0
              ? h('p', { className: 'glass-card rounded-3xl border-dashed p-lg text-sm text-outline' }, t.selectSession)
              : h('div', { className: 'space-y-lg' }, groupedEvents.map((g) =>
                  h(TimelineGroup, {
                    group: g, key: g.id,
                    onSelectEvent: setSelectedEventId,
                    selectedEventId: selectedEvent?.event_id ?? null, t
                  })
                ))
          ]),
          h('aside', { className: 'lg:col-span-4 space-y-gutter' }, [
            h(SessionPicker, {
              framework, onSelect: selectSession, query,
              selectedSessionId: selectedSession?.session_id || '',
              sessions: visibleSessions, setFramework, setQuery, t
            }),
            h(Inspector, { events, selectedEvent, session: selectedSession, t })
          ])
        ])
      ])
    ])
  ]);
}
