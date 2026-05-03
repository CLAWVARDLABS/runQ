# Private Alpha Checklist

## Goal

Validate that RunQ can capture real Claude Code and Codex sessions, reconstruct timelines, and surface useful run-quality signals.

## Alpha User Profile

Invite users who:

- Use Claude Code or Codex daily.
- Work in real repositories.
- Are willing to share redacted session exports.
- Care about agent reliability, not only token cost.

## Setup Steps

1. Clone the repo.
2. Run `bash scripts/install-local.sh`.
3. Configure Claude Code or Codex with `node src/cli.js init claude-code --db .runq/runq.db` or `node src/cli.js init codex --db .runq/runq.db`.
4. Run `node src/cli.js doctor --db .runq/runq.db` and fix every missing check that applies to the agent being tested.
5. Run a normal coding-agent task.
6. Open the local Run Inbox.
7. Search or filter the run list and timeline to confirm the captured events are inspectable.
8. Export one low-confidence session bundle.

## OpenClaw Harness Check

Before testing with external users, run the deterministic OpenClaw-like harness:

```bash
npm run harness:openclaw -- --scenario verified-success --db .runq/openclaw-harness.db
npm run harness:openclaw -- --scenario repeated-test-failure --db .runq/openclaw-harness.db
```

Use the output as an early product sanity check:

- The verified-success run should score high on Outcome Confidence.
- The repeated-test-failure run should show high Loop Risk.
- The repeated-test-failure run should emit verification strategy and loop prevention recommendations.
- Both runs should record a `satisfaction.recorded` event and match their golden product snapshots in tests.

## Agent Manager Check

Before changing Run Inbox UI or scoring logic, run multiple product-test agents into one database:

```bash
npm run agent-manager -- --mode local --db .runq/agent-manager.db --out .runq/agent-manager
npm run inbox -- --db .runq/agent-manager.db --port 4545
```

If Docker is available, also run:

```bash
npm run agent-manager -- --mode docker --db .runq/agent-manager.db --out .runq/agent-manager
```

Use the generated sessions to check:

- Multiple agents appear in the Run list.
- Accepted and abandoned satisfaction labels render correctly.
- Failed verification and repeated command loop recommendations appear.
- Sequential ingest avoids SQLite lock errors when agents run concurrently.

## Real OpenClaw Reporter Check

For local OpenClaw users, import real sessions without hand-building payloads:

```bash
npm run openclaw:reporter -- --once --db .runq/openclaw-reporter.db
npm run inbox -- --db .runq/openclaw-reporter.db --port 4545
```

Use the imported sessions to check:

- New OpenClaw `.jsonl` sessions are imported once.
- Re-running `--once` does not duplicate events.
- `tool_call` and `tool_result` rows appear as command timeline events when present.
- `satisfaction.recorded` influences the Run Inbox outcome score.

## Setup Health Check

Run this before every alpha trial:

```bash
node src/cli.js doctor --db .runq/runq.db
```

Use the output to check:

- Claude Code and Codex missing hooks include exact `init` commands.
- OpenClaw missing sessions include the reporter command.
- Hermes shows the adapter path and remains manual until its hook contract is confirmed.
- The Run Inbox Setup Health panel mirrors the CLI status.

## Redaction Check

Before accepting an alpha export:

- Confirm raw prompts are represented as hashes, summaries, and lengths.
- Confirm command output is represented as hashes and status metadata.
- Confirm token-looking strings, passwords, and API keys are not persisted in event payloads.
- Confirm scoring still has binary names, exit codes, durations, and verification flags.

## What To Measure

- Did sessions appear without manual cleanup?
- Were timelines understandable?
- Did Outcome Confidence match user intuition?
- Did recommendations point to a real workflow improvement?
- Did redaction feel safe enough?
- Which events were missing?

## Exit Criteria

RunQ is ready for a public developer preview when:

- 5 external users capture real sessions.
- At least 50 real sessions are ingested.
- At least 80 percent of sessions reconstruct a usable timeline.
- At least 3 users act on one recommendation.
- No sensitive-data leak is found in default metadata mode.
