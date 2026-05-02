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

## Codex Notify Example

Codex supports a `notify` command that receives a JSON payload. Configure it to call the RunQ hook command and pass the JSON argument.

Example `~/.codex/config.toml`:

```toml
notify = [
  "node",
  "/absolute/path/to/runq/adapters/codex/hook.js",
  "--db",
  "/absolute/path/to/.runq/runq.db"
]
```

If your Codex version passes notify JSON as an argument instead of stdin, the adapter accepts that shape too.

## Hook Example

For Codex versions with hook support, point hook commands at:

```bash
node /absolute/path/to/runq/adapters/codex/hook.js --db /absolute/path/to/.runq/runq.db
```

The adapter expects JSON on stdin for command hooks.

