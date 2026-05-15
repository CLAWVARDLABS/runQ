'use client';

import React from 'react';

function h(type, props, ...children) {
  const normalized = children.flatMap((child) =>
    Array.isArray(child) ? React.Children.toArray(child.filter(Boolean)) : [child]
  );
  return React.createElement(type, props, ...normalized);
}

const copy = {
  zh: {
    eyebrow: 'YOUR AI WORKDAY',
    title: 'AI 生产力面板',
    body: '基于通用层信号汇总你与 AI agent 协作的状态 — 不限定 coding,所有 agent 通用。',
    range: '过去 {n} 天',
    sessions: '会话',
    prompts: 'Prompts',
    timeEngaged: '投入时长',
    completionRate: '完成率',
    abandoned: '中断',
    positiveAck: '正向反馈',
    negativeAck: '负向反馈',
    rapidRetry: '急速重试',
    promptRepeated: 'Prompt 重复',
    activityByDay: '近 7 天活跃',
    frustrationTop: '挫败感最强的 5 个会话',
    noFrustration: '本期间没有触发挫败信号 — 你今天用 AI 很顺。',
    viewTrace: '查看 trace'
  },
  en: {
    eyebrow: 'YOUR AI WORKDAY',
    title: 'AI Productivity Dashboard',
    body: 'How your AI-augmented workday is going, aggregated from universal-layer human↔agent signals — works across coding and conversation agents.',
    range: 'Past {n} days',
    sessions: 'Sessions',
    prompts: 'Prompts',
    timeEngaged: 'Time engaged',
    completionRate: 'Completion rate',
    abandoned: 'Abandoned',
    positiveAck: 'Positive acks',
    negativeAck: 'Negative acks',
    rapidRetry: 'Rapid retries',
    promptRepeated: 'Repeated prompts',
    activityByDay: 'Daily activity',
    frustrationTop: 'Top 5 frustrating sessions',
    noFrustration: 'No frustration signals fired in this window — you had a smooth AI day.',
    viewTrace: 'View trace'
  }
};

function tile(label, value, tone) {
  const colors = {
    good: 'text-emerald-700',
    warn: 'text-amber-700',
    bad: 'text-rose-700',
    info: 'text-primary',
    neutral: 'text-on-surface'
  };
  return h('article', { className: 'glass-card rounded-2xl p-md', key: label }, [
    h('p', { className: 'text-[10px] uppercase tracking-wider text-outline' }, label),
    h('p', { className: `mt-2 font-mono text-2xl font-bold ${colors[tone] || colors.neutral}` }, String(value))
  ]);
}

function activityChart(activityByDay) {
  const maxSessions = Math.max(1, ...activityByDay.map((day) => day.session_count));
  return h('div', { className: 'flex h-32 items-end gap-1' }, activityByDay.map((day) => {
    const heightPct = (day.session_count / maxSessions) * 100;
    const frustrationPct = day.session_count > 0 ? (day.frustration_count / day.session_count) * 100 : 0;
    return h('div', { className: 'flex flex-1 flex-col items-center gap-1', key: day.date, 'data-activity-day': day.date }, [
      h('div', { className: 'relative w-full overflow-hidden rounded-t bg-surface-container-low' , style: { height: '100%' } }, [
        h('div', {
          className: 'absolute bottom-0 w-full bg-primary/60',
          style: { height: `${heightPct}%` }
        }),
        // Frustration overlay as a deeper red band at top of the bar
        frustrationPct > 0 ? h('div', {
          className: 'absolute bottom-0 w-full bg-rose-400/60',
          style: { height: `${(heightPct * frustrationPct) / 100}%` }
        }) : null
      ]),
      h('span', { className: 'text-[10px] text-outline' }, day.date.slice(5))
    ]);
  }));
}

function frustrationCard(session, dbPath, t) {
  return h('a', {
    className: 'flex items-start justify-between gap-3 rounded-2xl border border-outline-variant/30 bg-white/60 p-3 hover:border-primary/40',
    href: `/traces?session=${encodeURIComponent(session.session_id)}${dbPath ? `&db=${encodeURIComponent(dbPath)}` : ''}`,
    key: session.session_id
  }, [
    h('div', { className: 'min-w-0 flex-1' }, [
      h('p', { className: 'font-mono text-mono text-primary' }, '#' + session.session_id.slice(0, 16)),
      session.prompt_summary
        ? h('p', { className: 'mt-1 line-clamp-2 text-xs text-on-surface-variant' }, session.prompt_summary)
        : null,
      h('div', { className: 'mt-2 flex flex-wrap gap-1' }, session.reasons.map((reason) =>
        h('span', { className: 'inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700', key: reason }, reason)
      ))
    ]),
    h('span', { className: 'font-mono text-sm font-bold text-rose-700' }, `trust ${session.trust_score ?? '—'}`)
  ]);
}

export function ProductivityDashboardPage({ report, agentId, dbPath, rangeDays, initialLang = 'zh' }) {
  const t = copy[initialLang === 'en' ? 'en' : 'zh'];
  const completionPct = Math.round(report.totals.completion_rate * 100);
  return h('main', { className: 'min-h-screen px-4 pb-28 pt-12 sm:px-8', 'data-page': 'productivity' }, [
    h('div', { className: 'mx-auto max-w-[1400px] space-y-8' }, [
      h('div', { key: 'header' }, [
        h('p', { className: 'text-primary font-mono text-xs font-bold tracking-widest uppercase' }, t.eyebrow),
        h('h1', { className: 'mt-1 text-h1 font-h1 tracking-tight' }, t.title),
        h('p', { className: 'mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant' }, t.body),
        h('p', { className: 'mt-2 text-xs text-outline' },
          t.range.replace('{n}', String(rangeDays)) + (agentId ? ` · ${agentId}` : '')
        )
      ]),
      h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-md', key: 'totals' }, [
        tile(t.sessions, report.totals.session_count, 'info'),
        tile(t.prompts, report.totals.prompt_count, 'info'),
        tile(t.timeEngaged, report.totals.total_time_label, 'neutral'),
        tile(t.completionRate, `${completionPct}%`, completionPct >= 80 ? 'good' : completionPct >= 60 ? 'warn' : 'bad')
      ]),
      h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-md', key: 'signals' }, [
        tile(t.positiveAck, report.totals.acknowledged_positive, 'good'),
        tile(t.negativeAck, report.totals.acknowledged_negative, report.totals.acknowledged_negative > 0 ? 'bad' : 'neutral'),
        tile(t.rapidRetry, report.totals.rapid_retry_count, report.totals.rapid_retry_count > 0 ? 'warn' : 'neutral'),
        tile(t.promptRepeated, report.totals.prompt_repeated_count, report.totals.prompt_repeated_count > 0 ? 'warn' : 'neutral')
      ]),
      h('section', { className: 'glass-card rounded-3xl p-lg', key: 'activity' }, [
        h('h3', { className: 'mb-md text-h3 font-h3 tracking-tight' }, t.activityByDay),
        activityChart(report.activity_by_day)
      ]),
      h('section', { className: 'glass-card rounded-3xl p-lg', key: 'top' }, [
        h('h3', { className: 'mb-md text-h3 font-h3 tracking-tight' }, t.frustrationTop),
        report.top_frustration_sessions.length === 0
          ? h('p', { className: 'rounded-xl bg-surface-container-low/60 p-md text-sm text-on-surface-variant' }, t.noFrustration)
          : h('div', { className: 'space-y-2' }, report.top_frustration_sessions.map((session) =>
              frustrationCard(session, dbPath, t)
            ))
      ])
    ])
  ]);
}
