function clamp(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function commandKey(event) {
  return `${event.payload.binary ?? ''}:${event.payload.args_hash ?? ''}`;
}

function trustDimension(label, score, reasons) {
  return {
    label,
    score: clampScore(score),
    reasons: Array.from(new Set(reasons.filter(Boolean)))
  };
}

function buildTrustBreakdown({
  commandEnded,
  costEfficiency,
  events,
  failedVerification,
  fileChanges,
  loopRisk,
  outcomeConfidence,
  passedVerification,
  permissionFriction,
  reworkRisk,
  satisfaction,
  verificationCommands,
  verificationCoverage
}) {
  const lifecycleEvents = events.filter((event) => event.event_type === 'session.started' || event.event_type === 'session.ended');
  const modelEvents = events.filter((event) => event.event_type.startsWith('model.'));
  const toolEvents = events.filter((event) => event.event_type.startsWith('tool.call.'));
  const evidenceReasons = [];
  if (lifecycleEvents.length > 0) evidenceReasons.push('lifecycle_events_present');
  if (modelEvents.length > 0) evidenceReasons.push('model_events_present');
  if (toolEvents.length > 0) evidenceReasons.push('tool_events_present');
  if (fileChanges.length > 0) evidenceReasons.push('file_change_evidence');
  if (verificationCommands.length > 0) evidenceReasons.push('verification_evidence');
  if (satisfaction) evidenceReasons.push('satisfaction_signal_present');
  if (evidenceReasons.length === 0) evidenceReasons.push('limited_evidence');

  const evidenceStrength = Math.min(100, 30 + evidenceReasons.length * 12);
  const verificationReasons = [];
  if (verificationCommands.length === 0) verificationReasons.push('no_verification');
  if (passedVerification.length > 0) verificationReasons.push('verification_passed');
  if (failedVerification.length > 0) verificationReasons.push('verification_failed_observed');
  if (failedVerification.length > 0 && passedVerification.length > 0) verificationReasons.push('verification_recovered');
  if (failedVerification.length > 0 && passedVerification.length === 0) verificationReasons.push('verification_failed_at_end');

  const executionReasons = [];
  if (commandEnded.length > 0) executionReasons.push('commands_observed');
  if (toolEvents.length > 0) executionReasons.push('tool_calls_observed');
  if (loopRisk > 0) executionReasons.push('loop_risk_detected');
  if (reworkRisk >= 0.7) executionReasons.push('high_rework_risk');
  if (failedVerification.length > 0 && passedVerification.length === 0) executionReasons.push('verification_failed_at_end');

  const autonomyReasons = [];
  if (!satisfaction) autonomyReasons.push('no_satisfaction_signal');
  if (satisfaction?.payload?.label) autonomyReasons.push(`satisfaction_${satisfaction.payload.label}`);
  if (permissionFriction > 0) autonomyReasons.push('permission_friction_observed');

  const riskReasons = [];
  if (verificationCommands.length === 0 && fileChanges.length > 0) riskReasons.push('unverified_changes');
  if (failedVerification.length > 0 && passedVerification.length === 0) riskReasons.push('verification_failed_at_end');
  if (loopRisk > 0) riskReasons.push('loop_risk_detected');
  if (permissionFriction >= 0.75) riskReasons.push('high_permission_wait');
  if (reworkRisk >= 0.75) riskReasons.push('high_rework_risk');
  if (riskReasons.length === 0) riskReasons.push('low_observed_risk');

  const riskExposure = Math.max(
    verificationCommands.length === 0 && fileChanges.length > 0 ? 70 : 10,
    failedVerification.length > 0 && passedVerification.length === 0 ? 80 : 10,
    loopRisk * 100,
    permissionFriction * 100,
    reworkRisk * 75
  );

  return {
    evidence_strength: trustDimension('Evidence Strength', evidenceStrength, evidenceReasons),
    verification_strength: trustDimension('Verification Strength', verificationCoverage * 100, verificationReasons),
    execution_quality: trustDimension('Execution Quality', 100 - Math.max(loopRisk * 100, reworkRisk * 70, failedVerification.length && passedVerification.length === 0 ? 75 : 0), executionReasons),
    autonomy_reliability: trustDimension('Autonomy Reliability', 100 - Math.max(permissionFriction * 80, reworkRisk * 45, satisfaction?.payload?.label === 'abandoned' ? 90 : 0), autonomyReasons),
    cost_discipline: trustDimension('Cost Discipline', costEfficiency * 100, ['cost_metadata_observed']),
    risk_exposure: trustDimension('Risk Exposure', riskExposure, riskReasons)
  };
}

export function scoreRun(events) {
  const reasons = [];
  const fileChanges = events.filter((event) => event.event_type === 'file.changed' || event.event_type === 'git.diff.summarized');
  const commandEnded = events.filter((event) => event.event_type === 'command.ended');
  const verificationCommands = commandEnded.filter((event) => event.payload.is_verification === true);
  const failedVerification = verificationCommands.filter((event) => Number(event.payload.exit_code) !== 0);
  const passedVerification = verificationCommands.filter((event) => Number(event.payload.exit_code) === 0);
  const latestVerification = [...verificationCommands].sort((left, right) => left.timestamp.localeCompare(right.timestamp)).at(-1);
  const permissionEvents = events.filter((event) => event.event_type === 'permission.resolved');
  const sessionEnded = events.find((event) => event.event_type === 'session.ended');
  const satisfaction = [...events].reverse().find((event) => event.event_type === 'satisfaction.recorded');

  let outcomeConfidence = 0.55;
  let verificationCoverage = fileChanges.length > 0 ? 0.2 : 0.5;
  let reworkRisk = 0.4;
  let permissionFriction = 0;
  let loopRisk = 0;
  let costEfficiency = 0.5;

  if (fileChanges.length > 0 && passedVerification.length > 0 && Number(latestVerification?.payload?.exit_code) === 0) {
    outcomeConfidence = 0.9;
    verificationCoverage = 1;
    reworkRisk = 0.1;
    reasons.push('verification_passed_after_changes');
  }

  if (failedVerification.length > 0 && sessionEnded && Number(latestVerification?.payload?.exit_code) !== 0) {
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

  if (satisfaction?.payload?.label === 'accepted') {
    outcomeConfidence = Math.max(outcomeConfidence, 0.85);
    reworkRisk = Math.min(reworkRisk, 0.2);
    reasons.push('satisfaction_accepted');
  }

  if (satisfaction?.payload?.label === 'abandoned') {
    outcomeConfidence = Math.min(outcomeConfidence, 0.15);
    reworkRisk = Math.max(reworkRisk, 0.85);
    reasons.push('satisfaction_abandoned');
  }

  if (satisfaction?.payload?.label === 'needs_review') {
    outcomeConfidence = Math.min(outcomeConfidence, 0.45);
    reworkRisk = Math.max(reworkRisk, 0.55);
    reasons.push('satisfaction_needs_review');
  }

  if (satisfaction?.payload?.label === 'corrected') {
    outcomeConfidence = Math.min(outcomeConfidence, 0.55);
    reworkRisk = Math.max(reworkRisk, 0.65);
    reasons.push('satisfaction_corrected');
  }

  if (satisfaction?.payload?.label === 'rerun') {
    outcomeConfidence = Math.min(outcomeConfidence, 0.35);
    reworkRisk = Math.max(reworkRisk, 0.7);
    reasons.push('satisfaction_rerun');
  }

  if (satisfaction?.payload?.label === 'escalated') {
    outcomeConfidence = Math.min(outcomeConfidence, 0.25);
    reworkRisk = Math.max(reworkRisk, 0.8);
    reasons.push('satisfaction_escalated');
  }

  const normalizedOutcomeConfidence = clamp(outcomeConfidence);
  const normalizedVerificationCoverage = clamp(verificationCoverage);
  const normalizedReworkRisk = clamp(reworkRisk);
  const normalizedPermissionFriction = clamp(permissionFriction);
  const normalizedLoopRisk = clamp(loopRisk);
  const normalizedCostEfficiency = clamp(costEfficiency);
  const trustBreakdown = buildTrustBreakdown({
    commandEnded,
    costEfficiency: normalizedCostEfficiency,
    events,
    failedVerification,
    fileChanges,
    loopRisk: normalizedLoopRisk,
    outcomeConfidence: normalizedOutcomeConfidence,
    passedVerification,
    permissionFriction: normalizedPermissionFriction,
    reworkRisk: normalizedReworkRisk,
    satisfaction,
    verificationCommands,
    verificationCoverage: normalizedVerificationCoverage
  });

  return {
    outcome_confidence: normalizedOutcomeConfidence,
    trust_score: clampScore(normalizedOutcomeConfidence * 100),
    trust_breakdown: trustBreakdown,
    verification_coverage: normalizedVerificationCoverage,
    rework_risk: normalizedReworkRisk,
    permission_friction: normalizedPermissionFriction,
    loop_risk: normalizedLoopRisk,
    cost_efficiency: normalizedCostEfficiency,
    score_version: '0.2.0',
    reasons
  };
}
