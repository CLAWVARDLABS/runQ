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
    title: '运行对比',
    eyebrow: 'COMPARE TWO RUNS',
    pickBoth: '在 URL 后追加 ?a=<session_id>&b=<session_id> 来对比两次运行。',
    sameSession: '左右两个 session 是同一个 — 选择两个不同的运行来对比。',
    pickLeft: '左侧运行',
    pickRight: '右侧运行',
    summaryHeader: '差异概览',
    commonPrefix: '共同前缀',
    diverged: '分叉之后',
    stepsTotal: '步数',
    distinctTools: '工具种类',
    topTool: '主要工具',
    commands: '命令',
    verifications: '验证',
    verificationFailed: '验证失败',
    fileChanges: '文件改动',
    toolErrors: '工具失败',
    trustScore: '信任分',
    timeline: '时间线',
    converged: '两次运行从头到尾保持一致 — 没有分叉点',
    divergencePoint: '分叉点',
    step: '步',
    stepEqual: '相同',
    stepDiff: '差异',
    leftOnly: '只在左侧',
    rightOnly: '只在右侧'
  },
  en: {
    title: 'Compare two runs',
    eyebrow: 'COMPARE TWO RUNS',
    pickBoth: 'Append ?a=<session_id>&b=<session_id> to the URL to compare two runs.',
    sameSession: 'You picked the same session twice — choose two different runs.',
    pickLeft: 'Left run',
    pickRight: 'Right run',
    summaryHeader: 'Diff overview',
    commonPrefix: 'Common prefix',
    diverged: 'After divergence',
    stepsTotal: 'Steps',
    distinctTools: 'Distinct tools',
    topTool: 'Top tool',
    commands: 'Commands',
    verifications: 'Verifications',
    verificationFailed: 'Verification failed',
    fileChanges: 'File changes',
    toolErrors: 'Tool errors',
    trustScore: 'Trust score',
    timeline: 'Timeline',
    converged: 'Both runs followed the same trajectory end-to-end — no divergence point.',
    divergencePoint: 'Divergence',
    step: 'Step',
    stepEqual: 'same',
    stepDiff: 'diverged',
    leftOnly: 'left only',
    rightOnly: 'right only'
  }
};

function statTile(label, value) {
  return h('div', { className: 'rounded-xl bg-surface-container-low/60 p-3', key: label }, [
    h('p', { className: 'text-[10px] uppercase tracking-wider text-outline', key: 'l' }, label),
    h('p', { className: 'mt-1 font-mono text-lg font-bold text-on-surface', key: 'v' }, String(value ?? '—'))
  ]);
}

function actionRow(action, isCommonPrefix, side, t) {
  const eventTypeLabel = action.event_type;
  const detail = action.payload?.tool_name || action.payload?.model || action.payload?.binary || '';
  const tone = isCommonPrefix
    ? 'border-outline-variant/30 bg-white/40 text-on-surface-variant'
    : (side === 'left' ? 'border-rose-200 bg-rose-50/40 text-rose-700' : 'border-amber-200 bg-amber-50/40 text-amber-700');
  return h('li', {
    className: `rounded-xl border ${tone} px-3 py-2 text-xs`,
    'data-event-id': action.event_id,
    'data-step-state': isCommonPrefix ? 'common' : 'diverged',
    key: action.event_id
  }, [
    h('div', { className: 'flex items-center justify-between gap-2', key: 'top' }, [
      h('span', { className: 'font-mono', key: 't' }, eventTypeLabel),
      h('span', { className: 'text-[10px] text-outline', key: 'ts' }, action.timestamp?.slice(11, 19) || '')
    ]),
    detail ? h('p', { className: 'mt-1 truncate font-mono text-[11px]', key: 'd' }, detail) : null
  ]);
}

function summaryHeader(diff, leftSession, rightSession, t) {
  const stats = (side) => [
    statTile(t.stepsTotal, side.stats.event_count),
    statTile(t.distinctTools, side.stats.distinct_tools),
    statTile(t.topTool, side.stats.top_tool ?? '—'),
    statTile(t.commands, side.stats.commands),
    statTile(t.verifications, side.stats.verifications),
    statTile(t.verificationFailed, side.stats.verification_failed),
    statTile(t.fileChanges, side.stats.file_changes),
    statTile(t.toolErrors, side.stats.tool_errors)
  ];
  return h('section', { className: 'glass-card rounded-3xl p-lg', 'data-compare-summary': 'true' }, [
    h('h3', { className: 'mb-md text-h3 font-h3 tracking-tight' }, t.summaryHeader),
    h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-md' }, [
      h('div', { key: 'a' }, [
        h('div', { className: 'mb-2 flex items-center justify-between' }, [
          h('p', { className: 'text-label-caps font-label-caps uppercase text-outline' }, `${t.pickLeft}: #${(leftSession?.session_id || '').slice(0, 16)}`),
          h('span', { className: 'font-mono text-sm font-bold text-primary' }, `${t.trustScore}: ${diff.left.trust_score ?? '—'}`)
        ]),
        h('div', { className: 'grid grid-cols-2 gap-2' }, stats(diff.left))
      ]),
      h('div', { key: 'b' }, [
        h('div', { className: 'mb-2 flex items-center justify-between' }, [
          h('p', { className: 'text-label-caps font-label-caps uppercase text-outline' }, `${t.pickRight}: #${(rightSession?.session_id || '').slice(0, 16)}`),
          h('span', { className: 'font-mono text-sm font-bold text-primary' }, `${t.trustScore}: ${diff.right.trust_score ?? '—'}`)
        ]),
        h('div', { className: 'grid grid-cols-2 gap-2' }, stats(diff.right))
      ])
    ]),
    h('p', {
      className: `mt-md rounded-xl px-3 py-2 text-xs ${diff.diverged ? 'bg-amber-50/60 text-amber-800' : 'bg-emerald-50/60 text-emerald-800'}`,
      'data-divergence-point': String(diff.common_prefix_length)
    }, diff.diverged
      ? `${t.divergencePoint}: ${t.step} ${diff.common_prefix_length + 1}  ·  ${t.commonPrefix}: ${diff.common_prefix_length} ${t.step}`
      : t.converged)
  ]);
}

function emptyState(t) {
  return h('div', { className: 'glass-card rounded-3xl p-lg text-center' }, [
    h('p', { className: 'text-h3 font-h3 tracking-tight' }, t.title),
    h('p', { className: 'mt-2 text-sm text-on-surface-variant' }, t.pickBoth)
  ]);
}

export function RunComparePage({ diff, leftSession, rightSession, initialLang = 'zh' }) {
  const t = copy[initialLang === 'en' ? 'en' : 'zh'];

  if (!diff) return h('main', { className: 'min-h-screen px-4 pb-28 pt-12 sm:px-8' }, [
    h('div', { className: 'mx-auto max-w-[1200px] space-y-8' }, emptyState(t))
  ]);

  if (leftSession?.session_id === rightSession?.session_id) {
    return h('main', { className: 'min-h-screen px-4 pb-28 pt-12 sm:px-8' }, [
      h('div', { className: 'mx-auto max-w-[1200px] space-y-8' }, [
        h('div', { className: 'glass-card rounded-3xl p-lg text-center text-sm text-amber-700' }, t.sameSession)
      ])
    ]);
  }

  return h('main', { className: 'min-h-screen px-4 pb-28 pt-12 sm:px-8', 'data-page': 'compare-runs' }, [
    h('div', { className: 'mx-auto max-w-[1400px] space-y-8' }, [
      h('div', { key: 'header' }, [
        h('p', { className: 'text-primary font-mono text-xs font-bold tracking-widest uppercase' }, t.eyebrow),
        h('h1', { className: 'mt-1 text-h1 font-h1 tracking-tight' }, t.title)
      ]),
      h(React.Fragment, { key: 'summary' }, summaryHeader(diff, leftSession, rightSession, t)),
      h('section', { className: 'glass-card rounded-3xl p-lg', 'data-compare-timelines': 'true', key: 'timeline' }, [
        h('h3', { className: 'mb-md text-h3 font-h3 tracking-tight' }, t.timeline),
        h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-md' }, [
          h('div', { key: 'left' }, [
            h('p', { className: 'mb-2 text-label-caps font-label-caps uppercase text-outline' }, t.pickLeft),
            h('ol', { className: 'space-y-1', 'data-side': 'left' },
              diff.left.actions.map((action, idx) => actionRow(action, idx < diff.common_prefix_length, 'left', t))
            )
          ]),
          h('div', { key: 'right' }, [
            h('p', { className: 'mb-2 text-label-caps font-label-caps uppercase text-outline' }, t.pickRight),
            h('ol', { className: 'space-y-1', 'data-side': 'right' },
              diff.right.actions.map((action, idx) => actionRow(action, idx < diff.common_prefix_length, 'right', t))
            )
          ])
        ])
      ])
    ])
  ]);
}
