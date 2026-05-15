// Productivity dashboard aggregates.
//
// Powered entirely by universal-layer signals so it works across coding +
// conversation + task agents — no verification_command assumption.
//
// What we surface here is "how is my AI-augmented workday going" rather than
// "did this single run pass" — the unit is the day / week, not the session.

import { getRunInboxSessions, defaultRunInboxDbPath } from './run-inbox-data.js';
import { RunqStore } from './store.js';

function dayKey(timestamp) {
  return String(timestamp ?? '').slice(0, 10);
}

function asMs(timestamp) {
  const t = Date.parse(timestamp || '');
  return Number.isFinite(t) ? t : 0;
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '0s';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  return rem === 0 ? `${h}h` : `${h}h${rem}m`;
}

// Pull the universal reasons we attached in scoring/universal.js. These are
// the agent-agnostic signals worth surfacing on this page.
const UNIVERSAL_REASONS = new Set([
  'prompt_repeated',
  'rapid_retry_pattern',
  'acknowledged_positive',
  'acknowledged_negative',
  'session_abandoned',
  'prompt_revision_growth'
]);

export function getProductivityReport(dbPath = defaultRunInboxDbPath(), {
  agentId = null,
  rangeDays = 7
} = {}) {
  const allSessions = getRunInboxSessions(dbPath);
  const sessions = allSessions.filter((session) => !agentId || session.framework === agentId);

  const now = Date.now();
  const cutoff = now - rangeDays * 24 * 60 * 60 * 1000;

  const recent = sessions.filter((session) => {
    const ts = asMs(session.started_at || session.last_event_at);
    return ts >= cutoff;
  });

  const dayBuckets = new Map();
  for (let d = rangeDays - 1; d >= 0; d -= 1) {
    const key = new Date(now - d * 86_400_000).toISOString().slice(0, 10);
    dayBuckets.set(key, { date: key, session_count: 0, prompt_count: 0, total_time_ms: 0, frustration_count: 0, acknowledged_count: 0 });
  }

  let totalPrompts = 0;
  let totalDurationMs = 0;
  let abandonedCount = 0;
  let acknowledgedPositive = 0;
  let acknowledgedNegative = 0;
  let rapidRetryCount = 0;
  let promptRepeatedCount = 0;
  const reasonCounts = new Map();

  // Need prompt counts per session — walk events once.
  const store = new RunqStore(dbPath);
  let topFrustration = [];
  try {
    for (const session of recent) {
      const events = store.listEventsForSession(session.session_id);
      const prompts = events.filter((event) => event.event_type === 'user.prompt.submitted');
      const promptCount = prompts.length;
      totalPrompts += promptCount;
      const startMs = asMs(session.started_at);
      const endMs = asMs(session.last_event_at);
      const duration = startMs && endMs ? Math.max(0, endMs - startMs) : 0;
      totalDurationMs += duration;
      const reasons = session.quality?.reasons || [];
      const isFrustrated = reasons.some((reason) =>
        ['prompt_repeated', 'rapid_retry_pattern', 'acknowledged_negative', 'prompt_revision_growth'].includes(reason)
      );
      const isAcknowledged = reasons.includes('acknowledged_positive');
      if (reasons.includes('session_abandoned')) abandonedCount += 1;
      if (reasons.includes('acknowledged_positive')) acknowledgedPositive += 1;
      if (reasons.includes('acknowledged_negative')) acknowledgedNegative += 1;
      if (reasons.includes('rapid_retry_pattern')) rapidRetryCount += 1;
      if (reasons.includes('prompt_repeated')) promptRepeatedCount += 1;
      for (const reason of reasons) {
        if (UNIVERSAL_REASONS.has(reason)) {
          reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
        }
      }
      const bucket = dayBuckets.get(dayKey(session.started_at || session.last_event_at));
      if (bucket) {
        bucket.session_count += 1;
        bucket.prompt_count += promptCount;
        bucket.total_time_ms += duration;
        if (isFrustrated) bucket.frustration_count += 1;
        if (isAcknowledged) bucket.acknowledged_count += 1;
      }
      if (isFrustrated && prompts.length > 0) {
        const firstPrompt = prompts[0];
        topFrustration.push({
          session_id: session.session_id,
          framework: session.framework,
          trust_score: session.quality?.trust_score ?? null,
          prompt_summary: firstPrompt.payload?.prompt_summary || null,
          reasons: reasons.filter((r) => UNIVERSAL_REASONS.has(r)),
          started_at: session.started_at
        });
      }
    }
  } finally {
    store.close();
  }

  topFrustration = topFrustration
    .sort((a, b) => (a.trust_score ?? 100) - (b.trust_score ?? 100))
    .slice(0, 5);

  const completionRate = recent.length > 0
    ? (recent.length - abandonedCount) / recent.length
    : 0;

  return {
    range_days: rangeDays,
    agent_filter: agentId,
    totals: {
      session_count: recent.length,
      prompt_count: totalPrompts,
      total_time_ms: totalDurationMs,
      total_time_label: formatDuration(totalDurationMs),
      abandoned_count: abandonedCount,
      completion_rate: Number(completionRate.toFixed(2)),
      acknowledged_positive: acknowledgedPositive,
      acknowledged_negative: acknowledgedNegative,
      rapid_retry_count: rapidRetryCount,
      prompt_repeated_count: promptRepeatedCount
    },
    activity_by_day: Array.from(dayBuckets.values()),
    reason_counts: Object.fromEntries(reasonCounts.entries()),
    top_frustration_sessions: topFrustration
  };
}
