export function percent(value) {
  return Math.round(Number(value || 0) * 100);
}

export function trustScoreValue(quality) {
  if (quality?.trust_score !== undefined && quality?.trust_score !== null) {
    return Math.max(0, Math.min(100, Math.round(Number(quality.trust_score || 0))));
  }
  return percent(quality?.outcome_confidence);
}

export function trustBreakdownEntries(quality) {
  const breakdown = quality?.trust_breakdown || {};
  const keys = [
    'evidence_strength',
    'verification_strength',
    'execution_quality',
    'autonomy_reliability',
    'cost_discipline',
    'risk_exposure'
  ];
  return keys
    .filter((key) => breakdown[key])
    .map((key) => ({
      key,
      label: breakdown[key].label || key,
      score: Math.max(0, Math.min(100, Math.round(Number(breakdown[key].score || 0)))),
      reasons: breakdown[key].reasons || []
    }));
}

export function confidenceTone(value) {
  const score = Number(value || 0);
  if (score >= 0.8) return 'good';
  if (score >= 0.5) return 'warn';
  return 'bad';
}

export function satisfactionTone(label) {
  if (label === 'accepted') return 'good';
  if (label === 'corrected' || label === 'rerun') return 'warn';
  if (label === 'abandoned') return 'bad';
  return 'neutral';
}

export function verdictFor(session) {
  const quality = session?.quality || {};
  const score = trustScoreValue(quality) / 100;
  const hasSatisfaction = Boolean(session?.satisfaction?.label);
  if (score >= 0.8) return 'Likely completed';
  if (score >= 0.5) return 'Needs review';
  if (!hasSatisfaction && (quality.verification_coverage || 0) === 0) return 'Insufficient evidence';
  return 'Likely failed';
}

export function eventKind(event) {
  if (event.event_type?.startsWith('model.')) return 'model';
  if (event.event_type?.startsWith('tool.call.')) return 'command';
  if (event.event_type === 'file.changed' || event.event_type === 'git.diff.summarized') return 'file';
  if (event.event_type?.startsWith('command.')) {
    if (event.payload?.is_verification && Number(event.payload?.exit_code) === 0) return 'success';
    if (event.payload?.exit_code !== undefined && Number(event.payload?.exit_code) !== 0) return 'failure';
    return 'command';
  }
  if (event.event_type === 'satisfaction.recorded') return 'satisfaction';
  if (event.event_type === 'error.raised') return 'failure';
  return 'default';
}

export function summarizeEvent(event) {
  const payload = event.payload || {};
  switch (event.event_type) {
    case 'user.prompt.submitted': {
      // Accept either prompt_length (canonical) or prompt_chars (older imports).
      const len = payload.prompt_length ?? payload.prompt_chars ?? 0;
      return `${payload.prompt_summary || 'Prompt captured'} · ${len} chars`;
    }
    case 'model.call.started':
      return [payload.provider, payload.model, payload.prompt_length ? `${payload.prompt_length} prompt chars` : null].filter(Boolean).join(' · ') || 'Model call started';
    case 'model.call.ended':
      return [payload.total_tokens ? `${payload.total_tokens} tokens` : null, payload.assistant_summary || 'Model call completed'].filter(Boolean).join(' · ');
    case 'file.changed':
      return `${payload.change_kind || 'changed'} file · .${payload.file_extension || 'unknown'}`;
    case 'command.started':
      return `${payload.binary || 'command'}${payload.is_verification ? ' · verification' : ''}`;
    case 'command.ended':
      return `${payload.binary || 'command'} exited ${payload.exit_code ?? 'unknown'}${payload.is_verification ? ' · verification' : ''}`;
    case 'tool.call.started':
      return `${payload.tool_name || 'tool'} started`;
    case 'tool.call.ended':
      return `${payload.tool_name || 'tool'} ${payload.status || 'completed'}`;
    case 'permission.resolved':
      return `${payload.decision || 'resolved'} · waited ${payload.wait_ms || 0}ms`;
    case 'satisfaction.recorded':
      return `${payload.label || 'unknown'}${payload.signal ? ` · ${payload.signal}` : ''}`;
    case 'session.started':
      return 'Session started';
    case 'session.ended':
      return `Session ended · ${payload.ended_reason || 'unknown'}`;
    default:
      return 'Metadata event captured';
  }
}

export function toneClass(tone) {
  const tones = {
    good: 'border-runq-nomad/50 text-runq-nomad',
    warn: 'border-runq-vault/50 text-runq-vault',
    bad: 'border-runq-consul/60 text-runq-consul',
    info: 'border-runq-waypoint/50 text-runq-waypoint',
    neutral: 'border-white/15 text-runq-muted'
  };
  return tones[tone] || tones.neutral;
}

export function eventAccentClass(kind) {
  const accents = {
    model: 'before:bg-runq-waypoint',
    file: 'before:bg-runq-terraform',
    command: 'before:bg-runq-vagrant',
    success: 'before:bg-runq-nomad',
    failure: 'before:bg-runq-consul',
    satisfaction: 'before:bg-runq-terraform',
    default: 'before:bg-runq-vagrant'
  };
  return accents[kind] || accents.default;
}
