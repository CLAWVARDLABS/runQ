import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAgentProfile,
  listAgentProfiles,
  profileFromEvents,
  isCodingProfile
} from '../src/agent-profiles.js';

test('getAgentProfile returns the canonical profile for known frameworks', () => {
  assert.equal(getAgentProfile('claude_code').category, 'coding');
  assert.equal(getAgentProfile('codex').category, 'coding');
  assert.equal(getAgentProfile('openclaw').category, 'task');
  assert.equal(getAgentProfile('hermes').category, 'conversation');
});

test('getAgentProfile falls back to a custom-task profile for unknown ids', () => {
  const profile = getAgentProfile('made_up_agent');
  assert.equal(profile.id, 'custom');
  assert.equal(profile.category, 'task');
});

test('getAgentProfile is null-safe', () => {
  const profile = getAgentProfile(null);
  assert.equal(profile.id, 'custom');
});

test('listAgentProfiles enumerates all four CLI agents we support today', () => {
  const ids = listAgentProfiles().map((p) => p.id).sort();
  assert.deepEqual(ids, ['claude_code', 'codex', 'hermes', 'openclaw']);
});

test('profileFromEvents picks the dominant framework in a mixed stream', () => {
  const events = [
    { framework: 'claude_code' },
    { framework: 'claude_code' },
    { framework: 'codex' }
  ];
  assert.equal(profileFromEvents(events).id, 'claude_code');
});

test('profileFromEvents handles empty / framework-less streams', () => {
  assert.equal(profileFromEvents([]).id, 'custom');
  assert.equal(profileFromEvents([{ event_type: 'foo' }]).id, 'custom');
});

test('isCodingProfile accepts both profile objects and event arrays', () => {
  assert.equal(isCodingProfile(getAgentProfile('claude_code')), true);
  assert.equal(isCodingProfile(getAgentProfile('hermes')), false);
  assert.equal(isCodingProfile([{ framework: 'codex' }]), true);
  assert.equal(isCodingProfile([{ framework: 'hermes' }]), false);
});
