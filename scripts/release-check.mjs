#!/usr/bin/env node
import { runV02ReleaseCheck } from '../src/release-check.js';

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--db') {
      args.dbPath = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--work-dir') {
      args.workDir = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--now') {
      args.now = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

const report = runV02ReleaseCheck(parseArgs(process.argv.slice(2)));
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.ok ? 0 : 1;
