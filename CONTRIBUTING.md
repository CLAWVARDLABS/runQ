# Contributing To RunQ

RunQ is an open protocol and reference implementation for coding-agent run quality.

## Contribution Areas

Useful contributions:

- Adapter fixtures from Claude Code, Codex, OpenClaw, Hermes, and other coding agents.
- Protocol improvements for command, permission, verification, and rework events.
- Scoring rules with clear evidence.
- Recommendation rules with measurable impact.
- Privacy and redaction improvements.
- Run Inbox UI improvements.

## Design Rules

- Prefer protocol compatibility over framework-specific shortcuts.
- Keep sensitive data local by default.
- Every score must be explainable.
- Every recommendation must cite evidence events.
- Do not add external dependencies unless the value is clear.
- Add tests before behavior changes.

## Development

Run tests:

```bash
npm test
```

Ingest the sample session:

```bash
node src/cli.js ingest examples/sessions/basic-run.json --db .runq/dev.db
```

Open the local Run Inbox:

```bash
npm run inbox -- --db .runq/dev.db --port 4545
```

## Protocol Changes

Protocol changes should update:

- `protocol/protocol-v0.md`
- `protocol/events.schema.json`
- validation logic in `src/schema.js`
- tests

Breaking changes should be proposed as an RFC before implementation.
