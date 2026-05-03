#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { createOpenClawHarnessEvents } from '../../examples/openclaw-harness/run.js';

function parseArgs(argv) {
  const args = {
    scenario: 'verified-success',
    agentId: 'agent-1',
    now: new Date().toISOString()
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--scenario') {
      args.scenario = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--agent-id') {
      args.agentId = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--out') {
      args.outPath = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--now') {
      args.now = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

export function writeAgentArtifact({ scenario, agentId, outPath, now }) {
  if (!outPath) {
    throw new Error('outPath is required');
  }

  const events = createOpenClawHarnessEvents({
    scenario,
    agentId,
    now
  });

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(events, null, 2));

  return {
    agentId,
    scenario,
    outPath,
    event_count: events.length,
    session_id: events[0]?.session_id
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = writeAgentArtifact({
      scenario: args.scenario,
      agentId: args.agentId,
      outPath: args.outPath,
      now: args.now
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
