import test from 'node:test';
import assert from 'node:assert/strict';

import { linkAgentEventParents } from '../src/event-tree.js';

function event(eventId, eventType, timestamp, payload = {}) {
  return {
    event_id: eventId,
    event_type: eventType,
    timestamp,
    session_id: 'ses_tree',
    payload
  };
}

test('linkAgentEventParents builds a session → prompt → model → tool tree', () => {
  const events = [
    event('s', 'session.started', '2026-05-10T10:00:00.000Z'),
    event('p1', 'user.prompt.submitted', '2026-05-10T10:00:01.000Z'),
    event('m1s', 'model.call.started', '2026-05-10T10:00:02.000Z'),
    event('t1s', 'tool.call.started', '2026-05-10T10:00:03.000Z', { tool_call_id: 'call_1', tool_name: 'Bash' }),
    event('t1e', 'tool.call.ended', '2026-05-10T10:00:04.000Z', { tool_call_id: 'call_1', tool_name: 'Bash' }),
    event('m1e', 'model.call.ended', '2026-05-10T10:00:05.000Z'),
    event('se', 'session.ended', '2026-05-10T10:00:06.000Z')
  ];
  linkAgentEventParents(events);
  const byId = Object.fromEntries(events.map((e) => [e.event_id, e]));
  assert.equal(byId.s.parent_id, undefined);
  assert.equal(byId.p1.parent_id, 's');
  assert.equal(byId.m1s.parent_id, 'p1');
  assert.equal(byId.t1s.parent_id, 'm1s');
  assert.equal(byId.t1e.parent_id, 't1s', 'tool.call.ended should pair with its started');
  assert.equal(byId.m1e.parent_id, 'm1s');
  assert.equal(byId.se.parent_id, 's');
});

test('linkAgentEventParents handles multiple sibling tool calls under one model.call', () => {
  const events = [
    event('s', 'session.started', '2026-05-10T10:00:00.000Z'),
    event('p1', 'user.prompt.submitted', '2026-05-10T10:00:01.000Z'),
    event('m', 'model.call.started', '2026-05-10T10:00:02.000Z'),
    event('a', 'tool.call.started', '2026-05-10T10:00:03.000Z', { tool_call_id: 'a' }),
    event('b', 'tool.call.started', '2026-05-10T10:00:04.000Z', { tool_call_id: 'b' }),
    event('c', 'tool.call.started', '2026-05-10T10:00:05.000Z', { tool_call_id: 'c' })
  ];
  linkAgentEventParents(events);
  for (const id of ['a', 'b', 'c']) {
    const ev = events.find((e) => e.event_id === id);
    assert.equal(ev.parent_id, 'm', `sibling tool ${id} should attach to its model.call.started`);
  }
});

test('linkAgentEventParents links command.* to the originating Bash tool call', () => {
  const events = [
    event('s', 'session.started', '2026-05-10T10:00:00.000Z'),
    event('p', 'user.prompt.submitted', '2026-05-10T10:00:01.000Z'),
    event('m', 'model.call.started', '2026-05-10T10:00:02.000Z'),
    event('t', 'tool.call.started', '2026-05-10T10:00:03.000Z', { tool_call_id: 'tool_x', tool_name: 'Bash' }),
    event('cs', 'command.started', '2026-05-10T10:00:04.000Z', { command_id: 'tool_x' }),
    event('ce', 'command.ended', '2026-05-10T10:00:05.000Z', { command_id: 'tool_x' })
  ];
  linkAgentEventParents(events);
  const byId = Object.fromEntries(events.map((e) => [e.event_id, e]));
  assert.equal(byId.cs.parent_id, 't', 'command.started should attach to the Bash tool.call.started');
  assert.equal(byId.ce.parent_id, 't', 'command.ended should attach to the same Bash tool.call.started');
});

test('linkAgentEventParents respects existing parent_id values (idempotent)', () => {
  const events = [
    event('s', 'session.started', '2026-05-10T10:00:00.000Z'),
    { ...event('p', 'user.prompt.submitted', '2026-05-10T10:00:01.000Z'), parent_id: 'predefined' }
  ];
  linkAgentEventParents(events);
  assert.equal(events[1].parent_id, 'predefined', 'pre-set parent_id should not be overwritten');
});

test('linkAgentEventParents splits sub-tasks at each user.prompt.submitted', () => {
  const events = [
    event('s', 'session.started', '2026-05-10T10:00:00.000Z'),
    event('p1', 'user.prompt.submitted', '2026-05-10T10:00:01.000Z'),
    event('m1', 'model.call.started', '2026-05-10T10:00:02.000Z'),
    event('p2', 'user.prompt.submitted', '2026-05-10T10:00:10.000Z'),
    event('m2', 'model.call.started', '2026-05-10T10:00:11.000Z')
  ];
  linkAgentEventParents(events);
  const byId = Object.fromEntries(events.map((e) => [e.event_id, e]));
  assert.equal(byId.p1.parent_id, 's');
  assert.equal(byId.p2.parent_id, 's');
  assert.equal(byId.m1.parent_id, 'p1');
  assert.equal(byId.m2.parent_id, 'p2', 'second model.call should hang off the second prompt, not the first');
});
