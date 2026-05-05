import { RunqStore } from './store.js';
import { scoreRun } from './scoring.js';
import { recommendRunImprovements } from './recommendations.js';

export function defaultRunInboxDbPath() {
  return process.env.RUNQ_DB || '.runq/runq.db';
}

export function latestSatisfaction(events) {
  return [...events].reverse().find((event) => event.event_type === 'satisfaction.recorded')?.payload ?? null;
}

function number(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export function summarizeSessionTelemetry(events) {
  const modelEnded = events.filter((event) => event.event_type === 'model.call.ended');
  const commandEnded = events.filter((event) => event.event_type === 'command.ended');
  const verificationEnded = commandEnded.filter((event) => event.payload?.is_verification === true);
  const inputTokens = modelEnded.reduce((sum, event) => sum + number(event.payload?.input_tokens), 0);
  const outputTokens = modelEnded.reduce((sum, event) => sum + number(event.payload?.output_tokens), 0);
  const totalTokens = modelEnded.reduce((sum, event) => sum + number(event.payload?.total_tokens), 0);
  const commandDuration = commandEnded.reduce((sum, event) => sum + number(event.payload?.duration_ms), 0);
  const modelDuration = modelEnded.reduce((sum, event) => sum + number(event.payload?.duration_ms), 0);

  return {
    model_call_count: modelEnded.length,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens || inputTokens + outputTokens,
    model_duration_ms: modelDuration,
    avg_model_duration_ms: modelEnded.length ? Math.round(modelDuration / modelEnded.length) : 0,
    command_count: commandEnded.length,
    command_duration_ms: commandDuration,
    avg_command_duration_ms: commandEnded.length ? Math.round(commandDuration / commandEnded.length) : 0,
    verification_count: verificationEnded.length,
    verification_passed_count: verificationEnded.filter((event) => number(event.payload?.exit_code) === 0).length,
    verification_failed_count: verificationEnded.filter((event) => number(event.payload?.exit_code) !== 0).length,
    file_change_count: events.filter((event) => event.event_type === 'file.changed').length
  };
}

function sessionTime(session) {
  return session.last_event_at || session.ended_at || session.started_at || '';
}

function hasVerifiedOutcome(session) {
  return session.satisfaction?.label === 'accepted' ||
    Number(session.quality?.outcome_confidence || 0) >= 0.8 ||
    Number(session.telemetry?.verification_passed_count || 0) > 0;
}

function recommendationImpact(recommendation, sourceSession, sessions) {
  if (recommendation.state?.status !== 'accepted' || !recommendation.state?.decided_at) {
    return null;
  }

  const followups = sessions.filter((session) =>
    session.framework === sourceSession.framework &&
    session.session_id !== sourceSession.session_id &&
    sessionTime(session) > recommendation.state.decided_at
  );
  const verified = followups.filter(hasVerifiedOutcome);

  return {
    status: verified.length > 0 ? 'verified' : 'pending',
    followup_count: followups.length,
    followup_session_ids: followups.map((session) => session.session_id),
    verified_session_ids: verified.map((session) => session.session_id)
  };
}

export function getRunInboxSessions(dbPath = defaultRunInboxDbPath()) {
  const store = new RunqStore(dbPath);
  try {
    const sessions = store.listSessions().map((session) => {
      const events = store.listEventsForSession(session.session_id);
      return {
        ...session,
        quality: scoreRun(events),
        recommendations: recommendRunImprovements(events),
        satisfaction: latestSatisfaction(events),
        telemetry: summarizeSessionTelemetry(events)
      };
    });

    return sessions.map((session) => ({
      ...session,
      recommendations: session.recommendations.map((recommendation) => {
        const impact = recommendationImpact(recommendation, session, sessions);
        return impact ? { ...recommendation, impact } : recommendation;
      })
    }));
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
