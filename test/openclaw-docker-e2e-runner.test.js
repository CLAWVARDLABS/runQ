import test from 'node:test';
import assert from 'node:assert/strict';

import {
  defaultExpectedText,
  defaultPrompt,
  expectedCommandCount,
  promptFromEnv
} from '../tools/openclaw-docker-e2e/run.js';

test('OpenClaw Docker E2E runner keeps deterministic defaults', () => {
  assert.match(defaultPrompt(), /Use the exec tool exactly once/);
  assert.match(defaultPrompt(), /runq-tool-e2e/);
  assert.equal(defaultExpectedText(), 'RunQ Docker OpenClaw e2e passed.');
  assert.equal(expectedCommandCount({}), 1);
});

test('OpenClaw Docker E2E runner accepts task-specific prompt overrides', () => {
  const env = {
    OPENCLAW_E2E_PROMPT: 'Inspect package metadata and reply with RUNQ_PACKAGE_OK.',
    OPENCLAW_E2E_EXPECTED_COMMANDS: '0'
  };

  assert.equal(promptFromEnv(env), 'Inspect package metadata and reply with RUNQ_PACKAGE_OK.');
  assert.equal(expectedCommandCount(env), 0);
});

test('OpenClaw Docker E2E runner can allow any command count for exploratory tasks', () => {
  assert.equal(expectedCommandCount({ OPENCLAW_E2E_EXPECTED_COMMANDS: 'any' }), null);
});
