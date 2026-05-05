# RunQ Agent-First Product Design

Last updated: 2026-05-03

## Product Thesis

RunQ should feel like an observability product for coding agents, not a raw trace viewer. The first screen should answer:

- Which agents are connected?
- Are they healthy?
- Which agent is producing bad or expensive runs?
- What happened inside a specific agent run?
- What should I change to improve future runs?

The primary user is a developer or engineering lead using general coding agents such as Claude Code, Codex, OpenClaw, and Hermes.

## Core User Flow

### 1. Agent Overview

The default landing screen is an agent portfolio.

Each agent card shows:

- Agent name and framework.
- Connection/setup status.
- Total runs.
- Average Outcome Confidence.
- Failed/abandoned rate.
- Recommendation count.
- Last seen time.

Primary action: select an agent.

This screen should make RunQ feel like "Datadog for agents": the user sees monitored entities first, then drills into telemetry.

### 2. Agent Detail

After selecting an agent, the page shows that agent's observability dashboard.

Sections:

- Summary cards: runs, failure rate, average confidence, recommendation count.
- Token/cost proxy chart: input/output token estimate over recent runs.
- Reliability trend: confidence and latency/QPS-style charts.
- Run history table: latest runs for this agent.
- Active recommendations: evidence-backed changes for agent policy, verification strategy, repo instructions, loop prevention, or escalation.

Primary actions:

- Filter by run status.
- Search runs.
- Select a run.

### 3. Run Detail

When a run is selected, the user sees:

- Outcome Confidence and verdict.
- Satisfaction label.
- Score reasons.
- Recommendations tied to evidence events.
- Timeline of model calls, commands, file changes, verification, and satisfaction.
- Raw metadata payloads behind a disclosure.

This screen is for debugging and improvement, not for first impressions.

## Information Architecture

Single-page local alpha layout:

- Left rail: product identity and navigation icons.
- Top bar: breadcrumb, language switch, refresh.
- Main:
  - Agent Overview band.
  - Selected Agent dashboard.
  - Run History and Quality Inspector.
  - Timeline and Setup Health.
- `/traces`:
  - Session selector grouped by agent/framework.
  - Expandable trace groups for Lifecycle, Model, Commands & Tools, Files & Verification, Feedback.
  - Event payload disclosure for metadata-level debugging.

Future cloud product layout:

- `/agents`: portfolio overview.
- `/agents/:agentId`: agent dashboard and history.
- `/agents/:agentId/runs/:runId`: full run trace.
- `/recommendations`: cross-agent optimization queue.
- `/settings/integrations`: Claude Code, Codex, OpenClaw, Hermes setup.

## Data Model For v0.2

v0.2 does not need a new backend table for agents. The UI can derive agents from sessions:

- `agent_id`: current framework name for local alpha.
- `display_name`: Claude Code, Codex, OpenClaw, Hermes, or Custom.
- `sessions`: all sessions matching framework.
- `status`: connected if there is setup health OK or at least one recent session; otherwise needs setup.
- `metrics`: derived from session quality and recommendation data.

This keeps the product useful without blocking on identity/auth or cloud sync.

## Bilingual Behavior

The UI supports Chinese and English with a client-side language toggle.

Default for the local alpha is Chinese because the current product exploration and feedback loop are Chinese-first. English remains one click away for North America market demos.

## Visual Direction

Use the CozeLoop-style operational dashboard pattern:

- Light canvas.
- Narrow left rail.
- Top breadcrumb bar.
- Dense but readable metric cards.
- Large chart panels.
- Tables and inspector panels below.

RunQ should not look like a marketing page. It should look like a professional engineering console.

## v0.2 Acceptance Criteria

- First viewport shows connected/supported agents before individual run details.
- Selecting an agent filters metrics, run history, quality inspector, and timeline to that agent.
- The page supports Chinese and English.
- The Run Inbox still exposes setup health, run search, event search, event type filtering, quality score, recommendations, and raw metadata payloads.
- Existing API contracts remain unchanged.
- `npm test`, `npm run build`, and `npm run release-check` pass.

## v0.3 Extensions

- Real agent identity instead of framework-as-agent.
- Per-agent setup wizard and connection status.
- Cross-agent recommendation queue.
- Team/project grouping.
- Cloud-safe sync boundary for metadata-only reports.
