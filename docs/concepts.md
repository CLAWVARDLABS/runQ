# RunQ Concepts

RunQ is an open protocol and local collector for agent run quality. It is designed around the full agent run, not only the LLM call.

## Mental Model

An agent run moves through a few layers:

1. A user asks for work.
2. The agent calls models, tools, MCP servers, skills, commands, and files.
3. The agent or environment verifies some of the work.
4. RunQ stores structured metadata-first events.
5. RunQ derives workflow nodes, run summaries, trust scores, and recommendations.

The raw event stream is evidence. The UI is an explanation layer over that evidence.

## Update Model

Agent hooks write events to the local database immediately when the runtime emits lifecycle, prompt, model, tool, command, file, or feedback signals.

RunQ derives session metrics from those events. The local alpha stores a `session_metrics` cache keyed by `session_id`, `event_count`, and `last_event_at`; if a session has not changed, the UI can reuse cached Trust Score, recommendations, satisfaction, and telemetry. When a new event arrives, the next `/api/sessions` read recomputes that session and refreshes the cache.

The web console auto-refreshes session lists every 10 seconds and the selected session's event timeline every 3 seconds while the tab is visible. Manual refresh still reloads both sessions and the selected event timeline.

## Session

A `session` is a continuous interaction with an agent runtime.

Examples:

- one Claude Code conversation
- one Codex task session
- one OpenClaw session JSONL
- one Hermes-compatible hook stream

A session can contain one or more tasks.

## Task

A `task` is a goal-directed unit of work inside a session.

In the current local alpha, RunQ derives tasks primarily from `user.prompt.submitted` events. If a session only has one prompt, the session usually has one task.

Future protocol versions may include explicit task boundaries.

## Event

An `event` is a raw telemetry record.

Common event types:

- `session.started`
- `user.prompt.submitted`
- `model.call.started`
- `model.call.ended`
- `tool.call.started`
- `tool.call.ended`
- `command.started`
- `command.ended`
- `permission.requested`
- `permission.resolved`
- `file.changed`
- `git.diff.summarized`
- `outcome.scored`
- `satisfaction.recorded`
- `recommendation.generated`
- `recommendation.accepted`
- `recommendation.dismissed`

Events are stored as evidence and should be safe to inspect locally after redaction.

## Workflow Node

A `workflow node` is a visualized step derived from raw events.

For example:

- `user.prompt.submitted` becomes `User requirement`
- `model.call.ended` becomes a model node
- `tool.call.ended` becomes a tool, MCP, or skill node
- `command.ended` with `is_verification: true` becomes a test/check node
- `file.changed` becomes a file node
- `satisfaction.recorded` becomes an outcome node

Raw events and workflow nodes are different counts. Raw events preserve evidence. Workflow nodes make the task readable.

## Run Summary

The Run Summary is a deterministic explanation generated from structured events.

It currently summarizes:

- user request
- RunQ Trust Score
- verification result
- tool/MCP/skill call footprint
- execution path

It is not an LLM-generated narrative. That keeps local alpha behavior reproducible and easier to trust.

## RunQ Trust Score

RunQ Trust Score is RunQ's estimate of whether the run likely held up. It is derived from the trace, not from user satisfaction alone.

It is influenced by signals such as:

- verification passing or failing
- verified recovery after an earlier failure
- file changes without verification
- repeated command failures
- satisfaction labels when available
- permission friction
- loop risk

The legacy `outcome_confidence` field remains available for compatibility. New UI surfaces prefer `trust_score`.

Trust Score is not the same as user satisfaction. Satisfaction is recorded separately so RunQ can compare predicted quality with human or evaluator judgment.

## Trust Breakdown

RunQ currently explains the score with six dimensions:

- Evidence Strength: how much usable telemetry exists.
- Verification Strength: whether checks passed, failed, or recovered.
- Execution Quality: whether the run avoided repeated failures and completed cleanly.
- Autonomy Reliability: whether permission friction, reruns, or abandonment undermined the run.
- Cost Discipline: whether token/cost metadata looks efficient enough to trust operationally.
- Risk Exposure: the observed downside risk, such as unverified changes or failed final checks.

Every score should be explainable from evidence events.

## Recommendation

A recommendation is an evidence-backed workflow improvement.

Examples:

- run targeted verification earlier
- avoid repeated failing commands
- add repository instructions
- reduce approval friction
- break oversized tasks into smaller runs

Recommendations can be accepted or dismissed. Decisions are stored as events so later runs can verify whether the accepted change helped.

## Call Footprint

The call footprint summarizes external capabilities used by the agent:

- normal tools, such as `web_search`
- MCP tools, such as `notion_search`
- skills, such as `clawvard-asvp`

The footprint helps reviewers understand how the agent reached the result.

## Privacy Levels

RunQ uses metadata-first local telemetry.

Privacy levels:

- `metadata`: safe structured metadata
- `summary`: derived summary that may contain limited project context
- `sensitive`: raw prompts, command output, diffs, or source snippets
- `secret`: detected credential material

By default, sensitive fields are redacted before persistence. Adapters should preserve hashes, lengths, binary names, exit codes, durations, and verification flags so scoring still works without raw private content.

## How To Read A Trace

Start with the Run Summary:

1. Check RunQ Trust Score and verification result.
2. Read the call footprint to see which capabilities were used.
3. Inspect the workflow graph for the execution path.
4. Click a node to inspect the underlying event payload.
5. Review recommendations if confidence is low or the run needed correction.

This path is designed for developers, reviewers, and managers who need to decide whether an agent result can be trusted.
