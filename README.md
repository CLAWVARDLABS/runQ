# RunQ

Open protocol and local collector for coding-agent run quality.

RunQ captures what coding agents did, scores whether the work likely held up, and generates evidence-backed recommendations to improve future runs.

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
bash scripts/install-local.sh
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

List sessions:

```bash
node src/cli.js sessions --db .runq/dev.db
```

Open the local Run Inbox:

```bash
npm run inbox -- --db .runq/dev.db --port 4545
```

Run tests:

```bash
npm test
```

## Initial Integrations

Current adapters:

- Claude Code
- Codex
- OpenClaw

Planned adapters:

- Hermes

## Product Harnesses

RunQ includes executable harnesses for agent-framework-like event streams. These are not demos; they are regression tests for the product thesis.

The OpenClaw harness produces two deterministic sessions:

- `verified-success`: a coding-agent run changes a file, runs targeted verification, and gets high Outcome Confidence.
- `repeated-test-failure`: a run changes a file, repeats the same failing verification command, and gets verification and loop-prevention recommendations.

Use these harnesses when adding new metrics, adapters, or recommendations so quality scoring changes remain explainable.

## Relationship To OpenTelemetry

RunQ complements OpenTelemetry. It should map model, tool, and agent spans to OpenTelemetry GenAI conventions where possible, while defining coding-agent-specific semantics for commands, permissions, verification, rework, and run quality.

## Status

RunQ is in protocol preview. APIs and schemas may change before `1.0`.
