import { summarizeEvent } from './format.js';

function actionStatus(event) {
  if (event.event_type.endsWith('.started')) return 'running';
  if (event.event_type === 'command.ended' && Number(event.payload?.exit_code) !== 0) return 'failed';
  if (event.event_type === 'tool.call.ended' && event.payload?.status === 'error') return 'failed';
  if (event.event_type === 'error.raised') return 'failed';
  if (event.event_type.endsWith('.ended') || event.event_type === 'satisfaction.recorded') return 'completed';
  return 'observed';
}

function toolSubkind(event) {
  const payload = event.payload || {};
  const toolType = String(payload.tool_type || '').toLowerCase();
  const toolName = String(payload.tool_name || '').toLowerCase();
  if (payload.mcp_server || event.source === 'mcp' || toolType.includes('mcp') || toolName.startsWith('mcp__')) return 'mcp';
  if (payload.skill_name || toolType.includes('skill') || toolName.startsWith('skill.')) return 'skill';
  return 'tool';
}

function actionKind(event) {
  if (event.event_type === 'user.prompt.submitted') return 'requirement';
  if (event.event_type.startsWith('model.')) return 'model';
  if (event.event_type.startsWith('tool.call.')) return toolSubkind(event);
  if (event.event_type.startsWith('command.')) return event.payload?.is_verification ? 'verification' : 'command';
  if (event.event_type === 'file.changed' || event.event_type === 'git.diff.summarized') return 'file';
  if (event.event_type === 'satisfaction.recorded') return 'outcome';
  if (event.event_type.startsWith('agent.step.')) return 'step';
  if (event.event_type.startsWith('permission.')) return 'permission';
  return 'event';
}

function actionPhase(event) {
  if (event.event_type.endsWith('.started')) return 'started';
  if (event.event_type.endsWith('.ended')) return 'ended';
  if (event.event_type.endsWith('.submitted')) return 'submitted';
  if (event.event_type.endsWith('.recorded')) return 'recorded';
  if (event.event_type.endsWith('.resolved')) return 'resolved';
  if (event.event_type.endsWith('.requested')) return 'requested';
  return 'observed';
}

function verificationNoun(payload) {
  return payload.verification_kind === 'test' ? 'Test' : 'Check';
}

function actionLabel(event) {
  const payload = event.payload || {};
  if (event.event_type === 'user.prompt.submitted') return 'requirement';
  if (event.event_type.startsWith('model.')) return 'model';
  if (event.event_type.startsWith('tool.call.')) return toolSubkind(event);
  if (event.event_type.startsWith('command.')) {
    return payload.is_verification ? verificationNoun(payload).toLowerCase() : 'command';
  }
  if (event.event_type === 'file.changed' || event.event_type === 'git.diff.summarized') return 'file';
  if (event.event_type === 'satisfaction.recorded') return 'outcome';
  if (event.event_type.startsWith('agent.step.')) return 'step';
  if (event.event_type.startsWith('permission.')) return 'permission';
  return 'event';
}

function actionTitle(event) {
  const payload = event.payload || {};
  if (event.event_type === 'user.prompt.submitted') return 'User requirement';
  if (event.event_type.startsWith('model.')) return payload.model ? `Model: ${payload.model}` : 'Model call';
  if (event.event_type.startsWith('tool.call.')) return payload.tool_name || 'unknown_tool';
  if (event.event_type.startsWith('command.')) {
    const binary = payload.binary || 'command';
    if (!payload.is_verification) {
      return payload.binary ? `Command: ${payload.binary}` : 'Command';
    }
    const noun = verificationNoun(payload);
    if (event.event_type.endsWith('.started')) return `${noun} started: ${binary}`;
    if (Number(payload.exit_code) === 0) return `${noun} passed: ${binary}`;
    if (payload.exit_code !== undefined) return `${noun} failed: ${binary}`;
    return `${noun}: ${binary}`;
  }
  if (event.event_type === 'file.changed') return `File ${payload.change_kind || 'changed'}`;
  if (event.event_type === 'git.diff.summarized') return 'Git diff summarized';
  if (event.event_type === 'satisfaction.recorded') return `Outcome: ${payload.label || 'recorded'}`;
  if (event.event_type.startsWith('agent.step.')) return payload.step_name || 'Agent step';
  if (event.event_type.startsWith('permission.')) return 'Permission';
  return event.event_type;
}

function actionDetail(event) {
  const payload = event.payload || {};
  if (event.event_type.startsWith('tool.call.')) {
    return [
      payload.mcp_server ? `mcp ${payload.mcp_server}` : null,
      payload.skill_name ? `skill ${payload.skill_name}` : null,
      payload.tool_type,
      payload.status,
      payload.duration_ms ? `${payload.duration_ms}ms` : null,
      payload.input_key_count !== undefined ? `input ${payload.input_key_count} keys` : null,
      payload.output_key_count !== undefined ? `output ${payload.output_key_count} keys` : null
    ].filter(Boolean).join(' · ') || summarizeEvent(event);
  }
  if (event.event_type.startsWith('command.')) {
    return [
      payload.is_verification ? `${verificationNoun(payload).toLowerCase()} command` : null,
      payload.exit_code !== undefined ? `exit ${payload.exit_code}` : null,
      payload.duration_ms ? `${payload.duration_ms}ms` : null
    ].filter(Boolean).join(' · ') || summarizeEvent(event);
  }
  return summarizeEvent(event);
}

export function buildAgentActionFlow(events = []) {
  return events
    .filter((event) => !['session.started', 'session.ended', 'outcome.scored'].includes(event.event_type))
    .map((event, index) => {
      const payload = event.payload || {};
      const title = actionTitle(event);
      return {
        id: event.event_id,
        index: index + 1,
        kind: actionKind(event),
        phase: actionPhase(event),
        status: actionStatus(event),
        action_name: event.event_type.startsWith('tool.call.') ? title : payload.binary || payload.model || title,
        action_type: payload.tool_type || payload.command_kind || event.event_type,
        duration_ms: payload.duration_ms,
        label: actionLabel(event),
        title,
        detail: actionDetail(event),
        timestamp: event.timestamp,
        event_type: event.event_type,
        event_id: event.event_id,
        tool_name: payload.tool_name,
        mcp_server: payload.mcp_server,
        skill_name: payload.skill_name,
        parent_id: event.parent_id
      };
    });
}
