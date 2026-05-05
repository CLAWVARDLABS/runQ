# RunQ Hermes Adapter

This adapter converts Hermes-style agent lifecycle, model, and command payloads into RunQ events.

## Supported Inputs

- `session.started` / `session_start` -> `session.started`
- `session.ended` / `session_end` -> `session.ended`
- `message.user` / `user.prompt` -> `user.prompt.submitted`
- `model.started` / `llm.started` -> `model.call.started`
- `model.finished` / `llm.finished` -> `model.call.ended`
- `command.started` -> `command.started`
- `command.finished` / `command.ended` -> `command.ended`

## Local Usage

Write a RunQ hook manifest:

```bash
node src/cli.js init hermes --db .runq/runq.db
```

```bash
echo '{"type":"session.started","session_id":"demo","agent":"hermes-dev","cwd":"/repo"}' \
  | node adapters/hermes/hook.js --db .runq/dev.db
```

List captured sessions:

```bash
node src/cli.js sessions --db .runq/dev.db
```

The adapter intentionally accepts a small, generic event shape until Hermes publishes a stable hook contract.
