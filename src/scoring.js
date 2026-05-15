function clamp(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function number(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function commandKey(event) {
  return `${event.payload.binary ?? ''}:${event.payload.args_hash ?? ''}`;
}

function scoreContribution(reason, impact) {
  return {
    reason,
    impact: Math.round(impact)
  };
}

function eventDurationMinutes(events) {
  const timestamps = events
    .map((event) => Date.parse(event.timestamp))
    .filter((value) => Number.isFinite(value));
  if (timestamps.length < 2) return 0;
  return Math.max(0, (Math.max(...timestamps) - Math.min(...timestamps)) / 60_000);
}

function changeVolume(fileChanges) {
  return fileChanges.reduce((sum, event) =>
    sum + number(event.payload?.lines_added) + number(event.payload?.lines_removed), 0);
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

import { applyUniversalSignals } from './scoring/universal.js';
import { profileFromEvents } from './agent-profiles.js';

export function scoreRun(events) {
  const reasons = [];
  const scoreContributions = [];

  // Universal human↔agent signals run first. These apply to ANY agent (coding
  // or conversation) because they observe the user's behavior — prompt
  // repeats, rapid retries, sign-off tone, session abandonment. The coding-
  // specific signals below stack on top, but their hard caps only fire when
  // the dominant framework is a coding-category profile.
  const universal = applyUniversalSignals(events);
  for (const c of universal.contributions) scoreContributions.push(c);
  for (const r of universal.reasons) reasons.push(r);

  const profile = profileFromEvents(events);
  const isCodingDomain = profile.category === 'coding';
  const lifecycleEvents = events.filter((event) => event.event_type === 'session.started' || event.event_type === 'session.ended');
  const promptEvents = events.filter((event) => event.event_type === 'user.prompt.submitted');
  const modelEvents = events.filter((event) => event.event_type.startsWith('model.'));
  const toolEnded = events.filter((event) => event.event_type === 'tool.call.ended');
  const toolErrors = toolEnded.filter((event) => event.payload?.status === 'error' || event.payload?.status === 'failed');
  const fileChanges = events.filter((event) => event.event_type === 'file.changed' || event.event_type === 'git.diff.summarized');
  const commandEnded = events.filter((event) => event.event_type === 'command.ended');
  const failedCommands = commandEnded.filter((event) => Number(event.payload.exit_code) !== 0);
  const passedCommands = commandEnded.filter((event) => Number(event.payload.exit_code) === 0);
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

  function add(reason, impact) {
    if (!impact) return;
    scoreContributions.push(scoreContribution(reason, impact));
  }

  const evidenceKinds = [
    lifecycleEvents.length > 0,
    promptEvents.length > 0,
    modelEvents.length > 0,
    toolEnded.length > 0,
    commandEnded.length > 0,
    fileChanges.length > 0,
    verificationCommands.length > 0,
    Boolean(satisfaction)
  ].filter(Boolean).length;
  add('evidence_breadth', Math.min(12, evidenceKinds * 1.5));

  if (fileChanges.length > 0) {
    add('file_change_evidence', Math.min(8, 3 + Math.sqrt(fileChanges.length) * 2));
  }

  if (commandEnded.length > 0) {
    const commandSuccessRate = passedCommands.length / commandEnded.length;
    add('command_success_rate', Math.round(commandSuccessRate * 12));
    const commandErrorPenalty = Math.min(16, (failedCommands.length / commandEnded.length) * 16);
    add('command_failure_rate', -commandErrorPenalty);
  }

  if (toolEnded.length > 0) {
    const toolSuccessRate = (toolEnded.length - toolErrors.length) / toolEnded.length;
    add('tool_success_rate', Math.round(toolSuccessRate * 8));
    const toolErrorPenalty = Math.min(12, (toolErrors.length / toolEnded.length) * 12);
    add('tool_failure_rate', -toolErrorPenalty);
    // Tool diversity rewards multi-faceted work — a session that called many
    // different tools generally did more than one that hammered the same one.
    const distinctTools = new Set(toolEnded.map((e) => e.payload?.tool_name).filter(Boolean));
    if (distinctTools.size >= 3) {
      add('tool_diversity', Math.min(6, distinctTools.size - 2));
    }
  }

  if (fileChanges.length > 0 && passedVerification.length > 0 && Number(latestVerification?.payload?.exit_code) === 0) {
    verificationCoverage = 1;
    reworkRisk = 0.1;
    add('verification_passed_after_changes', 22 + Math.min(4, passedVerification.length));
    reasons.push('verification_passed_after_changes');
  }

  if (failedVerification.length > 0 && passedVerification.length > 0 && Number(latestVerification?.payload?.exit_code) === 0) {
    add('verification_recovered', 4);
    reasons.push('verification_recovered');
  }

  if (failedVerification.length > 0 && sessionEnded && Number(latestVerification?.payload?.exit_code) !== 0) {
    verificationCoverage = Math.max(verificationCoverage, 0.4);
    reworkRisk = Math.max(reworkRisk, 0.8);
    add('verification_failed_at_end', -35);
    reasons.push('verification_failed_at_end');
  }

  if (fileChanges.length > 0 && verificationCommands.length === 0) {
    verificationCoverage = 0;
    reworkRisk = Math.max(reworkRisk, 0.7);
    // Softer penalty than before (-22): imported / backfilled sessions
    // legitimately don't carry verification events because we never captured
    // them — punishing every such session by -22 collapses the distribution
    // to a tight band around 48. Tool-call success signals + diversity still
    // discriminate good vs. bad runs.
    add('changes_without_verification', -10);
    reasons.push('changes_without_verification');
  }

  const changedLines = changeVolume(fileChanges);
  if (changedLines >= 100) {
    add('large_change_surface', -Math.min(8, Math.floor(changedLines / 100) * 2));
    reworkRisk = Math.max(reworkRisk, Math.min(0.75, 0.4 + changedLines / 1000));
  }

  const totalPermissionWait = permissionEvents.reduce((sum, event) => sum + Number(event.payload.wait_ms ?? 0), 0);
  if (permissionEvents.length > 0) {
    permissionFriction = clamp(Math.min(1, totalPermissionWait / 60_000));
    if (totalPermissionWait >= 30_000 || permissionEvents.length >= 3) {
      permissionFriction = Math.max(permissionFriction, 0.75);
      add('high_permission_wait', -6);
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
    reworkRisk = Math.max(reworkRisk, 0.7);
    add('repeated_command_failure', -25);
    reasons.push('repeated_command_failure');
  }

  if (sessionEnded?.payload?.ended_reason === 'interrupted') {
    reworkRisk = Math.max(reworkRisk, 0.8);
    add('user_interrupted', -28);
    reasons.push('user_interrupted');
  }

  const durationMinutes = eventDurationMinutes(events);
  const interactionCount = promptEvents.length + modelEvents.length + toolEnded.length + commandEnded.length + fileChanges.length;
  if (durationMinutes >= 10 && interactionCount >= 6 && loopRisk === 0 && failedCommands.length <= Math.max(1, commandEnded.length * 0.2)) {
    add('healthy_engagement', Math.min(6, 2 + Math.floor(durationMinutes / 10) + Math.floor(interactionCount / 8)));
    reasons.push('healthy_engagement');
  }

  const totalTokens = modelEvents.reduce((sum, event) => sum + number(event.payload?.total_tokens), 0);
  const hasStrongEvidence = fileChanges.length > 0 || verificationCommands.length > 0 || satisfaction;
  if (totalTokens >= 20_000 && !hasStrongEvidence) {
    costEfficiency = 0.25;
    add('high_cost_low_evidence', -8);
    reasons.push('high_cost_low_evidence');
  } else if (totalTokens > 0 && totalTokens <= 5_000) {
    costEfficiency = 0.65;
    add('cost_discipline', 2);
  }

  if (satisfaction?.payload?.label === 'accepted') {
    reworkRisk = Math.min(reworkRisk, 0.2);
    add('satisfaction_accepted', 18);
    reasons.push('satisfaction_accepted');
  }

  if (satisfaction?.payload?.label === 'abandoned') {
    reworkRisk = Math.max(reworkRisk, 0.85);
    add('satisfaction_abandoned', -40);
    reasons.push('satisfaction_abandoned');
  }

  if (satisfaction?.payload?.label === 'needs_review') {
    reworkRisk = Math.max(reworkRisk, 0.55);
    add('satisfaction_needs_review', -10);
    reasons.push('satisfaction_needs_review');
  }

  if (satisfaction?.payload?.label === 'corrected') {
    reworkRisk = Math.max(reworkRisk, 0.65);
    add('satisfaction_corrected', -18);
    reasons.push('satisfaction_corrected');
  }

  if (satisfaction?.payload?.label === 'rerun') {
    reworkRisk = Math.max(reworkRisk, 0.7);
    add('satisfaction_rerun', -24);
    reasons.push('satisfaction_rerun');
  }

  if (satisfaction?.payload?.label === 'escalated') {
    reworkRisk = Math.max(reworkRisk, 0.8);
    add('satisfaction_escalated', -32);
    reasons.push('satisfaction_escalated');
  }

  let trustScore = 50 + scoreContributions.reduce((sum, item) => sum + item.impact, 0);
  // Caps below assume coding-agent semantics (verification commands / file
  // changes are the primary success signal). For conversation / task agents
  // the user might never run a shell command — punishing them for that
  // collapses the distribution. Gate the coding caps on profile category.
  if (isCodingDomain && failedVerification.length > 0 && sessionEnded && Number(latestVerification?.payload?.exit_code) !== 0) {
    trustScore = Math.min(trustScore, 28);
  }
  if (isCodingDomain && fileChanges.length > 0 && passedVerification.length > 0 && Number(latestVerification?.payload?.exit_code) === 0 && !satisfaction) {
    trustScore = Math.min(trustScore, 88);
  }
  if (isCodingDomain && fileChanges.length > 0 && verificationCommands.length === 0) {
    // Cap raised from 48 → 70 so the tool-success-rate signals can lift a
    // well-executed but untested session above the previous tight band.
    // Sessions with verification still float higher; sessions with failed
    // verification still bottom out below.
    trustScore = Math.min(trustScore, 70);
  }
  if (isCodingDomain && fileChanges.length === 0 && verificationCommands.length === 0 && !satisfaction) {
    trustScore = Math.min(trustScore, 72);
  }
  if ([...failedCommandCounts.values()].some((count) => count >= 3)) {
    trustScore = Math.min(trustScore, 30);
  }
  if (satisfaction?.payload?.label === 'accepted') {
    trustScore = Math.max(trustScore, 82);
    trustScore = Math.min(trustScore, 96);
  }
  if (satisfaction?.payload?.label === 'abandoned') {
    trustScore = Math.min(trustScore, 18);
    trustScore = Math.max(trustScore, 7);
  }
  if (satisfaction?.payload?.label === 'corrected') {
    trustScore = Math.min(trustScore, 64);
  }
  if (satisfaction?.payload?.label === 'rerun') {
    trustScore = Math.min(trustScore, 38);
  }
  if (satisfaction?.payload?.label === 'escalated') {
    trustScore = Math.min(trustScore, 30);
  }
  outcomeConfidence = clamp(clampScore(trustScore) / 100);

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
    score_version: '0.4.0',
    agent_category: profile.category,
    reasons: Array.from(new Set(reasons)),
    score_contributions: scoreContributions.filter((item) => item.impact !== 0)
  };
}
