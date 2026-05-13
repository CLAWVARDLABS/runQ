#!/usr/bin/env node
import { readFileSync } from 'node:fs';

import { RunqStore } from '../../src/store.js';
import { normalizeCodexHook } from './normalize.js';

function parseDbPath(args) {
  const dbIndex = args.indexOf('--db');
  if (dbIndex === -1 || !args[dbIndex + 1]) {
    return process.env.RUNQ_DB_PATH ?? '.runq/runq.db';
  }
  return args[dbIndex + 1];
}

function optionIndexes(argv) {
  const indexes = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--db') {
      indexes.add(index);
      indexes.add(index + 1);
    } else if (argv[index] === '--quiet') {
      indexes.add(index);
    }
  }
  return indexes;
}

function readStdinOrArg(argv) {
  const options = optionIndexes(argv);
  const positional = argv.filter((_, index) => !options.has(index));
  if (positional.length > 0) {
    return positional[0];
  }
  return readFileSync(0, 'utf8');
}

export function main(argv = process.argv.slice(2)) {
  const dbPath = parseDbPath(argv);
  const quiet = argv.includes('--quiet');
  const rawInput = readStdinOrArg(argv);
  const input = JSON.parse(rawInput);
  const events = normalizeCodexHook(input);

  const store = new RunqStore(dbPath);
  for (const event of events) {
    store.appendEvent(event);
  }
  store.close();

  if (!quiet) {
    console.log(`recorded ${events.length} RunQ events`);
  }
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
