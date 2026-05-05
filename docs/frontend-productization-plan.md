# RunQ Frontend Productization Plan

Last updated: 2026-05-05

## Productization Gap Learned From Coze Loop

Coze Loop feels more productized because it is organized around a clear lifecycle:

- Prompt development: prompt list, playground, debugging, and versioning.
- Evaluation: datasets, evaluators, experiments, and experiment comparison.
- Observation: trace list, trace detail, feedback, annotations, and filters.
- Platform shell: auth, enterprise, space, tags, deployment, and docs.

RunQ should not copy Coze Loop's prompt-first model. RunQ's wedge is coding-agent observability for Claude Code, Codex, OpenClaw, Hermes, and similar local or autonomous engineering agents.

The product shell should therefore start from monitored agents, not raw traces.

## Target Information Architecture

The first productized RunQ console has six modules:

- Agents: the default landing view. Shows connected and supported agents first.
- Sessions: run history for the selected agent, with satisfaction and quality signals.
- Traces: expandable evidence timeline for a single session.
- Evaluations: task-suite quality loop using real verification and satisfaction data.
- Recommendations: optimization queue generated from observed runs.
- Setup: per-agent hook, reporter, privacy, and health status.

This keeps the product differentiated from Coze Loop while borrowing its lifecycle discipline.

## First User Flow

1. User opens RunQ and sees Agent Fleet.
2. User selects OpenClaw, Claude Code, Codex, or Hermes.
3. The console shows that agent's metrics, run history, and active recommendations.
4. User opens a session trace to inspect model calls, commands, file changes, verification, and feedback.
5. User uses recommendations and evaluation signals to improve the agent workflow.
6. Setup remains visible as an operational health panel, not a hidden settings page.

## Data Rules

The frontend must remain honest:

- Use real local session/event data when present.
- Show empty states when a signal is missing.
- Do not invent comparative deltas, fake dates, or fake QPS.
- Label derived metrics as local event-store metrics.
- Keep raw metadata payloads inspectable for debugging.

## Current v0.2 Frontend Changes

- The root path redirects to `/agents`.
- The sidebar navigates between real subpages: `/agents`, `/sessions`, `/traces`, `/evaluations`, `/recommendations`, and `/setup`.
- The top bar no longer duplicates module navigation. It shows `RunQ Console`, the current page context, and global tools such as search, refresh, notifications, and language switching.
- The first screen shows Agent Fleet before detailed charts.
- `/agents` is focused on the Agent Fleet and product module entry points.
- `/sessions` owns run history, metrics, charts, and the quality inspector.
- `/evaluations` owns evaluation-loop signals backed by current local data.
- `/recommendations` owns the optimization queue backed by observed sessions.
- `/setup` owns hook, reporter, privacy, and health checks.
- The Trace Explorer now uses a clearer product layout: Session List, Evidence timeline, and Span Detail.

## Recent Frontend Updates

- Added the `/agents/[agentId]` detail route that lands on the per-agent sessions dashboard.
- Agent Fleet cards now expose a `Details` link that opens the agent detail route.
- Consolidated product-shell navigation so the left sidebar is the only global module switcher and the top bar acts as a contextual utility bar.
- Trace Explorer Span Detail now follows a selected timeline event; clicking an event highlights it and updates the inspector. Tested via `initialSelectedEventId`.
- Recommendation cards now display a state badge (new / accepted / dismissed) and surface accept/dismiss buttons that POST to `/api/sessions/:sessionId/recommendations/:recommendationId/feedback`.

## Next Frontend Work

- Add `/agents/[id]/sessions` and `/agents/[id]/setup` subroutes so the agent detail experience grows beyond the dashboard.
- Add per-agent setup cards with copyable hook install commands.
- Add evaluation suite creation from real session traces.
- Extend recommendation state with `verified` once a follow-up verification confirms the suggested change.
- Add screenshots and a guided demo seed dataset for the README.
