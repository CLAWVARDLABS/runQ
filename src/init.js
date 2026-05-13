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

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function commandFor(adapterPath, dbPath) {
  return `node ${adapterPath} --db ${dbPath}`;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function pushUnique(list, value) {
  const next = Array.isArray(list) ? [...list] : [];
  if (!next.includes(value)) {
    next.push(value);
  }
  return next;
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

  writeJson(settingsPath, settings);
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

function codexHookCommand(adapterPath, dbPath) {
  return `node ${shellQuote(adapterPath)} --db ${shellQuote(dbPath)} --quiet`;
}

function codexHookEntry(hookName, command, matcher = null) {
  return [
    `[[hooks.${hookName}]]`,
    matcher ? `matcher = ${tomlString(matcher)}` : null,
    `[[hooks.${hookName}.hooks]]`,
    'type = "command"',
    `command = ${tomlString(command)}`
  ].filter(Boolean).join('\n');
}

function codexHooksBlock(adapterPath, dbPath) {
  const command = codexHookCommand(adapterPath, dbPath);
  return [
    '# RunQ Codex hooks',
    codexHookEntry('SessionStart', command, 'startup|resume|clear'),
    '',
    codexHookEntry('UserPromptSubmit', command),
    '',
    codexHookEntry('PreToolUse', command, 'Bash|apply_patch'),
    '',
    codexHookEntry('PostToolUse', command, 'Bash|apply_patch'),
    '',
    codexHookEntry('Stop', command),
    '# End RunQ Codex hooks'
  ].join('\n');
}

function removeRunqCodexBlocks(toml) {
  return toml
    .replace(/\n?# RunQ notify hook\nnotify = \[[\s\S]*?\]\n?/m, '\n')
    .replace(/\n?# RunQ Codex hooks\n[\s\S]*?# End RunQ Codex hooks\n?/m, '\n');
}

function insertTomlRootBlock(toml, block) {
  const lines = toml.trimEnd().split('\n');
  if (lines.length === 1 && lines[0] === '') {
    return `${block}\n`;
  }
  const firstTableIndex = lines.findIndex((line) => /^\s*\[/.test(line));
  if (firstTableIndex === -1) {
    return `${lines.join('\n')}\n\n${block}\n`;
  }
  lines.splice(firstTableIndex, 0, '', block, '');
  return `${lines.join('\n')}\n`;
}

function setTomlFeatureFlag(toml, name, value) {
  const lines = toml.split('\n');
  const headerIndex = lines.findIndex((line) => /^\s*\[features\]\s*(?:#.*)?$/.test(line));
  const nextLine = `${name} = ${value ? 'true' : 'false'}`;

  if (headerIndex === -1) {
    const trimmed = toml.trimEnd();
    return `${trimmed}${trimmed ? '\n\n' : ''}[features]\n${nextLine}\n`;
  }

  let sectionEnd = lines.length;
  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    if (/^\s*\[/.test(lines[index])) {
      sectionEnd = index;
      break;
    }
  }

  for (let index = headerIndex + 1; index < sectionEnd; index += 1) {
    if (new RegExp(`^\\s*${name}\\s*=`).test(lines[index])) {
      lines[index] = nextLine;
      return lines.join('\n');
    }
  }

  lines.splice(headerIndex + 1, 0, nextLine);
  return lines.join('\n');
}

export function initCodex({ homeDir, dbPath, runqRoot }) {
  const configPath = join(homeDir, '.codex', 'config.toml');
  const adapterPath = resolve(runqRoot, 'adapters/codex/hook.js');
  const existing = existsSync(configPath) ? readFileSync(configPath, 'utf8') : '';
  const withNotify = insertTomlRootBlock(
    removeRunqCodexBlocks(existing),
    `# RunQ notify hook\n${codexNotifyBlock(adapterPath, dbPath)}`
  );
  const base = setTomlFeatureFlag(withNotify, 'codex_hooks', true);
  const next = `${base.trimEnd()}\n\n${codexHooksBlock(adapterPath, dbPath)}\n`;

  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, next);
  return { target: 'codex', path: configPath };
}

function openClawPluginSource({ adapterPath, dbPath }) {
  const hookNames = [
    'session_start',
    'message_received',
    'model_call_started',
    'model_call_ended',
    'llm_input',
    'llm_output',
    'before_tool_call',
    'after_tool_call',
    'agent_end',
    'session_end',
    'subagent_spawned',
    'subagent_ended'
  ];
  const registrations = hookNames
    .map((hookName) => `    api.on(${JSON.stringify(hookName)}, (event, ctx) => reportToRunQ(${JSON.stringify(hookName)}, event, ctx));`)
    .join('\n');
  return `const { spawnSync } = require('node:child_process');

const adapterPath = ${JSON.stringify(adapterPath)};
const dbPath = ${JSON.stringify(dbPath)};

function reportToRunQ(hook, event, ctx) {
  const result = spawnSync(process.execPath, [adapterPath, '--db', dbPath], {
    input: JSON.stringify({ hook, event, ctx }),
    encoding: 'utf8',
    stdio: ['pipe', 'ignore', 'pipe']
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || 'RunQ reporter failed');
  }
}

module.exports = {
  id: 'runq-reporter',
  register(api) {
${registrations}
  }
};
`;
}

export function initOpenClaw({ homeDir, dbPath, runqRoot }) {
  const openclawDir = join(homeDir, '.openclaw');
  const pluginRoot = join(openclawDir, 'extensions', 'runq-reporter');
  const configPath = join(openclawDir, 'openclaw.json');
  const adapterPath = resolve(runqRoot, 'adapters/openclaw/hook.js');
  const packageJsonPath = join(pluginRoot, 'package.json');
  const manifestPath = join(pluginRoot, 'openclaw.plugin.json');
  const indexPath = join(pluginRoot, 'index.cjs');

  mkdirSync(pluginRoot, { recursive: true });
  writeJson(packageJsonPath, {
    name: 'runq-reporter',
    version: '0.1.0',
    private: true,
    openclaw: {
      extensions: ['./index.cjs']
    }
  });
  writeJson(manifestPath, {
    id: 'runq-reporter',
    name: 'RunQ Reporter',
    description: 'Reports OpenClaw agent lifecycle, model, and tool events to RunQ.',
    version: '0.1.0',
    configSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  });
  writeFileSync(indexPath, openClawPluginSource({ adapterPath, dbPath }));

  const config = readJsonIfExists(configPath, {});
  config.plugins = config.plugins ?? {};
  config.plugins.enabled = true;
  config.plugins.allow = pushUnique(config.plugins.allow, 'runq-reporter');
  config.plugins.load = config.plugins.load ?? {};
  config.plugins.load.paths = pushUnique(config.plugins.load.paths, pluginRoot);
  config.plugins.entries = config.plugins.entries ?? {};
  config.plugins.entries['runq-reporter'] = {
    ...config.plugins.entries['runq-reporter'],
    enabled: true,
    hooks: {
      ...config.plugins.entries['runq-reporter']?.hooks,
      allowPromptInjection: true
    }
  };
  writeJson(configPath, config);

  return { target: 'openclaw', path: pluginRoot };
}

export function initHermes({ homeDir, dbPath, runqRoot }) {
  const manifestPath = join(homeDir, '.hermes', 'hooks', 'runq.json');
  const adapterPath = resolve(runqRoot, 'adapters/hermes/hook.js');
  writeJson(manifestPath, {
    name: 'runq',
    description: 'Report Hermes agent lifecycle, model, and command events to RunQ.',
    command: ['node', adapterPath, '--db', dbPath],
    input: 'json-stdin',
    events: [
      'session.started',
      'session.ended',
      'message.user',
      'model.started',
      'model.finished',
      'command.started',
      'command.finished'
    ]
  });
  return { target: 'hermes', path: manifestPath };
}

export function initAgent(target, options) {
  const resolvedOptions = {
    ...options,
    dbPath: resolve(options.dbPath)
  };

  if (target === 'all') {
    return [
      initClaudeCode(resolvedOptions),
      initCodex(resolvedOptions),
      initOpenClaw(resolvedOptions),
      initHermes(resolvedOptions)
    ];
  }
  if (target === 'claude-code') {
    return initClaudeCode(resolvedOptions);
  }
  if (target === 'codex') {
    return initCodex(resolvedOptions);
  }
  if (target === 'openclaw') {
    return initOpenClaw(resolvedOptions);
  }
  if (target === 'hermes') {
    return initHermes(resolvedOptions);
  }
  throw new Error(`Unsupported init target: ${target}`);
}
