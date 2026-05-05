import { randomUUID } from 'node:crypto';

const validDecisions = new Set(['accepted', 'dismissed']);

export function recordRecommendationFeedback(store, { sessionId, recommendationId, decision, note }) {
  if (!validDecisions.has(decision)) {
    throw new Error('decision must be "accepted" or "dismissed"');
  }
  if (!sessionId || !recommendationId) {
    throw new Error('sessionId and recommendationId are required');
  }

  const events = store.listEventsForSession(sessionId);
  const referenceEvent = events.at(-1) ?? events[0];
  if (!referenceEvent) {
    throw new Error(`session ${sessionId} has no events to attach feedback to`);
  }

  const eventType = decision === 'accepted' ? 'recommendation.accepted' : 'recommendation.dismissed';
  const event = {
    runq_version: referenceEvent.runq_version ?? '0.1.0',
    event_id: `evt_rec_${decision}_${randomUUID()}`,
    schema_version: referenceEvent.schema_version ?? '0.1.0',
    event_type: eventType,
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    run_id: referenceEvent.run_id,
    framework: referenceEvent.framework,
    source: 'manual',
    privacy: { level: 'metadata', redacted: true },
    payload: {
      recommendation_id: recommendationId,
      ...(note ? { note } : {})
    }
  };

  store.appendEvent(event);
  return event;
}
