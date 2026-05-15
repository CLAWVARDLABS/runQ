// Compute a side-by-side diff summary between two sessions.
//
// Used by /compare?a=<id>&b=<id> to give the user a CI-build-diff-style view:
// "you ran A and B with similar inputs; here's where they diverged".

function actionsFromEvents(events) {
  // Keep only the "meaningful" events for diffing — drop session lifecycle
  // markers + scoring outputs that don't reflect agent behavior.
  const noise = new Set(['session.started', 'session.ended', 'outcome.scored']);
  return events
    .filter((event) => !noise.has(event.event_type))
    .sort((a, b) => String(a.timestamp ?? '').localeCompare(String(b.timestamp ?? '')))
    .map((event) => ({
      event_id: event.event_id,
      event_type: event.event_type,
      timestamp: event.timestamp,
      // The "signature" is what we compare for equality between the two sides
      // — same event type + tool + status counts as the "same step", even if
      // the timestamps differ. This lets us collapse a common prefix.
      signature: signatureFor(event),
      payload: event.payload || {}
    }));
}

function signatureFor(event) {
  const p = event.payload || {};
  switch (event.event_type) {
    case 'user.prompt.submitted':
      return `prompt:${p.prompt_hash || p.prompt_summary?.slice(0, 40) || ''}`;
    case 'model.call.started':
    case 'model.call.ended':
      return `${event.event_type}:${p.model || ''}`;
    case 'tool.call.started':
    case 'tool.call.ended':
      return `${event.event_type}:${p.tool_name || ''}`;
    case 'command.started':
    case 'command.ended':
      return `${event.event_type}:${p.binary || ''}:${p.is_verification ? 'verify' : 'cmd'}`;
    case 'file.changed':
      return `file.changed:${p.file_extension || ''}:${p.change_kind || ''}`;
    default:
      return event.event_type;
  }
}

function quickStats(actions) {
  const tools = new Map();
  let commands = 0;
  let verifications = 0;
  let verificationFailed = 0;
  let fileChanges = 0;
  let toolErrors = 0;
  for (const action of actions) {
    const t = action.event_type;
    const p = action.payload;
    if (t === 'tool.call.started') {
      const name = p.tool_name || 'unknown';
      tools.set(name, (tools.get(name) || 0) + 1);
    }
    if (t === 'tool.call.ended' && (p.status === 'failed' || p.status === 'error')) toolErrors += 1;
    if (t === 'command.ended') {
      commands += 1;
      if (p.is_verification) {
        verifications += 1;
        if (Number(p.exit_code) !== 0) verificationFailed += 1;
      }
    }
    if (t === 'file.changed') fileChanges += 1;
  }
  return {
    event_count: actions.length,
    distinct_tools: tools.size,
    top_tool: [...tools.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    commands,
    verifications,
    verification_failed: verificationFailed,
    file_changes: fileChanges,
    tool_errors: toolErrors
  };
}

// Find the longest common prefix where both sides share the same signature.
function commonPrefixLength(left, right) {
  const n = Math.min(left.length, right.length);
  for (let i = 0; i < n; i += 1) {
    if (left[i].signature !== right[i].signature) return i;
  }
  return n;
}

export function compareRuns(leftEvents, rightEvents, { leftSession = null, rightSession = null } = {}) {
  const left = actionsFromEvents(leftEvents);
  const right = actionsFromEvents(rightEvents);
  const prefix = commonPrefixLength(left, right);
  const leftDivergent = left.slice(prefix);
  const rightDivergent = right.slice(prefix);

  return {
    left: {
      session_id: leftSession?.session_id ?? null,
      trust_score: leftSession?.quality?.trust_score ?? null,
      stats: quickStats(left),
      actions: left,
      divergent_from: prefix
    },
    right: {
      session_id: rightSession?.session_id ?? null,
      trust_score: rightSession?.quality?.trust_score ?? null,
      stats: quickStats(right),
      actions: right,
      divergent_from: prefix
    },
    common_prefix_length: prefix,
    diverged: leftDivergent.length > 0 || rightDivergent.length > 0
  };
}
