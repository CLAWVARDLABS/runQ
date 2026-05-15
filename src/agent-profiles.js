// Agent profile registry.
//
// Promotes `framework` (the stringly-typed enum on every event) into a typed
// object so the rest of the code can ask:
//   - what category is this agent? (coding | conversation | task)
//   - which scoring domain does it default to?
//   - how do we surface it in the UI (display name, icon, gradient)?
//
// Adding a new agent is one entry in this file plus the importer/hook — no
// more sprinkling agent-aware switch statements across scoring, format, and
// adapter detection.

// Categories drive scoring behavior:
//   coding       — verification/exit_code/file changes are first-class
//                  signals; sessions without verification get capped lower.
//   conversation — chat-like agent (or coding agent in "ask, don't change"
//                  mode); only universal human-behavior signals apply; no
//                  hard caps for missing verification.
//   task         — autonomous task runner; like conversation but typically
//                  more tool-heavy. Falls back to coding rules if tool calls
//                  exist, conversation otherwise.
const PROFILES = {
  claude_code: {
    id: 'claude_code',
    display_name: 'Claude Code',
    category: 'coding',
    capture_strategy: 'hook+import',
    home_dir: '.claude',
    icon: 'terminal',
    gradient: 'from-orange-400 to-amber-600'
  },
  codex: {
    id: 'codex',
    display_name: 'Codex',
    category: 'coding',
    capture_strategy: 'hook+import',
    home_dir: '.codex',
    icon: 'code',
    gradient: 'from-slate-800 to-slate-950'
  },
  openclaw: {
    id: 'openclaw',
    display_name: 'OpenClaw',
    category: 'task',
    capture_strategy: 'hook+import',
    home_dir: '.openclaw',
    icon: 'auto_awesome',
    gradient: 'from-cyan-500 to-blue-700'
  },
  hermes: {
    id: 'hermes',
    display_name: 'Hermes',
    category: 'conversation',
    capture_strategy: 'sqlite-import',
    home_dir: '.hermes',
    icon: 'chat',
    gradient: 'from-violet-500 to-purple-700'
  }
};

// Fallback profile for anything we don't recognize (custom adapters in the
// wild, importer test data, etc.). Treated as 'task' so scoring stays useful
// without making coding-only assumptions.
const FALLBACK_PROFILE = {
  id: 'custom',
  display_name: 'Custom Agent',
  category: 'task',
  capture_strategy: 'unknown',
  home_dir: null,
  icon: 'auto_awesome',
  gradient: 'from-slate-500 to-slate-700'
};

export function getAgentProfile(frameworkId) {
  if (!frameworkId) return FALLBACK_PROFILE;
  return PROFILES[frameworkId] ?? FALLBACK_PROFILE;
}

export function listAgentProfiles() {
  return Object.values(PROFILES);
}

// Derive the profile from a stream of events. Picks the framework that
// appears most often (handles cross-agent imports gracefully).
export function profileFromEvents(events = []) {
  if (!Array.isArray(events) || events.length === 0) return FALLBACK_PROFILE;
  const counts = new Map();
  for (const event of events) {
    const fw = event?.framework;
    if (!fw) continue;
    counts.set(fw, (counts.get(fw) || 0) + 1);
  }
  if (counts.size === 0) return FALLBACK_PROFILE;
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return getAgentProfile(dominant);
}

// True when the agent uses shell commands + edits files as its primary mode
// of work. Coding-specific scoring caps and signals only fire for these.
export function isCodingProfile(profileOrEvents) {
  if (Array.isArray(profileOrEvents)) {
    return profileFromEvents(profileOrEvents).category === 'coding';
  }
  return profileOrEvents?.category === 'coding';
}
