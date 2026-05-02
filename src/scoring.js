function clamp(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function commandKey(event) {
  return `${event.payload.binary ?? ''}:${event.payload.args_hash ?? ''}`;
}

export function scoreRun(events) {
  const reasons = [];
  const fileChanges = events.filter((event) => event.event_type === 'file.changed' || event.event_type === 'git.diff.summarized');
  const commandEnded = events.filter((event) => event.event_type === 'command.ended');
  const verificationCommands = commandEnded.filter((event) => event.payload.is_verification === true);
  const failedVerification = verificationCommands.filter((event) => Number(event.payload.exit_code) !== 0);
  const passedVerification = verificationCommands.filter((event) => Number(event.payload.exit_code) === 0);
  const permissionEvents = events.filter((event) => event.event_type === 'permission.resolved');
  const sessionEnded = events.find((event) => event.event_type === 'session.ended');

  let outcomeConfidence = 0.55;
  let verificationCoverage = fileChanges.length > 0 ? 0.2 : 0.5;
  let reworkRisk = 0.4;
  let permissionFriction = 0;
  let loopRisk = 0;
  let costEfficiency = 0.5;

  if (fileChanges.length > 0 && passedVerification.length > 0 && failedVerification.length === 0) {
    outcomeConfidence = 0.9;
    verificationCoverage = 1;
    reworkRisk = 0.1;
    reasons.push('verification_passed_after_changes');
  }

  if (failedVerification.length > 0 && sessionEnded) {
    outcomeConfidence = Math.min(outcomeConfidence, 0.2);
    verificationCoverage = Math.max(verificationCoverage, 0.4);
    reworkRisk = Math.max(reworkRisk, 0.8);
    reasons.push('verification_failed_at_end');
  }

  if (fileChanges.length > 0 && verificationCommands.length === 0) {
    outcomeConfidence = Math.min(outcomeConfidence, 0.35);
    verificationCoverage = 0;
    reworkRisk = Math.max(reworkRisk, 0.75);
    reasons.push('changes_without_verification');
  }

  const totalPermissionWait = permissionEvents.reduce((sum, event) => sum + Number(event.payload.wait_ms ?? 0), 0);
  if (permissionEvents.length > 0) {
    permissionFriction = clamp(Math.min(1, totalPermissionWait / 60_000));
    if (totalPermissionWait >= 30_000 || permissionEvents.length >= 3) {
      permissionFriction = Math.max(permissionFriction, 0.75);
      reasons.push('high_permission_wait');
    }
  }

  const failedCommandCounts = new Map();
  for (const event of commandEnded) {
    if (Number(event.payload.exit_code) === 0) {
      continue;
    }
    const key = commandKey(event);
    failedCommandCounts.set(key, (failedCommandCounts.get(key) ?? 0) + 1);
  }
  if ([...failedCommandCounts.values()].some((count) => count >= 3)) {
    loopRisk = 0.8;
    outcomeConfidence = Math.min(outcomeConfidence, 0.25);
    reworkRisk = Math.max(reworkRisk, 0.7);
    reasons.push('repeated_command_failure');
  }

  if (sessionEnded?.payload?.ended_reason === 'interrupted') {
    outcomeConfidence = Math.min(outcomeConfidence, 0.2);
    reworkRisk = Math.max(reworkRisk, 0.8);
    reasons.push('user_interrupted');
  }

  return {
    outcome_confidence: clamp(outcomeConfidence),
    verification_coverage: clamp(verificationCoverage),
    rework_risk: clamp(reworkRisk),
    permission_friction: clamp(permissionFriction),
    loop_risk: clamp(loopRisk),
    cost_efficiency: clamp(costEfficiency),
    score_version: '0.1.0',
    reasons
  };
}
