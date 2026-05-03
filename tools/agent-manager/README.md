# RunQ Agent Manager

Agent Manager is a local product-testing harness for RunQ. It starts multiple deterministic agent workers, collects their RunQ event artifacts, and ingests those artifacts into one RunQ database for Run Inbox testing.

The first version does not require Claude Code, Codex, OpenClaw, Hermes, or API keys. It uses OpenClaw-like scenarios that exercise the same RunQ protocol paths:

- `verified-success`: code changed, targeted verification passed, satisfaction accepted.
- `repeated-test-failure`: code changed, the same verification command failed repeatedly, satisfaction abandoned.

## Why artifacts instead of direct DB writes?

SQLite allows concurrent readers but only one writer at a time. Docker-started agents may run concurrently, so each agent writes a JSON event artifact. The manager ingests artifacts sequentially into SQLite after the agent workers finish.

This keeps product tests deterministic and avoids database lock failures.

## Local Mode

Run two local agent workers and ingest them into `.runq/agent-manager.db`:

```bash
npm run agent-manager -- --mode local --db .runq/agent-manager.db --out .runq/agent-manager
```

Open the resulting database in Run Inbox:

```bash
npm run inbox -- --db .runq/agent-manager.db --port 4545
```

## Docker Mode

Build the test-agent image, run multiple containers, and ingest their artifacts:

```bash
npm run agent-manager -- --mode docker --db .runq/agent-manager.db --out .runq/agent-manager
```

You can also run the containers through Compose to inspect the raw artifact flow:

```bash
docker compose -f docker-compose.agent-manager.yml up --build
npm run agent-manager -- --mode local --db .runq/agent-manager.db --out .runq/agent-manager --agents agent-success:verified-success,agent-failure:repeated-test-failure
```

The manager command is preferred because it runs workers and ingests artifacts in one step.

## Custom Agents

Pass `--agents` as a comma-separated list of `agent-id:scenario` pairs:

```bash
npm run agent-manager -- \
  --mode docker \
  --db .runq/agent-manager.db \
  --out .runq/agent-manager \
  --agents agent-a:verified-success,agent-b:repeated-test-failure,agent-c:repeated-test-failure
```

## Output

The command prints a JSON report:

```json
{
  "mode": "local",
  "dbPath": ".runq/agent-manager.db",
  "outDir": ".runq/agent-manager",
  "artifacts": [
    {
      "agentId": "agent-success",
      "scenario": "verified-success",
      "outPath": ".runq/agent-manager/agent-success-verified-success.json"
    }
  ],
  "ingested_events": 16
}
```

Use this database to test:

- Run Inbox session list rendering.
- Timeline summaries.
- Quality Inspector metrics.
- Satisfaction labels.
- Recommendation cards.
