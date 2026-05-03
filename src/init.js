import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const claudeHookEvents = [
  'SessionStart',
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse',
  'SessionEnd'
];

function readJsonIfExists(path, fallback) {
  if (!existsSync(path)) {
    return fallback;
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

function commandFor(adapterPath, dbPath) {
  return `node ${adapterPath} --db ${dbPath}`;
}

function hookEntry(adapterPath, dbPath) {
  return {
    matcher: '*',
    hooks: [
      {
        type: 'command',
        command: commandFor(adapterPath, dbPath)
      }
    ]
  };
}

export function initClaudeCode({ homeDir, dbPath, runqRoot }) {
  const settingsPath = join(homeDir, '.claude', 'settings.local.json');
  const adapterPath = resolve(runqRoot, 'adapters/claude-code/hook.js');
  const settings = readJsonIfExists(settingsPath, {});
  settings.hooks = settings.hooks ?? {};

  for (const eventName of claudeHookEvents) {
    settings.hooks[eventName] = [hookEntry(adapterPath, dbPath)];
  }

  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
  return { target: 'claude-code', path: settingsPath };
}

function tomlString(value) {
  return JSON.stringify(value);
}

function codexNotifyBlock(adapterPath, dbPath) {
  return [
    'notify = [',
    `  ${tomlString('node')},`,
    `  ${tomlString(adapterPath)},`,
    `  ${tomlString('--db')},`,
    `  ${tomlString(dbPath)}`,
    ']'
  ].join('\n');
}

export function initCodex({ homeDir, dbPath, runqRoot }) {
  const configPath = join(homeDir, '.codex', 'config.toml');
  const adapterPath = resolve(runqRoot, 'adapters/codex/hook.js');
  const existing = existsSync(configPath) ? readFileSync(configPath, 'utf8') : '';
  const withoutRunqNotify = existing.replace(/\n?# RunQ notify hook\nnotify = \[[\s\S]*?\]\n?/m, '\n');
  const next = `${withoutRunqNotify.trimEnd()}\n\n# RunQ notify hook\n${codexNotifyBlock(adapterPath, dbPath)}\n`;

  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, next);
  return { target: 'codex', path: configPath };
}

export function initAgent(target, options) {
  if (target === 'claude-code') {
    return initClaudeCode(options);
  }
  if (target === 'codex') {
    return initCodex(options);
  }
  throw new Error(`Unsupported init target: ${target}`);
}
