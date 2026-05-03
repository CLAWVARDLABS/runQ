'use client';

import React, { useMemo, useState } from 'react';

import {
  confidenceTone,
  eventAccentClass,
  eventKind,
  percent,
  satisfactionTone,
  summarizeEvent,
  toneClass,
  verdictFor
} from './format.js';

const h = React.createElement;

function chip(label, tone = 'neutral', key) {
  return h('span', {
    key,
    className: `inline-flex items-center rounded-full border bg-white/[0.03] px-2 py-1 text-xs leading-none ${toneClass(tone)}`
  }, label);
}

function TopBar({ runCount, onRefresh }) {
  return h('header', {
    className: 'grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-runq-hairline bg-runq-canvas px-5 py-3 xl:grid-cols-[360px_minmax(0,1fr)_auto]'
  }, [
    h('div', { className: 'grid gap-0.5', key: 'brand' }, [
      h('div', { className: 'text-base font-bold leading-tight text-white', key: 'title' }, 'RunQ'),
      h('div', { className: 'text-xs leading-snug text-runq-muted', key: 'subtitle' }, 'Run Inbox · local coding-agent reliability')
    ]),
    h('div', {
      className: 'hidden truncate text-xs text-runq-subtle xl:block',
      key: 'status'
    }, `Local database · ${runCount} runs · metadata-first telemetry`),
    h('button', {
      className: 'rounded-lg border border-runq-hairline bg-runq-surface2 px-3 py-2 text-sm text-white hover:border-white/30',
      key: 'refresh',
      onClick: onRefresh,
      type: 'button'
    }, 'Refresh')
  ]);
}

function EmptyState({ children }) {
  return h('div', {
    className: 'rounded-lg border border-runq-hairline bg-runq-surface1 p-4 text-sm leading-6 text-runq-muted'
  }, children);
}

function PaneHeader({ title, meta, children }) {
  return h('div', { className: 'mb-4 flex items-center justify-between gap-3' }, [
    h('h2', {
      className: 'text-[13px] font-semibold uppercase leading-tight tracking-[0.04em] text-runq-muted',
      key: 'title'
    }, title),
    children || h('span', { className: 'text-xs text-runq-subtle', key: 'meta' }, meta)
  ]);
}

function RunRow({ session, selected, onSelect }) {
  const quality = session.quality || {};
  const recommendation = (session.recommendations || [])[0];
  const satisfaction = session.satisfaction?.label || 'unknown';
  return h('button', {
    className: [
      'w-full rounded-lg border border-runq-hairline bg-runq-surface1 p-3 text-left text-white hover:bg-runq-surface2',
      selected ? 'border-runq-terraform/80 border-l-[3px]' : 'border-l-[3px] border-l-transparent'
    ].join(' '),
    onClick: onSelect,
    type: 'button'
  }, [
    h('div', { className: 'break-words text-[13px] font-semibold leading-tight', key: 'id' }, session.session_id),
    h('div', {
      className: 'mt-1 text-xs leading-snug text-runq-muted',
      key: 'meta'
    }, `${session.framework} · ${session.event_count} events · ${session.last_event_at}`),
    h('div', { className: 'mt-3 flex flex-wrap gap-2', key: 'chips' }, [
      chip(`Outcome ${percent(quality.outcome_confidence)}%`, confidenceTone(quality.outcome_confidence), 'outcome'),
      chip(satisfaction, satisfactionTone(satisfaction), 'satisfaction')
    ]),
    h('div', {
      className: 'mt-2 text-xs leading-snug text-runq-muted',
      key: 'reasons'
    }, (quality.reasons || []).join(', ') || 'no flags'),
    h('div', {
      className: 'mt-1 text-xs leading-snug text-runq-muted',
      key: 'recommendation'
    }, recommendation ? recommendation.title : 'No recommendation yet')
  ]);
}

function setupTone(status) {
  if (status === 'ok') return 'success';
  if (status === 'manual') return 'info';
  if (status === 'error') return 'danger';
  return 'neutral';
}

function SetupHealthPane({ setupHealth }) {
  const checks = setupHealth?.checks || [];
  return h('section', {
    className: 'mb-5 rounded-lg border border-runq-hairline bg-runq-surface1 p-3',
    'data-pane': 'setup-health'
  }, [
    h('div', { className: 'mb-3 flex items-center justify-between gap-3', key: 'head' }, [
      h('h2', {
        className: 'text-[13px] font-semibold uppercase leading-tight tracking-[0.04em] text-runq-muted',
        key: 'title'
      }, 'Setup Health'),
      chip(setupHealth?.ok ? 'ready' : 'check', setupHealth?.ok ? 'success' : 'neutral', 'overall')
    ]),
    checks.length === 0
      ? h('p', { className: 'text-xs leading-5 text-runq-muted', key: 'empty' }, 'Setup checks are not available yet.')
      : h('div', { className: 'grid gap-2', key: 'checks' }, checks.map((check) =>
          h('article', {
            className: 'rounded-md border border-runq-hairlineSoft bg-runq-canvas p-2',
            key: check.id
          }, [
            h('div', { className: 'flex items-center justify-between gap-2', key: 'row' }, [
              h('span', { className: 'text-xs font-semibold text-white', key: 'label' }, check.label),
              chip(check.status, setupTone(check.status), 'status')
            ]),
            h('p', { className: 'mt-1 text-xs leading-5 text-runq-muted', key: 'summary' }, check.summary),
            check.status !== 'ok' && check.remediation
              ? h('code', {
                  className: 'mt-2 block break-words rounded bg-runq-surface3 px-2 py-1.5 text-[11px] leading-5 text-runq-muted',
                  key: 'fix'
                }, check.remediation)
              : null
          ])
        ))
  ]);
}

function runMatchesFilter(session, filter) {
  const satisfaction = session.satisfaction?.label;
  const confidence = session.quality?.outcome_confidence ?? 0;
  if (filter === 'needs_review') return confidence < 0.7 || satisfaction === 'needs_revision' || satisfaction === 'abandoned';
  if (filter === 'accepted') return satisfaction === 'accepted' || confidence >= 0.85;
  if (filter === 'failed') return satisfaction === 'abandoned' || (session.quality?.reasons || []).some((reason) => reason.includes('failed'));
  return true;
}

function runMatchesSearch(session, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    session.session_id,
    session.framework,
    session.satisfaction?.label,
    ...(session.quality?.reasons || []),
    ...(session.recommendations || []).flatMap((recommendation) => [
      recommendation.title,
      recommendation.category,
      recommendation.summary
    ])
  ].filter(Boolean).join(' ').toLowerCase().includes(normalized);
}

function RunListPane({ sessions, selectedSessionId, onSelect, setupHealth, runFilter, setRunFilter, runSearch, setRunSearch }) {
  const visibleSessions = sessions.filter((session) =>
    runMatchesFilter(session, runFilter) && runMatchesSearch(session, runSearch)
  );
  const filters = [
    ['all', 'All'],
    ['needs_review', 'Needs review'],
    ['accepted', 'Accepted'],
    ['failed', 'Failed']
  ];
  return h('section', {
    className: 'min-w-0 overflow-auto border-r border-runq-hairlineSoft bg-runq-canvas p-5',
    'data-pane': 'runs',
    'aria-labelledby': 'runs-title'
  }, [
    h(SetupHealthPane, { key: 'setup', setupHealth }),
    h('div', { className: 'mb-4 flex items-center justify-between gap-3', key: 'header' }, [
      h('h2', {
        className: 'text-[13px] font-semibold uppercase leading-tight tracking-[0.04em] text-runq-muted',
        id: 'runs-title',
        key: 'title'
      }, 'Runs'),
      h('div', {
        className: 'hidden rounded-lg border border-runq-hairlineSoft bg-runq-surface1 p-1 lg:inline-flex',
        key: 'segments'
      }, filters.map(([value, label]) =>
        h('button', {
          className: `rounded-md px-2 py-1 text-xs ${runFilter === value ? 'bg-runq-surface3 text-white' : 'text-runq-subtle hover:text-white'}`,
          key: value,
          onClick: () => setRunFilter(value),
          type: 'button'
        }, label)
      ))
    ]),
    h('label', { className: 'mb-3 block', key: 'search' }, [
      h('span', { className: 'sr-only', key: 'label' }, 'Search runs'),
      h('input', {
        className: 'w-full rounded-lg border border-runq-hairline bg-runq-surface1 px-3 py-2 text-sm text-white outline-none placeholder:text-runq-subtle focus:border-runq-terraform/70',
        key: 'input',
        onChange: (event) => setRunSearch(event.target.value),
        placeholder: 'Search runs',
        type: 'search',
        value: runSearch
      })
    ]),
    visibleSessions.length === 0
      ? h(EmptyState, { key: 'empty' }, [
          sessions.length === 0
            ? 'No runs captured yet. Configure a Claude Code, Codex, or OpenClaw hook to start collecting local run quality events.'
            : 'No runs match the current filters.',
          h('br', { key: 'br1' }),
          h('br', { key: 'br2' }),
          h('code', { className: 'rounded bg-runq-surface3 px-1.5 py-0.5 text-white', key: 'code1' }, 'bash scripts/install-local.sh'),
          h('br', { key: 'br3' }),
          h('code', { className: 'rounded bg-runq-surface3 px-1.5 py-0.5 text-white', key: 'code2' }, 'npm run inbox -- --db ~/.runq/runq.db --port 4545')
        ])
      : h('div', { className: 'grid gap-2.5', key: 'rows' }, visibleSessions.map((session) =>
          h(RunRow, {
            key: session.session_id,
            session,
            selected: session.session_id === selectedSessionId,
            onSelect: () => onSelect(session.session_id)
          })
        ))
  ]);
}

function TimelineEvent({ event }) {
  const kind = eventKind(event);
  return h('article', {
    className: [
      'relative rounded-lg border border-runq-hairline bg-runq-surface1 p-3 before:absolute before:-left-[18px] before:top-4 before:h-2.5 before:w-2.5 before:rounded-full before:shadow-[0_0_0_4px_#000]',
      eventAccentClass(kind)
    ].join(' ')
  }, [
    h('div', { className: 'flex items-center justify-between gap-3 text-[13px] font-semibold', key: 'title' }, [
      h('span', { key: 'type' }, event.event_type),
      chip(event.privacy?.level || 'metadata', 'neutral', 'privacy')
    ]),
    h('div', { className: 'mt-1 text-xs text-runq-subtle', key: 'time' }, event.timestamp),
    h('div', { className: 'mt-2 text-[13px] leading-6 text-runq-muted', key: 'summary' }, summarizeEvent(event)),
    h('details', { className: 'mt-2', key: 'payload' }, [
      h('summary', { className: 'cursor-pointer text-xs text-runq-subtle', key: 'summary' }, 'Raw payload'),
      h('pre', {
        className: 'mt-2 max-h-64 overflow-auto rounded-lg border border-runq-hairlineSoft bg-[#050608] p-3 text-xs leading-6 text-runq-muted',
        key: 'pre'
      }, JSON.stringify(event.payload || {}, null, 2))
    ])
  ]);
}

function eventMatchesSearch(event, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    event.event_type,
    event.framework,
    event.source,
    summarizeEvent(event),
    JSON.stringify(event.payload || {})
  ].join(' ').toLowerCase().includes(normalized);
}

function TimelinePane({ session, events, eventSearch, setEventSearch, eventTypeFilter, setEventTypeFilter }) {
  const eventTypes = ['all', ...Array.from(new Set(events.map((event) => event.event_type))).sort()];
  const visibleEvents = events.filter((event) =>
    (eventTypeFilter === 'all' || event.event_type === eventTypeFilter) && eventMatchesSearch(event, eventSearch)
  );
  return h('section', {
    className: 'min-w-0 overflow-auto border-r border-runq-hairlineSoft bg-runq-canvas p-5',
    'data-pane': 'timeline',
    'aria-labelledby': 'timeline-title'
  }, [
    h(PaneHeader, {
      key: 'header',
      title: 'Timeline',
      meta: session ? `${session.framework} · ${visibleEvents.length}/${events.length} events` : 'Select a run'
    }),
    !session
      ? h(EmptyState, { key: 'empty' }, 'Select a run to inspect its timeline and quality signals.')
      : h(React.Fragment, { key: 'body' }, [
          h('div', { className: 'mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]', key: 'filters' }, [
            h('label', { key: 'search' }, [
              h('span', { className: 'sr-only', key: 'label' }, 'Search events'),
              h('input', {
                className: 'w-full rounded-lg border border-runq-hairline bg-runq-surface1 px-3 py-2 text-sm text-white outline-none placeholder:text-runq-subtle focus:border-runq-terraform/70',
                key: 'input',
                onChange: (event) => setEventSearch(event.target.value),
                placeholder: 'Search events',
                type: 'search',
                value: eventSearch
              })
            ]),
            h('label', { key: 'type' }, [
              h('span', { className: 'sr-only', key: 'label' }, 'Event type'),
              h('select', {
                className: 'w-full rounded-lg border border-runq-hairline bg-runq-surface1 px-3 py-2 text-sm text-white outline-none focus:border-runq-terraform/70',
                key: 'select',
                onChange: (event) => setEventTypeFilter(event.target.value),
                value: eventTypeFilter
              }, eventTypes.map((type) =>
                h('option', { key: type, value: type }, type === 'all' ? 'Event type' : type)
              ))
            ])
          ]),
          visibleEvents.length === 0
            ? h(EmptyState, { key: 'empty-filtered' }, 'No events match the current filters.')
            : h('div', { className: 'relative grid gap-3 pl-[18px] before:absolute before:bottom-1 before:left-1 before:top-1 before:w-px before:bg-runq-hairline', key: 'events' },
                visibleEvents.map((event) => h(TimelineEvent, { key: event.event_id, event }))
              )
        ])
  ]);
}

function MetricBar({ label, value, tone }) {
  const pct = percent(value);
  const color = {
    nomad: 'bg-runq-nomad',
    consul: 'bg-runq-consul',
    vault: 'bg-runq-vault',
    waypoint: 'bg-runq-waypoint'
  }[tone] || 'bg-runq-terraform';
  return h('div', { className: 'grid gap-1.5' }, [
    h('div', { className: 'flex justify-between gap-2 text-xs text-runq-muted', key: 'head' }, [
      h('span', { key: 'label' }, label),
      h('span', { key: 'value' }, `${pct}%`)
    ]),
    h('div', { className: 'h-1.5 overflow-hidden rounded-full bg-runq-surface3', key: 'track' },
      h('div', { className: `h-full rounded-full ${color}`, style: { width: `${pct}%` } })
    )
  ]);
}

function RecommendationCard({ recommendation }) {
  return h('article', {
    className: 'grid gap-2 rounded-lg border border-runq-hairline bg-runq-surface1 p-3'
  }, [
    chip(recommendation.category, 'info', 'category'),
    h('div', { className: 'text-[13px] font-semibold text-white', key: 'title' }, recommendation.title),
    h('p', { className: 'text-xs leading-5 text-runq-muted', key: 'summary' }, recommendation.summary),
    h('p', { className: 'text-xs leading-5 text-runq-muted', key: 'action' }, recommendation.suggested_action),
    h('span', { className: 'text-xs text-runq-subtle', key: 'evidence' }, `${(recommendation.evidence_event_ids || []).length} evidence events`)
  ]);
}

function QualityInspector({ session }) {
  if (!session) {
    return h('section', {
      className: 'min-w-0 overflow-auto bg-runq-canvas p-5',
      'data-pane': 'quality',
      'aria-labelledby': 'quality-title'
    }, [
      h(PaneHeader, { key: 'header', title: 'Quality Inspector' }),
      h(EmptyState, { key: 'empty' }, 'Select a run to inspect Outcome Confidence, recommendations, and satisfaction.')
    ]);
  }

  const quality = session.quality || {};
  const recommendations = session.recommendations || [];
  const satisfaction = session.satisfaction?.label || 'unknown';
  return h('section', {
    className: 'min-w-0 overflow-auto bg-runq-canvas p-5',
    'data-pane': 'quality',
    'aria-labelledby': 'quality-title'
  }, [
    h(PaneHeader, { key: 'header', title: 'Quality Inspector' }),
    h('section', { className: 'rounded-lg border border-runq-hairline bg-runq-surface1 p-4', key: 'summary' }, [
      h('div', { className: 'text-[28px] font-bold leading-none text-white', key: 'score' }, `${percent(quality.outcome_confidence)}%`),
      h('div', { className: 'mt-1 text-[13px] text-runq-muted', key: 'verdict' }, verdictFor(session)),
      h('div', { className: 'mt-3 flex flex-wrap gap-2', key: 'reasons' }, (quality.reasons || []).map((reason) => chip(reason, 'neutral', reason))),
      h('div', { className: 'mt-4 grid gap-2.5', key: 'metrics' }, [
        h(MetricBar, { key: 'verification', label: 'Verification Coverage', value: quality.verification_coverage, tone: 'nomad' }),
        h(MetricBar, { key: 'rework', label: 'Rework Risk', value: quality.rework_risk, tone: 'consul' }),
        h(MetricBar, { key: 'permission', label: 'Permission Friction', value: quality.permission_friction, tone: 'vault' }),
        h(MetricBar, { key: 'loop', label: 'Loop Risk', value: quality.loop_risk, tone: 'consul' }),
        h(MetricBar, { key: 'cost', label: 'Cost Efficiency', value: quality.cost_efficiency, tone: 'waypoint' })
      ])
    ]),
    h('section', { className: 'mt-5', key: 'satisfaction' }, [
      h('div', { className: 'mb-3 flex items-center justify-between gap-3', key: 'head' }, [
        h('h3', { className: 'text-[13px] font-semibold uppercase tracking-[0.04em] text-runq-muted', key: 'title' }, 'Satisfaction'),
        chip(satisfaction, satisfactionTone(satisfaction), 'satisfaction')
      ]),
      h('p', { className: 'text-xs leading-5 text-runq-muted', key: 'signal' }, session.satisfaction?.signal || 'No human or evaluator judgment recorded yet.')
    ]),
    h('section', { className: 'mt-5', key: 'recommendations' }, [
      h('div', { className: 'mb-3 flex items-center justify-between gap-3', key: 'head' }, [
        h('h3', { className: 'text-[13px] font-semibold uppercase tracking-[0.04em] text-runq-muted', key: 'title' }, 'Recommendations'),
        h('span', { className: 'text-xs text-runq-subtle', key: 'count' }, recommendations.length)
      ]),
      recommendations.length === 0
        ? h(EmptyState, { key: 'empty' }, 'No recommendations for this run. RunQ did not find an evidence-backed workflow improvement yet.')
        : h('div', { className: 'grid gap-2.5', key: 'cards' }, recommendations.map((recommendation) =>
            h(RecommendationCard, { key: recommendation.recommendation_id || recommendation.title, recommendation })
          ))
    ])
  ]);
}

export function RunInboxApp({ initialSessions = [], initialEvents = [], setupHealth = null }) {
  const [sessions, setSessions] = useState(initialSessions);
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessions[0]?.session_id ?? null);
  const [events, setEvents] = useState(initialEvents);
  const [runFilter, setRunFilter] = useState('all');
  const [runSearch, setRunSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const selectedSession = useMemo(
    () => sessions.find((session) => session.session_id === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  );

  async function refresh() {
    const response = await fetch('/api/sessions');
    const nextSessions = await response.json();
    setSessions(nextSessions);
    const nextSelected = selectedSessionId && nextSessions.some((session) => session.session_id === selectedSessionId)
      ? selectedSessionId
      : nextSessions[0]?.session_id ?? null;
    setSelectedSessionId(nextSelected);
    if (nextSelected) {
      await selectSession(nextSelected);
    } else {
      setEvents([]);
    }
  }

  async function selectSession(sessionId) {
    setSelectedSessionId(sessionId);
    setEventSearch('');
    setEventTypeFilter('all');
    const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/events`);
    setEvents(await response.json());
  }

  return h('div', { className: 'min-h-screen bg-runq-canvas text-white' }, [
    h(TopBar, { key: 'topbar', runCount: sessions.length, onRefresh: refresh }),
    h('main', {
      key: 'main',
      className: 'grid min-h-[calc(100vh-56px)] grid-cols-1 bg-runq-canvas lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(520px,1fr)_360px]'
    }, [
      h(RunListPane, {
        key: 'runs',
        sessions,
        selectedSessionId,
        onSelect: selectSession,
        setupHealth,
        runFilter,
        setRunFilter,
        runSearch,
        setRunSearch
      }),
      h(TimelinePane, {
        key: 'timeline',
        session: selectedSession,
        events,
        eventSearch,
        setEventSearch,
        eventTypeFilter,
        setEventTypeFilter
      }),
      h(QualityInspector, {
        key: 'quality',
        session: selectedSession
      })
    ])
  ]);
}
