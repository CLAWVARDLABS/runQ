// Flaky prompt detection.
//
// CI flaky-test analogy: a test that sometimes passes and sometimes fails is
// the most useful diagnostic signal — it tells you something is unstable.
// For agent runs, the equivalent is "the same prompt sometimes succeeds and
// sometimes fails". Cluster sessions by prompt_hash, then flag clusters
// whose trust_score variance is high.

import { getRunInboxSessions, defaultRunInboxDbPath } from './run-inbox-data.js';
import { RunqStore } from './store.js';

const MIN_RUNS_PER_CLUSTER = 3;     // need at least 3 runs to call it "flaky"
const MIN_TRUST_RANGE = 25;         // top - bottom must span ≥ 25 points
const SAMPLE_SUMMARY_MAX_LEN = 120;

function trustScoreOf(session) {
  const score = Number(session?.quality?.trust_score);
  return Number.isFinite(score) ? score : null;
}

function meanAndStdev(values) {
  if (values.length === 0) return { mean: 0, stdev: 0 };
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return { mean: Math.round(mean), stdev: Math.round(Math.sqrt(variance)) };
}

// Build a quick prompt_hash → first observed prompt_summary index out of the
// store so the UI can show what the prompt was about (not just its hash).
function buildSummaryLookup(dbPath) {
  const lookup = new Map();
  const store = new RunqStore(dbPath);
  try {
    // We don't have a direct "select prompt events" — re-use listSessions +
    // listEventsForSession but only walk far enough to find each hash once.
    const sessions = store.listSessions();
    for (const session of sessions) {
      const events = store.listEventsForSession(session.session_id);
      for (const event of events) {
        if (event.event_type !== 'user.prompt.submitted') continue;
        const hash = event.payload?.prompt_hash;
        const summary = event.payload?.prompt_summary;
        if (hash && hash !== '[redacted]' && summary && !lookup.has(hash)) {
          lookup.set(hash, String(summary).slice(0, SAMPLE_SUMMARY_MAX_LEN));
        }
      }
      // No early-out — the loop is bounded by available sessions anyway, and
      // we want to capture summaries from any session that touched that hash.
    }
  } finally {
    store.close();
  }
  return lookup;
}

// Public API. Returns:
//   {
//     clusters: [
//       {
//         prompt_hash, prompt_summary, sessions: [...],
//         total_runs, success_count, failure_count,
//         trust_mean, trust_stdev, trust_range,
//         flakiness_score   ← 0..1, higher = more flaky
//       }, ...
//     ],
//     total_clusters, flaky_clusters, total_runs_covered
//   }
export function detectFlakyPrompts(dbPath = defaultRunInboxDbPath(), {
  agentId = null,
  minRuns = MIN_RUNS_PER_CLUSTER,
  minRange = MIN_TRUST_RANGE,
  successThreshold = 70,
  failureThreshold = 40,
  limit = 20
} = {}) {
  const sessions = getRunInboxSessions(dbPath)
    .filter((session) => !agentId || session.framework === agentId);

  // Re-aggregate prompt_hash → sessions. We need raw events to find
  // prompt_hash (sessions only carry telemetry/quality), so walk the cached
  // prompt_snippets path if available — actually prompt_hash isn't in the
  // cached metrics. Walk events.
  const store = new RunqStore(dbPath);
  const hashToSessions = new Map();
  try {
    for (const session of sessions) {
      const events = store.listEventsForSession(session.session_id);
      const hashesInSession = new Set();
      for (const event of events) {
        if (event.event_type !== 'user.prompt.submitted') continue;
        const hash = event.payload?.prompt_hash;
        if (!hash || hash === '[redacted]') continue;
        hashesInSession.add(hash);
      }
      for (const hash of hashesInSession) {
        if (!hashToSessions.has(hash)) hashToSessions.set(hash, []);
        hashToSessions.get(hash).push(session);
      }
    }
  } finally {
    store.close();
  }

  const summaryLookup = buildSummaryLookup(dbPath);
  const clusters = [];
  let totalRunsCovered = 0;

  for (const [hash, clusterSessions] of hashToSessions.entries()) {
    if (clusterSessions.length < minRuns) continue;
    const scores = clusterSessions
      .map(trustScoreOf)
      .filter((score) => score !== null);
    if (scores.length < minRuns) continue;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const range = max - min;
    if (range < minRange) continue;
    const { mean, stdev } = meanAndStdev(scores);
    const successes = scores.filter((s) => s >= successThreshold).length;
    const failures = scores.filter((s) => s < failureThreshold).length;
    if (successes === 0 || failures === 0) continue; // must have both
    const flakinessScore = Math.min(1, (range / 100) * 0.6 + (stdev / 50) * 0.4);
    totalRunsCovered += scores.length;
    clusters.push({
      prompt_hash: hash,
      prompt_summary: summaryLookup.get(hash) ?? null,
      sessions: clusterSessions.map((session) => ({
        session_id: session.session_id,
        framework: session.framework,
        trust_score: trustScoreOf(session),
        started_at: session.started_at
      })).sort((a, b) => String(a.started_at || '').localeCompare(String(b.started_at || ''))),
      total_runs: scores.length,
      success_count: successes,
      failure_count: failures,
      trust_mean: mean,
      trust_stdev: stdev,
      trust_range: range,
      trust_min: min,
      trust_max: max,
      flakiness_score: Number(flakinessScore.toFixed(2))
    });
  }

  clusters.sort((a, b) => b.flakiness_score - a.flakiness_score);

  return {
    clusters: clusters.slice(0, limit),
    total_clusters: clusters.length,
    flaky_clusters: clusters.length,
    total_runs_covered: totalRunsCovered
  };
}
