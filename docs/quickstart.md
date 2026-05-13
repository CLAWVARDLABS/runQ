# RunQ Quickstart

This guide gets RunQ running locally with demo data first, then shows how to connect a real agent.

## Requirements

- Node.js `>=22.5.0`
- npm
- macOS, Linux, or WSL for local agent hooks

## 1. Install

```bash
npm install
```

Optional local setup helper:

```bash
bash scripts/install-local.sh
```

## 2. Generate Demo Data

RunQ can be evaluated before connecting any agent.

```bash
node src/cli.js demo --db .runq/demo.db
```

The demo database includes:

- a high-trust successful run
- a failed or abandoned run
- a needs-review run
- an accepted recommendation with a follow-up run

## 3. Open Run Inbox

```bash
npm run inbox -- --db .runq/demo.db --port 4545
```

Open `http://localhost:4545`.

Start with:

1. `Agents`: confirm the local data source and agent cards.
2. `Traces`: open a session and inspect Run Summary, workflow, and event details.
3. `Recommendations`: review evidence-backed recommendations.
4. `Setup`: inspect agent connection status and setup commands.

## 4. Connect A Local Agent

Configure every supported local surface:

```bash
node src/cli.js init all --db .runq/runq.db
```

Or configure one surface:

```bash
node src/cli.js init claude-code --db .runq/runq.db
node src/cli.js init codex --db .runq/runq.db
node src/cli.js init openclaw --db .runq/runq.db
node src/cli.js init hermes --db .runq/runq.db
```

Then check setup health:

```bash
node src/cli.js doctor --db .runq/runq.db
node src/cli.js doctor --json --db .runq/runq.db
```

## 5. Run One Real Agent Task

After setup is healthy, run a normal task in the configured agent. Then open the local database:

```bash
npm run inbox -- --db .runq/runq.db --port 4545
```

Use `Traces` to inspect what the agent did and `Recommendations` to see any workflow improvements.

## 6. Import OpenClaw Sessions

OpenClaw has two collection paths.

Native reporter:

```bash
npm run openclaw:reporter -- --once --db .runq/runq.db
npm run openclaw:reporter -- --db .runq/runq.db
```

JSONL import for older sessions or plugin-disabled environments:

```bash
node src/cli.js import-openclaw ~/.openclaw/agents/main/sessions/<session-id>.jsonl --db .runq/runq.db
```

## 7. Useful CLI Commands

List sessions:

```bash
node src/cli.js sessions --db .runq/runq.db
```

Export a session bundle:

```bash
node src/cli.js export <session_id> --db .runq/runq.db
```

Record recommendation feedback:

```bash
node src/cli.js accept-recommendation <session_id> <recommendation_id> --note "will fix" --db .runq/runq.db
node src/cli.js dismiss-recommendation <session_id> <recommendation_id> --db .runq/runq.db
```

Check public-preview readiness:

```bash
node src/cli.js readiness --db .runq/runq.db
node src/cli.js readiness --json --db .runq/runq.db
```

## 8. Development Server

Run Inbox uses Next.js for the product UI.

```bash
npm run dev
```

The development server defaults to `http://localhost:3000`.

The legacy no-build HTTP server remains available for compatibility:

```bash
npm run inbox:legacy -- --db .runq/runq.db --port 4545
```

## 9. Verify The Project

```bash
npm test
npm run build
npm run test:e2e
npm run release-check
```

The full open source release gate is documented in [RELEASE.md](../RELEASE.md).
