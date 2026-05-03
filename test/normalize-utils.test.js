import test from 'node:test';
import assert from 'node:assert/strict';

import { isVerificationCommand } from '../src/normalize-utils.js';

test('isVerificationCommand detects real test and build commands', () => {
  assert.equal(isVerificationCommand('npm test'), true);
  assert.equal(isVerificationCommand('pnpm test -- --runInBand'), true);
  assert.equal(isVerificationCommand('node --test'), true);
  assert.equal(isVerificationCommand('cargo test'), true);
  assert.equal(isVerificationCommand('npm run build'), true);
});

test('isVerificationCommand does not treat search commands for test files as verification', () => {
  assert.equal(isVerificationCommand('find /Users/example -name "*test*"'), false);
  assert.equal(isVerificationCommand('grep -R "test(" src'), false);
});
