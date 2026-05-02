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
  const ended = events.find((event) => event.event_type === 'session.ended');

  if (fileChanges.length === 0 || failedVerification.length === 0 || !ended) {
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

export function recommendRunImprovements(events) {
  return [
    permissionPolicyRecommendation(events),
    verificationStrategyRecommendation(events),
    repoInstructionRecommendation(events),
    loopPreventionRecommendation(events)
  ].filter(Boolean);
}
