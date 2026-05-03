#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { RunqStore } from '../../src/store.js';

const defaultAgents = [
  { agentId: 'agent-success', scenario: 'verified-success' },
  { agentId: 'agent-failure', scenario: 'repeated-test-failure' }
];

function parseAgent(value) {
  const [agentId, scenario] = String(value).split(':');
  if (!agentId || !scenario) {
    throw new Error(`Invalid agent spec "${value}". Use agent-id:scenario.`);
  }
  return { agentId, scenario };
}

function parseArgs(argv) {
  const args = {
    mode: 'local',
    dbPath: '.runq/agent-manager.db',
    outDir: '.runq/agent-manager',
    now: new Date().toISOString(),
    agents: defaultAgents
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--mode') {
      args.mode = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--db') {
      args.dbPath = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--out') {
      args.outDir = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--now') {
      args.now = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--agents') {
      args.agents = argv[index + 1].split(',').map(parseAgent);
      index += 1;
    }
  }

  return args;
}

function runProcess(command, args, options = {}) {
  return new Promise((resolveProcess, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: options.stdio ?? ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolveProcess({ stdout, stderr });
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited ${code}\n${stderr}`));
    });
  });
}

function artifactPath(outDir, agent) {
  return join(outDir, `${agent.agentId}-${agent.scenario}.json`);
}

async function runLocalAgent(agent, { outDir, now }) {
  const outPath = artifactPath(outDir, agent);
  const runnerPath = new URL('./agent-runner.js', import.meta.url).pathname;
  await runProcess(process.execPath, [
    runnerPath,
    '--scenario',
    agent.scenario,
    '--agent-id',
    agent.agentId,
    '--out',
    outPath,
    '--now',
    now
  ]);
  return {
    ...agent,
    outPath
  };
}

async function runDockerAgent(agent, { outDir, now, image }) {
  const hostOutDir = resolve(outDir);
  const outPath = `/out/${agent.agentId}-${agent.scenario}.json`;
  await runProcess('docker', [
    'run',
    '--rm',
    '-v',
    `${hostOutDir}:/out`,
    image,
    '--scenario',
    agent.scenario,
    '--agent-id',
    agent.agentId,
    '--out',
    outPath,
    '--now',
    now
  ]);
  return {
    ...agent,
    outPath: artifactPath(outDir, agent)
  };
}

async function buildDockerImage(image) {
  await runProcess('docker', [
    'build',
    '-f',
    'tools/agent-manager/Dockerfile',
    '-t',
    image,
    '.'
  ], {
    stdio: 'inherit'
  });
}

export function ingestAgentArtifacts({ dbPath, artifacts }) {
  const store = new RunqStore(dbPath);
  let ingestedEvents = 0;

  try {
    for (const artifact of artifacts) {
      const events = JSON.parse(readFileSync(artifact.outPath, 'utf8'));
      for (const event of events) {
        store.appendEvent(event);
        ingestedEvents += 1;
      }
    }
  } finally {
    store.close();
  }

  return ingestedEvents;
}

export async function runAgentManager({
  mode = 'local',
  dbPath = '.runq/agent-manager.db',
  outDir = '.runq/agent-manager',
  agents = defaultAgents,
  now = new Date().toISOString(),
  image = 'runq-agent-manager:local',
  buildImage = true
} = {}) {
  mkdirSync(outDir, { recursive: true });

  if (mode === 'docker' && buildImage) {
    await buildDockerImage(image);
  }

  const artifacts = await Promise.all(agents.map((agent) => {
    if (mode === 'local') {
      return runLocalAgent(agent, { outDir, now });
    }
    if (mode === 'docker') {
      return runDockerAgent(agent, { outDir, now, image });
    }
    throw new Error(`Unknown agent manager mode: ${mode}`);
  }));

  const ingestedEvents = ingestAgentArtifacts({
    dbPath,
    artifacts
  });

  return {
    mode,
    dbPath,
    outDir,
    artifacts,
    ingested_events: ingestedEvents
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = await runAgentManager(args);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
