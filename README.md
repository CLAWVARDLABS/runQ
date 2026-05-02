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

Ingest the sample session:

```bash
node src/cli.js ingest examples/sessions/basic-run.json --db .runq/dev.db
```

List sessions:

```bash
node src/cli.js sessions --db .runq/dev.db
```

Run tests:

```bash
npm test
```

## Initial Integrations

Current adapters:

- Claude Code
- Codex

Planned adapters:

- OpenClaw
- Hermes

## Relationship To OpenTelemetry

RunQ complements OpenTelemetry. It should map model, tool, and agent spans to OpenTelemetry GenAI conventions where possible, while defining coding-agent-specific semantics for commands, permissions, verification, rework, and run quality.

## Status

RunQ is in protocol preview. APIs and schemas may change before `1.0`.
