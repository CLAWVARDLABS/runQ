#!/usr/bin/env node
import { readFileSync } from 'node:fs';

import { normalizeOpenClawEvent } from './normalize.js';
import { RunqStore } from '../../src/store.js';

function parseArgs(argv) {
  const args = {
    db: process.env.RUNQ_DB
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--db') {
      args.db = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

function readStdin() {
  return readFileSync(0, 'utf8');
}

const args = parseArgs(process.argv.slice(2));

if (!args.db) {
  console.error('Usage: node adapters/openclaw/hook.js --db <runq.db>');
  process.exit(2);
}

const raw = readStdin().trim();
if (!raw) {
  console.error('OpenClaw hook payload is required on stdin');
  process.exit(2);
}

const input = JSON.parse(raw);
const events = normalizeOpenClawEvent(input);
const store = new RunqStore(args.db);

try {
  for (const event of events) {
    store.appendEvent(event);
  }
} finally {
  store.close();
}

console.log(`recorded ${events.length} RunQ events`);
