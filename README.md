# RunQ

Open protocol and local collector for coding-agent run quality.

RunQ captures what coding agents did, scores whether the work likely held up, and generates evidence-backed recommendations to improve future runs.

## Status

RunQ is an Apache-2.0 open source project in `0.2.x` local alpha.

Use it today as a local developer preview for collecting coding-agent run metadata, inspecting timelines, scoring run quality, and testing workflow recommendations. Do not treat `0.x` protocol or schema shapes as stable until `1.0`.

## Open Source Project Links

- License: [Apache-2.0](LICENSE)
- Changelog: [CHANGELOG.md](CHANGELOG.md)
- Contributing guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security policy: [SECURITY.md](SECURITY.md)
- Code of conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- Support: [SUPPORT.md](SUPPORT.md)
- Release process: [RELEASE.md](RELEASE.md)

## Why

AI coding agents now read files, edit code, run commands, request permissions, spawn subagents, and execute tests. Generic LLM observability can show model calls and traces, but it does not fully answer the engineering question:

> Did this agent run actually work?

RunQ focuses on that question.

## What RunQ Standardizes

- Coding-agent session events.
- Command, tool, model, permission, file-change, and verification events.
- Outcome quality dimensions.
- Privacy levels for local-sensitive telemetry.
- Evidence-backed recommendations.

## Quality Dimensions

- Outcome Confidence
- Verification Coverage
- Rework Risk
- Permission Friction
- Loop Risk
- Cost Efficiency
- Repo Agent Readiness

## Quick Start

Local alpha setup:

```bash
npm install
bash scripts/install-local.sh
```

Connect a local agent automatically:

```bash
node src/cli.js init all --db .runq/runq.db
```

Or configure a single surface:

```bash
node src/cli.js init claude-code --db .runq/runq.db
node src/cli.js init codex --db .runq/runq.db
node src/cli.js init openclaw --db .runq/runq.db
node src/cli.js init hermes --db .runq/runq.db
```

Check setup health and exact remediation commands:

```bash
node src/cli.js doctor --db .runq/runq.db
node src/cli.js doctor --json --db .runq/runq.db
```

Check public-preview readiness from local captured sessions:

```bash
node src/cli.js readiness --db .runq/runq.db
node src/cli.js readiness --json --db .runq/runq.db
```

OpenClaw has two collection paths. `runq init openclaw` installs a native OpenClaw plugin reporter and enables conversation hook access. For older sessions or plugin-disabled environments, import session JSONL directly:

```bash
node src/cli.js import-openclaw ~/.openclaw/agents/main/sessions/<session-id>.jsonl --db .runq/runq.db
```

Run the lightweight OpenClaw reporter in one-shot or daemon mode:

```bash
npm run openclaw:reporter -- --once --db .runq/runq.db
npm run openclaw:reporter -- --db .runq/runq.db
```

Ingest the sample session:

```bash
node src/cli.js ingest examples/sessions/basic-run.json --db .runq/dev.db
```

Run the OpenClaw-like product harness:

```bash
npm run harness:openclaw -- --scenario verified-success --db .runq/openclaw-harness.db
npm run harness:openclaw -- --scenario repeated-test-failure --db .runq/openclaw-harness.db
```

Run a deterministic real coding-task harness that creates a small repo, observes a failing verification, applies a bugfix, and observes the passing verification:

```bash
npm run harness:coding-task -- --db .runq/coding-task.db --repo .runq/coding-task-repo
```

Run the full v0.2 local-alpha acceptance check:

```bash
npm run release-check
```

The release check records three product scenarios into one local database: OpenClaw verified success, OpenClaw repeated verification failure, and a real coding-task recovery run. It exits non-zero if scoring, recommendations, usable timelines, or default redaction regress.

Run multiple product-test agents and ingest them into one Run Inbox database:

```bash
npm run agent-manager -- --mode local --db .runq/agent-manager.db --out .runq/agent-manager
```

Use Docker-backed test agents:

```bash
npm run agent-manager -- --mode docker --db .runq/agent-manager.db --out .runq/agent-manager
```

Run a real latest OpenClaw turn in Docker and require RunQ hook capture:

```bash
OPENCLAW_E2E_API_KEY="$OPENCLAW_E2E_API_KEY" \
OPENCLAW_E2E_BASE_URL="https://token.clawvard.school/v1" \
OPENCLAW_E2E_PROVIDER="Clawvard Token" \
OPENCLAW_E2E_MODEL="MiniMax-M2.7" \
npm run openclaw:docker-e2e
```

List sessions:

```bash
node src/cli.js sessions --db .runq/dev.db
```

Record human feedback on a recommendation surfaced for a session:

```bash
node src/cli.js accept-recommendation <session_id> <recommendation_id> --note "will fix" --db .runq/dev.db
node src/cli.js dismiss-recommendation <session_id> <recommendation_id> --db .runq/dev.db
```

Run Inbox stores accept/dismiss decisions as `recommendation.accepted` and
`recommendation.dismissed` events so future scoring and reports can track
which optimizations the user actually adopted.

Open the local Run Inbox:

```bash
npm run inbox -- --db .runq/dev.db --port 4545
```

Run the Next.js development server while working on the product UI:

```bash
npm run dev
```

The development server defaults to `http://localhost:3000` and will print a different port if 3000 is already in use.

Run Inbox is a Next.js + Tailwind workbench. The legacy no-build HTTP server remains available for compatibility:

```bash
npm run inbox:legacy -- --db .runq/dev.db --port 4545
```

## Local Privacy Defaults

RunQ stores metadata-first telemetry by default. Sensitive fields such as raw prompts, command strings, command output, token-looking strings, passwords, and API keys are redacted before events are persisted. Normalized adapters preserve hashes, lengths, binary names, exit codes, durations, and verification flags so scoring still works without storing raw private content.

Use `privacy.level = "sensitive"` or `privacy.level = "secret"` only when an integration has seen raw private content. The local collector will downgrade stored events to metadata after redaction unless a future explicit opt-in policy changes that behavior.

## Run Inbox

Run Inbox includes:

- A product shell where the left sidebar is the only global module navigation, and the top bar is reserved for current-page context, search, refresh, notifications, and language switching.
- Setup Health for Claude Code, Codex, OpenClaw, Hermes, Node.js, and the local database.
- Run search and status filters for accepted, failed, and needs-review sessions.
- Timeline search and event-type filters.
- Quality Inspector with Outcome Confidence, satisfaction, and evidence-backed recommendations.
- Readiness reporting for usable timeline coverage and secret-like payload findings.
- Agent Session Traces at `/traces`, with expandable grouped trace events for lifecycle, model calls, commands, files, verification, and feedback.

Run tests:

```bash
npm test
```

Build the Next.js app:

```bash
npm run build
```

Run browser end-to-end tests:

```bash
npm run test:e2e
```

Run the open source release gate:

```bash
npm test
npm run build
npm run test:e2e
npm run release-check
npm audit --omit=dev
env npm_config_cache=.tmp/npm-cache npm pack --dry-run
```

## Initial Integrations

Current adapters:

- Claude Code
- Codex
- OpenClaw
- Hermes

## Product Harnesses

RunQ includes executable harnesses for agent-framework-like event streams. These are not demos; they are regression tests for the product thesis.

The coding-task harness creates a real temporary JavaScript repo, runs an initially failing verification command, applies a code fix, reruns verification, and records the full RunQ event timeline. Use it to verify that RunQ judges recovered coding-agent work as trusted instead of penalizing the early failure forever.

The OpenClaw harness produces two deterministic sessions:

- `verified-success`: a coding-agent run changes a file, runs targeted verification, and gets high Outcome Confidence.
- `repeated-test-failure`: a run changes a file, repeats the same failing verification command, and gets verification and loop-prevention recommendations.

Each scenario records a `satisfaction.recorded` event and has a golden product snapshot under `examples/openclaw-harness/golden/`. Use these harnesses when adding new metrics, adapters, or recommendations so quality scoring changes remain explainable.

## Relationship To OpenTelemetry

RunQ complements OpenTelemetry. It should map model, tool, and agent spans to OpenTelemetry GenAI conventions where possible, while defining coding-agent-specific semantics for commands, permissions, verification, rework, and run quality.

## ARQ Standard

RunQ uses the ARQ Agent Run Quality standard for coding-agent event semantics, satisfaction labels, quality dimensions, recommendation categories, and metadata-first privacy rules. See [docs/arq-standard.md](docs/arq-standard.md).

## Public Preview Readiness

RunQ can be published as a local alpha when the release gate passes. A broader developer preview still requires more real-session evidence:

- 5 external users capture real sessions.
- At least 50 real sessions are ingested.
- At least 80 percent of sessions reconstruct a usable timeline.
- At least 3 users act on one recommendation.
- No sensitive-data leak is found in default metadata mode.
- `node src/cli.js readiness --db .runq/runq.db --json` reports `ready_for_public_preview: true`.
