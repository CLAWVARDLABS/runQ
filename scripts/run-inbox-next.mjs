#!/usr/bin/env node
import { spawn } from 'node:child_process';

function parseArgs(argv) {
  const args = {
    dbPath: process.env.RUNQ_DB || '.runq/runq.db',
    port: '4545'
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--db') {
      args.dbPath = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--port') {
      args.port = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

const args = parseArgs(process.argv.slice(2));
const child = spawn(process.execPath, [
  'node_modules/next/dist/bin/next',
  'dev',
  '--port',
  String(args.port)
], {
  env: {
    ...process.env,
    RUNQ_DB: args.dbPath
  },
  stdio: 'inherit'
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
