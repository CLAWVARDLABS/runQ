import test from 'node:test';
import assert from 'node:assert/strict';

import { applyUniversalSignals } from '../src/scoring/universal.js';

function event(eventType, timestamp, payload = {}) {
  return { event_type: eventType, timestamp, payload };
}

function prompt(ts, hash = 'h1', summary = 'do the thing', length = 20) {
  return event('user.prompt.submitted', ts, { prompt_hash: hash, prompt_summary: summary, prompt_length: length });
}

test('applyUniversalSignals returns no contributions on an empty stream', () => {
  const result = applyUniversalSignals([]);
  assert.deepEqual(result, { contributions: [], reasons: [] });
});

test('prompt_repeated fires when the same prompt_hash appears 3+ times', () => {
  const events = [
    prompt('2026-05-10T10:00:00.000Z', 'hash_A'),
    prompt('2026-05-10T10:01:00.000Z', 'hash_A'),
    prompt('2026-05-10T10:02:00.000Z', 'hash_A'),
    prompt('2026-05-10T10:03:00.000Z', 'hash_B')
  ];
  const { contributions, reasons } = applyUniversalSignals(events);
  assert.ok(reasons.includes('prompt_repeated'));
  const c = contributions.find((x) => x.reason === 'prompt_repeated');
  assert.ok(c.impact < 0, 'prompt_repeated should be negative');
});

test('prompt_repeated does NOT fire when the same hash appears only twice', () => {
  const events = [
    prompt('2026-05-10T10:00:00.000Z', 'hash_A'),
    prompt('2026-05-10T10:01:00.000Z', 'hash_A')
  ];
  const { reasons } = applyUniversalSignals(events);
  assert.equal(reasons.includes('prompt_repeated'), false);
});

test('rapid_retry_pattern fires when 3+ prompts are <30s apart', () => {
  const events = [
    prompt('2026-05-10T10:00:00.000Z', 'h1'),
    prompt('2026-05-10T10:00:05.000Z', 'h2'),
    prompt('2026-05-10T10:00:12.000Z', 'h3'),
    prompt('2026-05-10T10:00:20.000Z', 'h4')
  ];
  const { reasons, contributions } = applyUniversalSignals(events);
  assert.ok(reasons.includes('rapid_retry_pattern'));
  const c = contributions.find((x) => x.reason === 'rapid_retry_pattern');
  assert.ok(c.impact < 0);
});

test('rapid_retry_pattern does NOT fire when prompts are well-spaced', () => {
  const events = [
    prompt('2026-05-10T10:00:00.000Z', 'h1'),
    prompt('2026-05-10T10:05:00.000Z', 'h2'),
    prompt('2026-05-10T10:10:00.000Z', 'h3'),
    prompt('2026-05-10T10:15:00.000Z', 'h4')
  ];
  const { reasons } = applyUniversalSignals(events);
  assert.equal(reasons.includes('rapid_retry_pattern'), false);
});

test('acknowledged_positive fires when the last prompt contains a thank-you token', () => {
  const events = [
    prompt('2026-05-10T10:00:00.000Z', 'h1', 'fix the bug'),
    prompt('2026-05-10T10:05:00.000Z', 'h2', 'Thanks, that worked perfectly!')
  ];
  const { reasons, contributions } = applyUniversalSignals(events);
  assert.ok(reasons.includes('acknowledged_positive'));
  const c = contributions.find((x) => x.reason === 'acknowledged_positive');
  assert.ok(c.impact > 0, 'positive ack is positive');
});

test('acknowledged_negative fires on rejection language', () => {
  const events = [
    prompt('2026-05-10T10:00:00.000Z', 'h1', 'fix the bug'),
    prompt('2026-05-10T10:05:00.000Z', 'h2', 'no, that is wrong, try again')
  ];
  const { reasons, contributions } = applyUniversalSignals(events);
  assert.ok(reasons.includes('acknowledged_negative'));
  const c = contributions.find((x) => x.reason === 'acknowledged_negative');
  assert.ok(c.impact < 0);
});

test('acknowledged_* matches Chinese ack tokens too', () => {
  const positive = applyUniversalSignals([
    prompt('2026-05-10T10:00:00.000Z', 'h1', '帮我加缓存'),
    prompt('2026-05-10T10:05:00.000Z', 'h2', '搞定了,谢谢')
  ]);
  assert.ok(positive.reasons.includes('acknowledged_positive'));
  const negative = applyUniversalSignals([
    prompt('2026-05-10T10:00:00.000Z', 'h1', '加缓存'),
    prompt('2026-05-10T10:05:00.000Z', 'h2', '不对,重做')
  ]);
  assert.ok(negative.reasons.includes('acknowledged_negative'));
});

test('session_abandoned fires when there is no session.ended in a substantial run', () => {
  const events = [
    event('session.started', '2026-05-10T10:00:00.000Z'),
    prompt('2026-05-10T10:00:10.000Z'),
    event('model.call.ended', '2026-05-10T10:00:20.000Z'),
    event('tool.call.ended', '2026-05-10T10:00:30.000Z'),
    event('tool.call.ended', '2026-05-10T10:00:40.000Z')
  ];
  const { reasons } = applyUniversalSignals(events);
  assert.ok(reasons.includes('session_abandoned'));
});

test('session_abandoned does NOT fire when session.ended is present', () => {
  const events = [
    event('session.started', '2026-05-10T10:00:00.000Z'),
    prompt('2026-05-10T10:00:10.000Z'),
    event('model.call.ended', '2026-05-10T10:00:20.000Z'),
    event('tool.call.ended', '2026-05-10T10:00:30.000Z'),
    event('tool.call.ended', '2026-05-10T10:00:40.000Z'),
    event('session.ended', '2026-05-10T10:01:00.000Z')
  ];
  const { reasons } = applyUniversalSignals(events);
  assert.equal(reasons.includes('session_abandoned'), false);
});

test('prompt_revision_growth fires when consecutive prompts get significantly longer', () => {
  const events = [
    prompt('2026-05-10T10:00:00.000Z', 'h1', 'fix bug', 10),
    prompt('2026-05-10T10:01:00.000Z', 'h2', 'fix the off-by-one bug', 30),
    prompt('2026-05-10T10:02:00.000Z', 'h3', 'fix the off-by-one bug in line 42 of parser.js', 80)
  ];
  const { reasons } = applyUniversalSignals(events);
  assert.ok(reasons.includes('prompt_revision_growth'));
});

test('prompt_revision_growth does NOT fire on steady or shrinking prompts', () => {
  const events = [
    prompt('2026-05-10T10:00:00.000Z', 'h1', 'fix bug here', 12),
    prompt('2026-05-10T10:01:00.000Z', 'h2', 'fix one more',  13),
    prompt('2026-05-10T10:02:00.000Z', 'h3', 'and another',   12)
  ];
  const { reasons } = applyUniversalSignals(events);
  assert.equal(reasons.includes('prompt_revision_growth'), false);
});

test('signals stack: a stuck session can trigger multiple universal reasons', () => {
  const events = [
    event('session.started', '2026-05-10T10:00:00.000Z'),
    prompt('2026-05-10T10:00:05.000Z', 'hash_A', 'do the thing', 20),
    prompt('2026-05-10T10:00:08.000Z', 'hash_A', 'do the thing please', 25),
    prompt('2026-05-10T10:00:12.000Z', 'hash_A', 'do the thing now', 22),
    prompt('2026-05-10T10:00:18.000Z', 'hash_A', 'no, this is wrong, do the thing', 35)
  ];
  const { reasons } = applyUniversalSignals(events);
  assert.ok(reasons.includes('prompt_repeated'));
  assert.ok(reasons.includes('rapid_retry_pattern'));
  assert.ok(reasons.includes('acknowledged_negative'));
  assert.ok(reasons.includes('session_abandoned'));
});

test('redacted prompt_hash is ignored when counting repeats', () => {
  const events = [
    prompt('2026-05-10T10:00:00.000Z', '[redacted]'),
    prompt('2026-05-10T10:01:00.000Z', '[redacted]'),
    prompt('2026-05-10T10:02:00.000Z', '[redacted]')
  ];
  const { reasons } = applyUniversalSignals(events);
  assert.equal(reasons.includes('prompt_repeated'), false);
});
