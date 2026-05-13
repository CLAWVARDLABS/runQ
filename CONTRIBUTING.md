# Contributing To RunQ

RunQ is an open protocol and reference implementation for agent run quality.

## Contribution Areas

Useful contributions:

- Adapter fixtures from Claude Code, Codex, OpenClaw, Hermes, and other agent runtimes.
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

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Build the Next.js UI:

```bash
npm run build
```

Run browser end-to-end tests:

```bash
npm run test:e2e
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

## Pull Requests

Before opening a pull request:

- Run the relevant tests for your change.
- Add or update tests for behavior changes.
- Update docs when CLI commands, protocol fields, setup flows, or UI flows change.
- Keep telemetry metadata-first by default.
- Do not commit local databases, `.env` files, `.runq/`, `.next/`, Playwright reports, or test output.

For release-impacting changes, run:

```bash
npm test
npm run build
npm run test:e2e
npm run release-check
npm audit --omit=dev
env npm_config_cache=.tmp/npm-cache npm pack --dry-run
```

## Security And Privacy

Do not open public issues for vulnerabilities. Follow `SECURITY.md`.

Do not paste raw prompts, command output, proprietary source code, API keys, passwords, or token-looking strings into issues or pull requests. Redact examples and prefer hashes, summaries, counts, and metadata.
