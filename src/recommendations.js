const safeReadOnlyCommands = new Set(['rg', 'grep', 'sed', 'awk', 'ls', 'find', 'cat', 'git']);

function commandKey(event) {
  return `${event.payload.binary ?? ''}:${event.payload.args_hash ?? ''}`;
}

function recommendation(id, category, title, summary, evidenceEvents, suggestedAction, confidence = 0.7) {
  return {
    recommendation_id: id,
    category,
    title,
    summary,
    confidence,
    evidence_event_ids: evidenceEvents.map((event) => event.event_id),
    affected_session_ids: [...new Set(evidenceEvents.map((event) => event.session_id))],
    suggested_action: suggestedAction
  };
}

function permissionPolicyRecommendation(events) {
  const approvalEvents = events.filter((event) => {
    const binary = event.payload.binary ?? String(event.payload.resource_hash ?? '');
    return event.event_type === 'permission.resolved' &&
      event.payload.decision === 'allow' &&
      safeReadOnlyCommands.has(binary);
  });

  if (approvalEvents.length < 3) {
    return null;
  }

  return recommendation(
    'rec_permission_allowlist',
    'permission_policy',
    'Add a read-only command allowlist',
    'Safe read-only commands are repeatedly waiting for approval.',
    approvalEvents,
    'Allowlist frequently approved read-only commands such as rg, git diff, sed, ls, and find for this repo.',
    0.8
  );
}

function verificationStrategyRecommendation(events) {
  const fileChanges = events.filter((event) => event.event_type === 'file.changed' || event.event_type === 'git.diff.summarized');
  const failedVerification = events.filter((event) =>
    event.event_type === 'command.ended' &&
    event.payload.is_verification === true &&
    Number(event.payload.exit_code) !== 0
  );
  const latestVerification = events
    .filter((event) => event.event_type === 'command.ended' && event.payload.is_verification === true)
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
    .at(-1);
  const ended = events.find((event) => event.event_type === 'session.ended');

  if (fileChanges.length === 0 || failedVerification.length === 0 || !ended) {
    return null;
  }
  if (Number(latestVerification?.payload?.exit_code) === 0) {
    return null;
  }

  return recommendation(
    'rec_verification_strategy',
    'verification_strategy',
    'Run targeted verification earlier',
    'The run changed files and ended after a failed verification command.',
    [...failedVerification, ended],
    'Ask the agent to run targeted tests immediately after each related code change and stop to inspect the first failing verification.',
    0.85
  );
}

function repoInstructionRecommendation(events) {
  const fileChanges = events.filter((event) => event.event_type === 'file.changed' || event.event_type === 'git.diff.summarized');
  const verification = events.filter((event) =>
    event.event_type === 'command.ended' &&
    event.payload.is_verification === true
  );

  if (fileChanges.length === 0 || verification.length > 0) {
    return null;
  }

  return recommendation(
    'rec_repo_instruction_verification',
    'repo_instruction',
    'Add repo-specific verification instructions',
    'The agent changed files without running a verification command.',
    fileChanges,
    'Document package-specific test and build commands in AGENTS.md, CLAUDE.md, or Codex instructions so agents know how to verify changes.',
    0.75
  );
}

function loopPreventionRecommendation(events) {
  const failedCommandEvents = events.filter((event) =>
    event.event_type === 'command.ended' &&
    Number(event.payload.exit_code) !== 0
  );
  const byCommand = new Map();
  for (const event of failedCommandEvents) {
    const key = commandKey(event);
    const next = byCommand.get(key) ?? [];
    next.push(event);
    byCommand.set(key, next);
  }

  const repeated = [...byCommand.values()].find((group) => group.length >= 3);
  if (!repeated) {
    return null;
  }

  return recommendation(
    'rec_loop_prevention',
    'loop_prevention',
    'Add a stop rule for repeated command failures',
    'The same command failed repeatedly during the run.',
    repeated,
    'Tell the agent to stop after two identical command failures, inspect the error, and change strategy before retrying.',
    0.8
  );
}

function workspaceTargetingRecommendation(events) {
  const ended = events.find((event) => event.event_type === 'session.ended');
  const satisfaction = [...events].reverse().find((event) => event.event_type === 'satisfaction.recorded');
  const fileChanges = events.filter((event) => event.event_type === 'file.changed' || event.event_type === 'git.diff.summarized');
  const exploratoryCommands = events.filter((event) =>
    event.event_type === 'command.ended' &&
    ['find', 'ls', 'grep', 'rg'].includes(event.payload.binary)
  );

  if (fileChanges.length > 0 || exploratoryCommands.length < 2) {
    return null;
  }
  if (ended?.payload?.ended_reason !== 'error' && satisfaction?.payload?.label !== 'abandoned') {
    return null;
  }

  return recommendation(
    'rec_workspace_targeting',
    'task_sizing',
    'Constrain the agent workspace before running',
    'The run spent effort exploring files, made no code changes, and ended without a useful result.',
    [...exploratoryCommands.slice(0, 5), ended, satisfaction].filter(Boolean),
    'Launch the agent from the target repo directory or pass an explicit workspace path and success command in the task prompt.',
    0.8
  );
}

function satisfactionFeedbackRecommendation(events) {
  const satisfaction = [...events].reverse().find((event) => event.event_type === 'satisfaction.recorded');
  const label = satisfaction?.payload?.label;

  if (label === 'corrected') {
    return recommendation(
      'rec_feedback_correction_capture',
      'feedback_loop',
      'Capture the manual correction as training signal',
      'The user corrected the agent output after the run.',
      [satisfaction],
      'Record the correction summary, expected files, and verification command so future agents can compare against the human fix.',
      0.75
    );
  }

  if (label === 'rerun') {
    return recommendation(
      'rec_feedback_rerun_scope',
      'task_sizing',
      'Split or constrain tasks that require reruns',
      'The user needed another agent pass after this run.',
      [satisfaction],
      'Break the next task into a smaller success condition with an explicit verification command before launching another run.',
      0.7
    );
  }

  if (label === 'escalated') {
    return recommendation(
      'rec_feedback_escalation_policy',
      'escalation_policy',
      'Add an escalation rule for this failure mode',
      'The run required human ownership instead of another autonomous pass.',
      [satisfaction],
      'Define when the agent should stop and ask for human review, including the error class, touched subsystem, and handoff checklist.',
      0.8
    );
  }

  return null;
}

function feedbackStateFor(events, recommendationId) {
  const feedback = events
    .filter((event) =>
      (event.event_type === 'recommendation.accepted' || event.event_type === 'recommendation.dismissed') &&
      event.payload?.recommendation_id === recommendationId
    )
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
    .at(-1);

  if (!feedback) {
    return { status: 'new', decided_at: null, note: null };
  }
  return {
    status: feedback.event_type === 'recommendation.accepted' ? 'accepted' : 'dismissed',
    decided_at: feedback.timestamp,
    note: feedback.payload?.note ?? null
  };
}

export function recommendRunImprovements(events) {
  return [
    permissionPolicyRecommendation(events),
    verificationStrategyRecommendation(events),
    repoInstructionRecommendation(events),
    loopPreventionRecommendation(events),
    workspaceTargetingRecommendation(events),
    satisfactionFeedbackRecommendation(events)
  ]
    .filter(Boolean)
    .map((rec) => ({ ...rec, state: feedbackStateFor(events, rec.recommendation_id) }));
}
