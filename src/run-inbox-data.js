import { RunqStore } from './store.js';
import { scoreRun } from './scoring.js';
import { recommendRunImprovements } from './recommendations.js';

export function defaultRunInboxDbPath() {
  return process.env.RUNQ_DB || '.runq/runq.db';
}

export function latestSatisfaction(events) {
  return [...events].reverse().find((event) => event.event_type === 'satisfaction.recorded')?.payload ?? null;
}

export function getRunInboxSessions(dbPath = defaultRunInboxDbPath()) {
  const store = new RunqStore(dbPath);
  try {
    return store.listSessions().map((session) => {
      const events = store.listEventsForSession(session.session_id);
      return {
        ...session,
        quality: scoreRun(events),
        recommendations: recommendRunImprovements(events),
        satisfaction: latestSatisfaction(events)
      };
    });
  } finally {
    store.close();
  }
}

export function getRunInboxEvents(sessionId, dbPath = defaultRunInboxDbPath()) {
  const store = new RunqStore(dbPath);
  try {
    return store.listEventsForSession(sessionId);
  } finally {
    store.close();
  }
}
