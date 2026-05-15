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
    eyebrow: 'FLAKY PROMPTS',
    title: '不稳定的 prompt',
    body: '同一条 prompt 跑了多次,有时通过有时失败 — 像 CI 里的 flaky test,值得 review。',
    empty: '当前没有检测到 flaky prompt — 所有重复运行过的 prompt 表现稳定,或者还没有足够的运行样本。',
    sumClusters: '不稳定 prompt 数',
    sumRuns: '覆盖运行数',
    promptHash: 'Prompt 指纹',
    runs: '运行',
    success: '成功',
    failure: '失败',
    range: '分数跨度',
    mean: '均值',
    stdev: '标准差',
    flakiness: 'Flakiness',
    viewRuns: '查看运行',
    runRow: 'trust',
    backToAgent: '回到 Agent',
    filterAgent: '当前 agent 筛选'
  },
  en: {
    eyebrow: 'FLAKY PROMPTS',
    title: 'Flaky prompts',
    body: 'Prompts that have been run many times and sometimes pass, sometimes fail — like a CI flaky test, worth reviewing.',
    empty: 'No flaky prompts detected — every repeated prompt is stable, or not enough samples yet.',
    sumClusters: 'Flaky prompts',
    sumRuns: 'Runs covered',
    promptHash: 'Prompt fingerprint',
    runs: 'Runs',
    success: 'Success',
    failure: 'Failure',
    range: 'Score range',
    mean: 'Mean',
    stdev: 'Stdev',
    flakiness: 'Flakiness',
    viewRuns: 'View runs',
    runRow: 'trust',
    backToAgent: 'Back to Agent',
    filterAgent: 'Filtered by agent'
  }
};

function chip(label, tone, key) {
  const tones = {
    good: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    bad: 'bg-rose-50 text-rose-700 border border-rose-100',
    warn: 'bg-amber-50 text-amber-700 border border-amber-100',
    info: 'bg-primary/10 text-primary border border-primary/20',
    neutral: 'bg-surface-container-low text-on-surface-variant border border-outline-variant/40'
  };
  return h('span', {
    className: `inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tones[tone] || tones.neutral}`,
    key
  }, label);
}

function clusterCard(cluster, dbPath, t) {
  const tone = cluster.flakiness_score >= 0.7 ? 'bad' : cluster.flakiness_score >= 0.4 ? 'warn' : 'info';
  return h('article', {
    className: 'glass-card-strong rounded-3xl p-lg space-y-md',
    'data-flaky-cluster': cluster.prompt_hash,
    key: cluster.prompt_hash
  }, [
    h('div', { className: 'flex items-start justify-between gap-3' }, [
      h('div', { className: 'min-w-0 flex-1' }, [
        h('div', { className: 'mb-2 flex items-center gap-2 text-label-caps font-label-caps uppercase text-outline' }, [
          h('span', { key: 'h' }, t.promptHash),
          h('code', { className: 'font-mono text-[10px] text-outline', key: 'hh' }, cluster.prompt_hash.slice(0, 20) + '…')
        ]),
        cluster.prompt_summary
          ? h('p', { className: 'text-sm leading-6 text-on-surface line-clamp-2' }, cluster.prompt_summary)
          : h('p', { className: 'text-sm italic text-outline' }, '(prompt summary unavailable)')
      ]),
      chip(`${t.flakiness}: ${Math.round(cluster.flakiness_score * 100)}%`, tone, 'fk')
    ]),
    h('div', { className: 'grid grid-cols-2 sm:grid-cols-5 gap-2' }, [
      stat(t.runs, cluster.total_runs),
      stat(t.success, cluster.success_count, 'good'),
      stat(t.failure, cluster.failure_count, 'bad'),
      stat(t.range, `${cluster.trust_min}–${cluster.trust_max}`),
      stat(t.mean + '/' + t.stdev, `${cluster.trust_mean}±${cluster.trust_stdev}`)
    ]),
    h('div', { className: 'mt-2 space-y-1' },
      cluster.sessions.slice(0, 6).map((session) => h('a', {
        className: 'flex items-center justify-between gap-3 rounded-xl border border-outline-variant/30 bg-white/60 px-3 py-2 text-xs hover:border-primary/40',
        href: `/traces?session=${encodeURIComponent(session.session_id)}${dbPath ? `&db=${encodeURIComponent(dbPath)}` : ''}`,
        key: session.session_id
      }, [
        h('span', { className: 'font-mono text-on-surface' }, '#' + session.session_id.slice(0, 18)),
        h('span', { className: 'font-mono text-outline' }, session.started_at?.slice(0, 16) || ''),
        h('span', {
          className: `font-mono font-bold ${session.trust_score >= 70 ? 'text-emerald-700' : session.trust_score < 40 ? 'text-rose-700' : 'text-amber-700'}`
        }, `${t.runRow} ${session.trust_score ?? '—'}`)
      ]))
    )
  ]);
}

function stat(label, value, tone) {
  const valueColor = tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-rose-700' : 'text-on-surface';
  return h('div', { className: 'rounded-xl bg-surface-container-low/60 p-2 text-center', key: label }, [
    h('p', { className: 'text-[10px] uppercase tracking-wider text-outline' }, label),
    h('p', { className: `mt-1 font-mono text-sm font-bold ${valueColor}` }, String(value))
  ]);
}

export function FlakyPromptsPage({ result, agentId, dbPath, initialLang = 'zh' }) {
  const t = copy[initialLang === 'en' ? 'en' : 'zh'];
  return h('main', { className: 'min-h-screen px-4 pb-28 pt-12 sm:px-8', 'data-page': 'flaky-prompts' }, [
    h('div', { className: 'mx-auto max-w-[1200px] space-y-8' }, [
      h('div', { key: 'header' }, [
        h('p', { className: 'text-primary font-mono text-xs font-bold tracking-widest uppercase' }, t.eyebrow),
        h('h1', { className: 'mt-1 text-h1 font-h1 tracking-tight' }, t.title),
        h('p', { className: 'mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant' }, t.body),
        agentId
          ? h('p', { className: 'mt-2 text-xs text-outline' }, `${t.filterAgent}: ${agentId}`)
          : null
      ]),
      h('div', { className: 'grid grid-cols-2 gap-md md:max-w-md', key: 'totals' }, [
        stat(t.sumClusters, result.total_clusters),
        stat(t.sumRuns, result.total_runs_covered)
      ]),
      result.clusters.length === 0
        ? h('div', { className: 'glass-card rounded-3xl p-lg text-center text-sm text-on-surface-variant', key: 'empty' }, t.empty)
        : h('div', { className: 'space-y-md', key: 'list' }, result.clusters.map((cluster) => clusterCard(cluster, dbPath, t)))
    ])
  ]);
}
