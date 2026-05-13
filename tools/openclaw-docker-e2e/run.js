#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    ...options,
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(' ')} exited ${result.status}`,
      result.stdout,
      result.stderr
    ].filter(Boolean).join('\n'));
  }
  return result;
}

function providerIdFromName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'clawvard-token';
}

export function defaultExpectedText() {
  return 'RunQ Docker OpenClaw e2e passed.';
}

export function defaultPrompt() {
  return [
    'Use the exec tool exactly once to run this command:',
    'node -e "console.log(\'runq-tool-e2e\')"',
    'After the command returns, reply exactly:',
    defaultExpectedText()
  ].join('\n');
}

export function promptFromEnv(env = process.env) {
  return env.OPENCLAW_E2E_PROMPT || defaultPrompt();
}

export function expectedTextFromEnv(env = process.env) {
  return env.OPENCLAW_E2E_EXPECTED_TEXT || defaultExpectedText();
}

export function expectedCommandCount(env = process.env) {
  const rawValue = env.OPENCLAW_E2E_EXPECTED_COMMANDS;
  if (rawValue === undefined || rawValue === '') {
    return 1;
  }
  if (rawValue === 'any') {
    return null;
  }
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`OPENCLAW_E2E_EXPECTED_COMMANDS must be a non-negative integer, got ${rawValue}`);
  }
  return value;
}

function main() {
  const providerName = process.env.OPENCLAW_E2E_PROVIDER || 'clawvard-token';
  const provider = providerIdFromName(providerName);
  const model = process.env.OPENCLAW_E2E_MODEL || 'MiniMax-M2.7';
  const baseUrl = process.env.OPENCLAW_E2E_BASE_URL || 'https://token.clawvard.school/v1';
  const apiKey = requiredEnv('OPENCLAW_E2E_API_KEY');
  const sessionId = process.env.OPENCLAW_E2E_SESSION_ID || `runq-docker-openclaw-${Date.now()}`;
  const dbPath = resolve(process.env.RUNQ_DB || '/runq/openclaw-docker-e2e.db');
  const homeDir = homedir();
  const openclawDir = join(homeDir, '.openclaw');
  const agentDir = join(openclawDir, 'agents', 'main', 'agent');
  const workspaceDir = join(openclawDir, 'workspace');
  const modelRef = `${provider}/${model}`;

  mkdirSync(workspaceDir, { recursive: true });
  writeFileSync(join(workspaceDir, 'IDENTITY.md'), '# IDENTITY\n\nRunQ Docker E2E test agent.\n');
  writeFileSync(join(workspaceDir, 'USER.md'), '# USER\n\nRunQ Docker E2E.\n');
  writeFileSync(join(workspaceDir, 'SOUL.md'), '# SOUL\n\nRun deterministic OpenClaw smoke tests.\n');
  writeFileSync(join(workspaceDir, 'HEARTBEAT.md'), '# HEARTBEAT\n\nE2E active.\n');
  writeJson(join(agentDir, 'models.json'), {
    providers: {
      [provider]: {
        baseUrl,
        apiKey,
        api: 'openai-completions',
        models: [
          {
            id: model,
            name: model,
            reasoning: true,
            input: ['text'],
            cost: {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0
            },
            contextWindow: 200000,
            maxTokens: 8192
          }
        ]
      }
    }
  });
  writeJson(join(agentDir, 'auth-profiles.json'), {
    version: 1,
    profiles: {
      [`${provider}:default`]: {
        type: 'api_key',
        provider,
        key: apiKey
      }
    },
    lastGood: {
      [provider]: `${provider}:default`
    }
  });
  writeJson(join(openclawDir, 'openclaw.json'), {
    agents: {
      defaults: {
        model: {
          primary: modelRef
        },
        models: {
          [modelRef]: {}
        }
      }
    },
    models: {
      mode: 'merge',
      providers: {
        [provider]: {
          baseUrl,
          apiKey,
          api: 'openai-completions',
          models: [
            {
              id: model,
              name: model,
              reasoning: true,
              input: ['text'],
              cost: {
                input: 0,
                output: 0,
                cacheRead: 0,
                cacheWrite: 0
              },
              contextWindow: 200000,
              maxTokens: 8192
            }
          ]
        }
      }
    },
    gateway: {
      mode: 'local'
    }
  });

  run(process.execPath, [
    'src/cli.js',
    'init',
    'openclaw',
    '--db',
    dbPath
  ], {
    cwd: '/app',
    env: {
      ...process.env,
      HOME: homeDir
    }
  });

  const pluginInfo = run('openclaw', [
    'plugins',
    'info',
    'runq-reporter',
    '--json'
  ], {
    cwd: workspaceDir,
    env: {
      ...process.env,
      HOME: homeDir
    }
  });

  const prompt = promptFromEnv();
  const expectedText = expectedTextFromEnv();
  const expectedCommands = expectedCommandCount();
  const result = run('openclaw', [
    'agent',
    '--local',
    '--message',
    prompt,
    '--session-id',
    sessionId,
    '--json',
    '--timeout',
    process.env.OPENCLAW_E2E_TIMEOUT || '120'
  ], {
    cwd: workspaceDir,
    env: {
      ...process.env,
      HOME: homeDir
    }
  });

  const sessions = run(process.execPath, [
    'src/cli.js',
    'sessions',
    '--db',
    dbPath
  ], {
    cwd: '/app'
  });
  const parsedOpenClaw = JSON.parse(result.stdout);
  const parsedSessions = JSON.parse(sessions.stdout);
  const capturedSession = parsedSessions.find((session) => session.session_id === sessionId);
  const visibleText = parsedOpenClaw.payloads?.map((payload) => payload.text).join('\n') ?? '';
  const rawSessionFile = parsedOpenClaw.meta?.agentMeta?.sessionFile;
  const copiedRawSessionFile = rawSessionFile && existsSync(rawSessionFile)
    ? join(dirname(dbPath), `${sessionId}.openclaw.jsonl`)
    : null;
  if (copiedRawSessionFile) {
    copyFileSync(rawSessionFile, copiedRawSessionFile);
  }

  const exported = run(process.execPath, [
    'src/cli.js',
    'export',
    sessionId,
    '--db',
    dbPath
  ], {
    cwd: '/app'
  });
  const parsedExport = JSON.parse(exported.stdout);
  const eventTypes = new Set(parsedExport.events.map((event) => event.event_type));
  const eventTypeCounts = parsedExport.events.reduce((counts, event) => {
    counts[event.event_type] = (counts[event.event_type] ?? 0) + 1;
    return counts;
  }, {});

  if (expectedText && !visibleText.includes(expectedText)) {
    throw new Error(`OpenClaw response did not contain the expected E2E text: ${visibleText}`);
  }

  if (!capturedSession || capturedSession.event_count < 2) {
    throw new Error(`RunQ did not capture the OpenClaw session. Captured sessions: ${JSON.stringify(parsedSessions)}`);
  }

  for (const requiredType of ['model.call.started', 'model.call.ended', 'command.started', 'command.ended']) {
    if (!eventTypes.has(requiredType)) {
      throw new Error(`RunQ export is missing ${requiredType}. Captured event types: ${[...eventTypes].join(', ')}`);
    }
  }

  if (expectedCommands !== null && ((eventTypeCounts['command.started'] ?? 0) !== expectedCommands || (eventTypeCounts['command.ended'] ?? 0) !== expectedCommands)) {
    throw new Error(`RunQ should capture one command start and one command end. Counts: ${JSON.stringify(eventTypeCounts)}`);
  }

  console.log(JSON.stringify({
    session_id: sessionId,
    db_path: dbPath,
    raw_session_file: copiedRawSessionFile,
    plugin: JSON.parse(pluginInfo.stdout),
    openclaw: parsedOpenClaw,
    sessions: parsedSessions,
    export: parsedExport
  }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
