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
3. Configure Claude Code or Codex hook commands from adapter docs.
4. Run a normal coding-agent task.
5. Open the local Run Inbox.
6. Export one low-confidence session bundle.

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
