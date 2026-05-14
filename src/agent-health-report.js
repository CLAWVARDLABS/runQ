import { getRunInboxSessions, defaultRunInboxDbPath } from './run-inbox-data.js';
import { RunqStore } from './store.js';

// Map a public agent id (URL slug / framework column) to the framework
// values RunQ stores. Hooks and importers all use these:
//   claude_code | codex | openclaw | hermes
const AGENT_DISPLAY_NAMES = {
  claude_code: 'Claude Code',
  codex: 'Codex',
  openclaw: 'OpenClaw',
  hermes: 'Hermes'
};

function trustScoreOf(session) {
  if (session?.quality?.trust_score !== undefined) return Number(session.quality.trust_score);
  if (session?.quality?.outcome_confidence !== undefined) {
    return Math.round(Number(session.quality.outcome_confidence) * 100);
  }
  return 0;
}

function bucketTrustScore(score) {
  if (score >= 80) return '80-100';
  if (score >= 60) return '60-79';
  if (score >= 40) return '40-59';
  if (score >= 20) return '20-39';
  return '0-19';
}

function activityByDay(sessions) {
  const counts = new Map();
  const now = Date.now();
  for (let daysAgo = 6; daysAgo >= 0; daysAgo -= 1) {
    const key = new Date(now - daysAgo * 86_400_000).toISOString().slice(0, 10);
    counts.set(key, 0);
  }
  for (const session of sessions) {
    const ts = session.started_at || session.last_event_at;
    if (!ts) continue;
    const key = String(ts).slice(0, 10);
    if (counts.has(key)) counts.set(key, counts.get(key) + 1);
  }
  return [...counts.entries()].map(([date, count]) => ({ date, count }));
}

export function getAgentHealthReport(agentId, dbPath = defaultRunInboxDbPath()) {
  const allSessions = getRunInboxSessions(dbPath);
  const sessions = allSessions.filter((session) => session.framework === agentId);

  if (sessions.length === 0) {
    return {
      agent_id: agentId,
      display_name: AGENT_DISPLAY_NAMES[agentId] ?? agentId,
      session_count: 0,
      event_count: 0,
      first_seen: null,
      last_seen: null,
      trust_score_median: null,
      trust_score_buckets: [],
      tool_top: [],
      activity_by_day: activityByDay([]),
      top_sessions: [],
      bottom_sessions: [],
      total_input_tokens: 0,
      total_output_tokens: 0
    };
  }

  // Aggregate tool usage with a single store open. For agents with thousands
  // of sessions (Codex easily has 1000+ rollouts locally), opening/closing the
  // store per session is the dominant cost.
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const toolCounts = new Map();
  const store = new RunqStore(dbPath);
  try {
    for (const session of sessions) {
      if (session.telemetry) {
        totalInputTokens += Number(session.telemetry.input_tokens || 0);
        totalOutputTokens += Number(session.telemetry.output_tokens || 0);
      }
      const events = store.listEventsForSession(session.session_id);
      for (const event of events) {
        if (event.event_type !== 'tool.call.started') continue;
        const name = event.payload?.tool_name ?? 'unknown';
        toolCounts.set(name, (toolCounts.get(name) || 0) + 1);
      }
    }
  } finally {
    store.close();
  }
  const tool_top = [...toolCounts.entries()]
    .map(([tool, count]) => ({ tool, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const scores = sessions.map((session) => ({ session, score: trustScoreOf(session) }));
  scores.sort((a, b) => b.score - a.score);
  const medianScore = scores.length
    ? scores[Math.floor(scores.length / 2)].score
    : null;
  const bucketCounts = new Map();
  for (const { score } of scores) {
    const bucket = bucketTrustScore(score);
    bucketCounts.set(bucket, (bucketCounts.get(bucket) || 0) + 1);
  }
  const trust_score_buckets = ['0-19', '20-39', '40-59', '60-79', '80-100']
    .map((bucket) => ({ bucket, count: bucketCounts.get(bucket) || 0 }));

  const sortedByStart = [...sessions].sort((a, b) =>
    String(a.started_at || a.last_event_at).localeCompare(String(b.started_at || b.last_event_at))
  );
  const firstSeen = sortedByStart[0]?.started_at || sortedByStart[0]?.last_event_at;
  const lastSeen = sortedByStart.at(-1)?.last_event_at || sortedByStart.at(-1)?.started_at;

  const summarizeSession = ({ session, score }) => ({
    session_id: session.session_id,
    started_at: session.started_at,
    last_event_at: session.last_event_at,
    event_count: session.event_count,
    trust_score: score,
    tool_calls: Number(session.telemetry?.command_count || 0)
  });

  return {
    agent_id: agentId,
    display_name: AGENT_DISPLAY_NAMES[agentId] ?? agentId,
    session_count: sessions.length,
    event_count: sessions.reduce((sum, s) => sum + Number(s.event_count || 0), 0),
    first_seen: firstSeen,
    last_seen: lastSeen,
    trust_score_median: medianScore,
    trust_score_buckets,
    tool_top,
    activity_by_day: activityByDay(sessions),
    top_sessions: scores.slice(0, 3).map(summarizeSession),
    bottom_sessions: scores.slice(-3).reverse().map(summarizeSession),
    total_input_tokens: totalInputTokens,
    total_output_tokens: totalOutputTokens
  };
}
