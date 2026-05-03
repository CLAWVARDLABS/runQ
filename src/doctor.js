import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { RunqStore } from './store.js';

function statusWeight(status) {
  return { ok: 0, manual: 0, missing: 1, error: 1 }[status] ?? 1;
}

function checkDbWritable(dbPath) {
  try {
    mkdirSync(dirname(dbPath), { recursive: true });
    const store = new RunqStore(dbPath);
    store.close();
    return { status: 'ok', summary: `Writable local database: ${dbPath}` };
  } catch (error) {
    return { status: 'error', summary: `Database is not writable: ${error.message}` };
  }
}

function checkClaude(homeDir) {
  const path = join(homeDir, '.claude', 'settings.local.json');
  if (!existsSync(path)) {
    return { status: 'missing', summary: 'Run node src/cli.js init claude-code --db .runq/runq.db' };
  }
  try {
    const settings = JSON.parse(readFileSync(path, 'utf8'));
    const raw = JSON.stringify(settings);
    return raw.includes('adapters/claude-code/hook.js')
      ? { status: 'ok', summary: `Hook configured: ${path}` }
      : { status: 'missing', summary: `Claude settings exist but RunQ hook is missing: ${path}` };
  } catch (error) {
    return { status: 'error', summary: `Claude settings are not valid JSON: ${error.message}` };
  }
}

function checkCodex(homeDir) {
  const path = join(homeDir, '.codex', 'config.toml');
  if (!existsSync(path)) {
    return { status: 'missing', summary: 'Run node src/cli.js init codex --db .runq/runq.db' };
  }
  const config = readFileSync(path, 'utf8');
  return config.includes('adapters/codex/hook.js')
    ? { status: 'ok', summary: `Notify hook configured: ${path}` }
    : { status: 'missing', summary: `Codex config exists but RunQ notify hook is missing: ${path}` };
}

function checkOpenClaw(homeDir) {
  const sessionsDir = join(homeDir, '.openclaw', 'agents', 'main', 'sessions');
  if (!existsSync(sessionsDir)) {
    return { status: 'missing', summary: 'OpenClaw session directory was not found' };
  }
  const count = readdirSync(sessionsDir).filter((name) => name.endsWith('.jsonl')).length;
  return { status: 'ok', summary: `${count} OpenClaw session files available for reporter import` };
}

function checkHermes(runqRoot) {
  const hookPath = resolve(runqRoot, 'adapters/hermes/hook.js');
  return existsSync(hookPath)
    ? { status: 'manual', summary: `Adapter available; configure Hermes to call ${hookPath}` }
    : { status: 'missing', summary: 'Hermes adapter is missing' };
}

export function checkSetupHealth({
  homeDir = process.env.HOME,
  runqRoot = process.cwd(),
  dbPath = '.runq/runq.db'
} = {}) {
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  const checks = [
    {
      id: 'node',
      label: 'Node.js',
      ...nodeMajor >= 22
        ? { status: 'ok', summary: `Node ${process.versions.node}` }
        : { status: 'error', summary: `Node ${process.versions.node}; RunQ requires Node 22+` }
    },
    {
      id: 'database',
      label: 'RunQ Database',
      ...checkDbWritable(dbPath)
    },
    {
      id: 'claude-code',
      label: 'Claude Code',
      ...checkClaude(homeDir)
    },
    {
      id: 'codex',
      label: 'Codex',
      ...checkCodex(homeDir)
    },
    {
      id: 'openclaw',
      label: 'OpenClaw',
      ...checkOpenClaw(homeDir)
    },
    {
      id: 'hermes',
      label: 'Hermes',
      ...checkHermes(runqRoot)
    }
  ];

  return {
    ok: checks.reduce((sum, check) => sum + statusWeight(check.status), 0) === 0,
    generated_at: new Date().toISOString(),
    checks
  };
}
