#!/usr/bin/env node
import { readFileSync } from 'node:fs';

import { RunqStore } from '../../src/store.js';
import { getPrivacyMode } from '../../src/config.js';
import { normalizeClaudeCodeHook } from './normalize.js';

function parseDbPath(args) {
  const dbIndex = args.indexOf('--db');
  if (dbIndex === -1 || !args[dbIndex + 1]) {
    return process.env.RUNQ_DB_PATH ?? '.runq/runq.db';
  }
  return args[dbIndex + 1];
}

function readStdin() {
  return readFileSync(0, 'utf8');
}

export function main(argv = process.argv.slice(2)) {
  const dbPath = parseDbPath(argv);
  const rawInput = readStdin();
  const input = JSON.parse(rawInput);
  const privacyMode = getPrivacyMode(dbPath);
  const events = normalizeClaudeCodeHook(input, { privacyMode });

  const store = new RunqStore(dbPath);
  for (const event of events) {
    store.appendEvent(event);
  }
  store.close();

  console.log(`recorded ${events.length} RunQ events`);
  return 0;
}

const isEntrypoint = process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href;
if (isEntrypoint) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
