import { RunqStore } from './store.js';

const secretLikePattern = /\b(?:sk-[A-Za-z0-9_-]{12,}|[A-Za-z0-9_]*API[_-]?KEY[A-Za-z0-9_]*|ghp_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,})\b/i;

const timelineEventTypes = new Set([
  'model.call.started',
  'model.call.ended',
  'command.started',
  'command.ended',
  'tool.call.started',
  'tool.call.ended',
  'file.changed',
  'git.diff.summarized',
  'test.started',
  'test.ended',
  'build.started',
  'build.ended',
  'lint.started',
  'lint.ended'
]);

function round2(value) {
  return Number(value.toFixed(2));
}

function isUsableTimeline(events) {
  const timelineEvents = events.filter((event) => timelineEventTypes.has(event.event_type));
  const hasLifecycle = events.some((event) => event.event_type === 'session.started' || event.event_type === 'session.ended');
  return timelineEvents.length >= 2 || (timelineEvents.length >= 1 && hasLifecycle);
}

function payloadContainsSecretLikeValue(payload) {
  return secretLikePattern.test(JSON.stringify(payload));
}

function summarizeSessions(store) {
  const sessions = store.listSessions();
  let usable = 0;
  const secretFindings = [];
  const frameworkCounts = {};

  for (const session of sessions) {
    frameworkCounts[session.framework] = (frameworkCounts[session.framework] ?? 0) + 1;
    const events = store.listEventsForSession(session.session_id);
    if (isUsableTimeline(events)) {
      usable += 1;
    }
    for (const event of events) {
      if (payloadContainsSecretLikeValue(event.payload)) {
        secretFindings.push({
          event_id: event.event_id,
          session_id: event.session_id,
          event_type: event.event_type
        });
      }
    }
  }

  return {
    sessions,
    usable,
    secretFindings,
    frameworkCounts
  };
}

export function createReadinessReport({ dbPath }) {
  const store = new RunqStore(dbPath);
  try {
    const summary = summarizeSessions(store);
    const total = summary.sessions.length;
    const usablePercent = total === 0 ? 0 : round2(summary.usable / total);
    const hasEnoughPreviewData = total >= 50;
    const usableTimelineTargetMet = total > 0 && usablePercent >= 0.8;
    const redactionTargetMet = summary.secretFindings.length === 0;

    return {
      runq_version: '0.2.0',
      generated_at: new Date().toISOString(),
      ready_for_public_preview: hasEnoughPreviewData && usableTimelineTargetMet && redactionTargetMet,
      criteria: {
        min_real_sessions: {
          target: 50,
          actual: total,
          ok: hasEnoughPreviewData
        },
        usable_timeline_percent: {
          target: 0.8,
          actual: usablePercent,
          ok: usableTimelineTargetMet
        },
        redaction_findings: {
          target: 0,
          actual: summary.secretFindings.length,
          ok: redactionTargetMet
        }
      },
      sessions: {
        total,
        usable_timeline_count: summary.usable,
        usable_timeline_percent: usablePercent,
        by_framework: summary.frameworkCounts
      },
      redaction: {
        secret_like_payload_findings: summary.secretFindings
      }
    };
  } finally {
    store.close();
  }
}
