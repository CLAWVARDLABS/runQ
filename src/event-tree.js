// Build parent_id links between events based on agent-runtime semantics.
//
// The RunQ schema has a `parent_id` field per event but most importers and
// adapters historically left it null. The trace UI then could only render a
// linear chain. Filling parent_id lets us draw a proper tree:
//
//   session.started
//     ├─ user.prompt.submitted (#1)
//     │    └─ model.call.started
//     │         ├─ model.call.ended
//     │         └─ tool.call.started
//     │              ├─ command.started / file.changed
//     │              └─ tool.call.ended
//     ├─ user.prompt.submitted (#2)
//     │    └─ …
//     ├─ session.ended
//     └─ outcome.scored
//
// The mapping is generic across Claude Code / Codex / OpenClaw / Hermes
// because they all emit the same RunQ event types in the same rough order.

function eventTimeOrder(events) {
  return [...events].map((event, index) => ({ event, index })).sort((a, b) => {
    const tsCompare = String(a.event.timestamp ?? '').localeCompare(String(b.event.timestamp ?? ''));
    if (tsCompare !== 0) return tsCompare;
    return a.index - b.index;
  }).map((entry) => entry.event);
}

export function linkAgentEventParents(events) {
  if (!Array.isArray(events) || events.length === 0) return events;
  const ordered = eventTimeOrder(events);

  let currentSession = null;
  let currentPrompt = null;
  let currentModelCall = null;
  const toolStartByCallId = new Map();
  // Also index tool starts by command_id so command.* and file.changed events
  // emitted alongside a Bash/Edit tool call attach to the right parent.
  const toolStartByCommandId = new Map();

  for (const event of ordered) {
    const type = event.event_type;
    const payload = event.payload || {};
    // Only fill parent_id when it isn't already set — respect upstream wiring.
    const setParent = (parent) => {
      if (event.parent_id) return;
      if (parent && parent.event_id && parent.event_id !== event.event_id) {
        event.parent_id = parent.event_id;
      }
    };

    if (type === 'session.started') {
      currentSession = event;
      currentPrompt = null;
      currentModelCall = null;
      continue;
    }
    if (type === 'user.prompt.submitted') {
      setParent(currentSession);
      currentPrompt = event;
      currentModelCall = null;
      continue;
    }
    if (type === 'model.call.started') {
      setParent(currentPrompt ?? currentSession);
      currentModelCall = event;
      continue;
    }
    if (type === 'model.call.ended') {
      setParent(currentModelCall ?? currentPrompt ?? currentSession);
      continue;
    }
    if (type === 'tool.call.started') {
      setParent(currentModelCall ?? currentPrompt ?? currentSession);
      if (payload.tool_call_id) toolStartByCallId.set(payload.tool_call_id, event);
      continue;
    }
    if (type === 'tool.call.ended') {
      const start = payload.tool_call_id ? toolStartByCallId.get(payload.tool_call_id) : null;
      setParent(start ?? currentModelCall ?? currentSession);
      continue;
    }
    if (type === 'command.started' || type === 'command.ended') {
      const callId = payload.command_id ?? payload.tool_call_id;
      const start = callId
        ? toolStartByCallId.get(callId) ?? toolStartByCommandId.get(callId)
        : null;
      setParent(start ?? currentModelCall ?? currentSession);
      if (type === 'command.started' && payload.command_id) {
        toolStartByCommandId.set(payload.command_id, event);
      }
      continue;
    }
    if (type === 'file.changed') {
      const callId = payload.tool_call_id ?? payload.command_id;
      const start = callId
        ? toolStartByCallId.get(callId) ?? toolStartByCommandId.get(callId)
        : null;
      setParent(start ?? currentModelCall ?? currentSession);
      continue;
    }
    if (type === 'session.ended') {
      setParent(currentSession);
      continue;
    }
    if (type === 'outcome.scored') {
      setParent(currentSession);
      continue;
    }
    if (type === 'satisfaction.recorded') {
      setParent(currentSession);
      continue;
    }
    // Everything else (recommendation.*, etc.) hangs off the session by default.
    setParent(currentSession);
  }
  return events;
}
