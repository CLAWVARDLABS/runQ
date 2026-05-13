# RunQ Codex Adapter

This adapter converts Codex hook or notify payloads into RunQ events and writes them to a local RunQ database.

## Supported Inputs

Current support:

- `SessionStart` -> `session.started`
- `SessionEnd` or `Stop` -> `session.ended`
- `UserPromptSubmit` -> `user.prompt.submitted`
- `PreToolUse` with shell-like tools -> `command.started`
- `PostToolUse` with shell-like tools -> `command.ended`
- `PreToolUse` with other tools -> `tool.call.started`
- `PostToolUse` with other tools -> `tool.call.ended`
- legacy `notify` payload with `type: "agent-turn-complete"` -> `session.ended`

## Local Usage

Run the hook directly with sample JSON:

```bash
echo '{"session_id":"demo","cwd":"/repo","hook_event_name":"SessionStart","model":"gpt-5.2-codex"}' \
  | node adapters/codex/hook.js --db .runq/dev.db
```

List captured sessions:

```bash
node src/cli.js sessions --db .runq/dev.db
```

## Recommended Setup

Recommended:

```bash
node src/cli.js init codex --db .runq/runq.db
```

RunQ configures Codex hooks for full timeline capture and keeps `notify` as a compatibility fallback for older Codex versions. The generated config enables `codex_hooks`, installs command hooks with `--quiet`, and writes a root-level `notify` command.

Example `~/.codex/config.toml`:

```toml
# RunQ notify hook
notify = [
  "node",
  "/absolute/path/to/runq/adapters/codex/hook.js",
  "--db",
  "/absolute/path/to/.runq/runq.db"
]

[features]
codex_hooks = true

# RunQ Codex hooks
[[hooks.SessionStart]]
matcher = "startup|resume|clear"
[[hooks.SessionStart.hooks]]
type = "command"
command = "node '/absolute/path/to/runq/adapters/codex/hook.js' --db '/absolute/path/to/.runq/runq.db' --quiet"

[[hooks.UserPromptSubmit]]
[[hooks.UserPromptSubmit.hooks]]
type = "command"
command = "node '/absolute/path/to/runq/adapters/codex/hook.js' --db '/absolute/path/to/.runq/runq.db' --quiet"

[[hooks.PreToolUse]]
matcher = "Bash|apply_patch"
[[hooks.PreToolUse.hooks]]
type = "command"
command = "node '/absolute/path/to/runq/adapters/codex/hook.js' --db '/absolute/path/to/.runq/runq.db' --quiet"

[[hooks.PostToolUse]]
matcher = "Bash|apply_patch"
[[hooks.PostToolUse.hooks]]
type = "command"
command = "node '/absolute/path/to/runq/adapters/codex/hook.js' --db '/absolute/path/to/.runq/runq.db' --quiet"

[[hooks.Stop]]
[[hooks.Stop.hooks]]
type = "command"
command = "node '/absolute/path/to/runq/adapters/codex/hook.js' --db '/absolute/path/to/.runq/runq.db' --quiet"
# End RunQ Codex hooks
```

Run `node src/cli.js doctor --db .runq/runq.db` after setup. A notify-only config is reported as a manual upgrade because it can record turn completion but not the command/tool timeline.

## Manual Hook Command

For Codex versions with hook support, point hook commands at:

```bash
node /absolute/path/to/runq/adapters/codex/hook.js --db /absolute/path/to/.runq/runq.db --quiet
```

The adapter expects JSON on stdin for command hooks. If your Codex version passes notify JSON as an argument instead of stdin, the adapter accepts that shape too.
