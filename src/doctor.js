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
    return { status: 'ok', summary: `Writable local database: ${dbPath}`, remediation: 'No action needed.' };
  } catch (error) {
    return {
      status: 'error',
      summary: `Database is not writable: ${error.message}`,
      remediation: `Create the parent directory or choose a writable path with --db ${dbPath}`
    };
  }
}

function checkClaude(homeDir) {
  const path = join(homeDir, '.claude', 'settings.local.json');
  const remediation = 'node src/cli.js init claude-code --db .runq/runq.db';
  if (!existsSync(path)) {
    return { status: 'missing', summary: 'Claude Code settings file was not found', remediation };
  }
  try {
    const settings = JSON.parse(readFileSync(path, 'utf8'));
    const raw = JSON.stringify(settings);
    return raw.includes('adapters/claude-code/hook.js')
      ? { status: 'ok', summary: `Hook configured: ${path}`, remediation: 'No action needed.' }
      : { status: 'missing', summary: `Claude settings exist but RunQ hook is missing: ${path}`, remediation };
  } catch (error) {
    return { status: 'error', summary: `Claude settings are not valid JSON: ${error.message}`, remediation };
  }
}

function checkCodex(homeDir) {
  const path = join(homeDir, '.codex', 'config.toml');
  const remediation = 'node src/cli.js init codex --db .runq/runq.db';
  if (!existsSync(path)) {
    return { status: 'missing', summary: 'Codex config file was not found', remediation };
  }
  const config = readFileSync(path, 'utf8');
  return config.includes('adapters/codex/hook.js')
    ? { status: 'ok', summary: `Notify hook configured: ${path}`, remediation: 'No action needed.' }
    : { status: 'missing', summary: `Codex config exists but RunQ notify hook is missing: ${path}`, remediation };
}

function checkOpenClaw(homeDir) {
  const pluginPath = join(homeDir, '.openclaw', 'extensions', 'runq-reporter', 'index.cjs');
  const configPath = join(homeDir, '.openclaw', 'openclaw.json');
  if (existsSync(pluginPath) && existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      const pluginRoot = join(homeDir, '.openclaw', 'extensions', 'runq-reporter');
      const allow = config.plugins?.allow ?? [];
      const paths = config.plugins?.load?.paths ?? [];
      const promptHooksAllowed =
        config.plugins?.entries?.['runq-reporter']?.hooks?.allowPromptInjection === true;
      if (
        allow.includes('runq-reporter') &&
        paths.includes(pluginRoot) &&
        promptHooksAllowed
      ) {
        return {
          status: 'ok',
          summary: `Native plugin configured: ${pluginPath}`,
          remediation: 'No action needed.'
        };
      }
    } catch {
      return {
        status: 'missing',
        summary: `OpenClaw RunQ plugin exists but openclaw.json is not valid JSON: ${configPath}`,
        remediation: 'node src/cli.js init openclaw --db .runq/runq.db'
      };
    }
  }

  const sessionsDir = join(homeDir, '.openclaw', 'agents', 'main', 'sessions');
  if (!existsSync(sessionsDir)) {
    return {
      status: 'missing',
      summary: 'OpenClaw session directory was not found',
      remediation: 'node src/cli.js init openclaw --db .runq/runq.db'
    };
  }
  const count = readdirSync(sessionsDir).filter((name) => name.endsWith('.jsonl')).length;
  return {
    status: 'ok',
    summary: `${count} OpenClaw session files available for reporter import`,
    remediation: 'npm run openclaw:reporter -- --once --db .runq/runq.db'
  };
}

function checkHermes(runqRoot, homeDir) {
  const manifestPath = join(homeDir, '.hermes', 'hooks', 'runq.json');
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const command = Array.isArray(manifest.command) ? manifest.command.join(' ') : '';
      if (command.includes('adapters/hermes/hook.js')) {
        return {
          status: 'ok',
          summary: `Hook manifest configured: ${manifestPath}`,
          remediation: 'No action needed.'
        };
      }
    } catch {
      return {
        status: 'error',
        summary: `Hermes RunQ hook manifest is invalid JSON: ${manifestPath}`,
        remediation: 'node src/cli.js init hermes --db .runq/runq.db'
      };
    }
  }
  const hookPath = resolve(runqRoot, 'adapters/hermes/hook.js');
  return existsSync(hookPath)
    ? {
        status: 'manual',
        summary: `Adapter available; configure Hermes to call ${hookPath}`,
        remediation: `Configure Hermes to pipe hook JSON into node ${hookPath} --db .runq/runq.db`
      }
    : { status: 'missing', summary: 'Hermes adapter is missing', remediation: 'Restore adapters/hermes/hook.js from the RunQ repo.' };
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
        : { status: 'error', summary: `Node ${process.versions.node}; RunQ requires Node 22+`, remediation: 'Install Node.js 22 or newer.' }
    },
    {
      id: 'database',
      label: 'RunQ Database',
      ...checkDbWritable(dbPath)
    },
    {
      id: 'claude-code',
      agent_id: 'claude_code',
      label: 'Claude Code',
      ...checkClaude(homeDir)
    },
    {
      id: 'codex',
      agent_id: 'codex',
      label: 'Codex',
      ...checkCodex(homeDir)
    },
    {
      id: 'openclaw',
      agent_id: 'openclaw',
      label: 'OpenClaw',
      ...checkOpenClaw(homeDir)
    },
    {
      id: 'hermes',
      agent_id: 'hermes',
      label: 'Hermes',
      ...checkHermes(runqRoot, homeDir)
    }
  ];

  return {
    ok: checks.reduce((sum, check) => sum + statusWeight(check.status), 0) === 0,
    generated_at: new Date().toISOString(),
    checks
  };
}
