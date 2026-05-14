#!/usr/bin/env node
import { readFileSync } from 'node:fs';

import { RunqStore } from '../../src/store.js';
import { getPrivacyMode } from '../../src/config.js';
import { normalizeHermesEvent } from './normalize.js';

function parseArgs(argv) {
  const args = {
    db: process.env.RUNQ_DB_PATH ?? process.env.RUNQ_DB ?? '.runq/runq.db'
  };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--db') {
      args.db = argv[index + 1];
      index += 1;
    }
  }
  return args;
}

function readInput(argv) {
  const positionalArgs = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--db') {
      index += 1;
      continue;
    }
    if (!argv[index].startsWith('--')) {
      positionalArgs.push(argv[index]);
    }
  }
  const positional = positionalArgs[0];
  if (positional) {
    return positional;
  }
  return readFileSync(0, 'utf8');
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const raw = readInput(argv).trim();
  if (!raw) {
    console.error('Hermes hook payload is required on stdin');
    return 1;
  }

  const payload = JSON.parse(raw);
  const privacyMode = getPrivacyMode(args.db);
  const events = normalizeHermesEvent(payload, { privacyMode });
  const store = new RunqStore(args.db);
  for (const event of events) {
    store.appendEvent(event);
  }
  store.close();

  console.log(`recorded ${events.length} RunQ events`);
  return 0;
}

const isEntrypoint = process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href;
if (isEntrypoint) {
  process.exitCode = main();
}
