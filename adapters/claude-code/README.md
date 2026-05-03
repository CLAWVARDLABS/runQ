# RunQ Claude Code Adapter

This adapter converts Claude Code hook input into RunQ events and writes them to a local RunQ database.

## Supported Events

Current support:

- `SessionStart` -> `session.started`
- `SessionEnd` -> `session.ended`
- `UserPromptSubmit` -> `user.prompt.submitted`
- `PreToolUse` with `Bash` -> `command.started`
- `PostToolUse` with `Bash` -> `command.ended`
- `PreToolUse` with other tools -> `tool.call.started`
- `PostToolUse` with other tools -> `tool.call.ended`

## Local Usage

Run the hook directly with sample JSON:

```bash
echo '{"session_id":"demo","cwd":"/repo","hook_event_name":"SessionStart","source":"startup","model":"claude-sonnet"}' \
  | node adapters/claude-code/hook.js --db .runq/dev.db
```

List captured sessions:

```bash
node src/cli.js sessions --db .runq/dev.db
```

## Claude Code Settings Example

Recommended:

```bash
node src/cli.js init claude-code --db .runq/runq.db
```

Manual setup:

Add command hooks to `.claude/settings.local.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node /absolute/path/to/runq/adapters/claude-code/hook.js --db /absolute/path/to/.runq/runq.db"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node /absolute/path/to/runq/adapters/claude-code/hook.js --db /absolute/path/to/.runq/runq.db"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node /absolute/path/to/runq/adapters/claude-code/hook.js --db /absolute/path/to/.runq/runq.db"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node /absolute/path/to/runq/adapters/claude-code/hook.js --db /absolute/path/to/.runq/runq.db"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node /absolute/path/to/runq/adapters/claude-code/hook.js --db /absolute/path/to/.runq/runq.db"
          }
        ]
      }
    ]
  }
}
```

Use `.claude/settings.local.json` for local testing so the database path is not committed.
