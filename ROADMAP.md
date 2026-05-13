# RunQ Roadmap

RunQ is in `0.2.x` local alpha. The project goal is to become an open protocol and local-first workbench for agent run quality.

This roadmap is directional, not a promise of dates.

## v0.3: Better Run Explanation

Focus: make a single agent run understandable and reviewable.

- Richer Run Summary with clearer request, plan, execution, verification, and outcome sections.
- Shareable or exportable Agent Run Report.
- Better workflow graph grouping for model, tool, MCP, skill, command, file, and verification steps.
- Stronger evidence links from scores and recommendations back to exact events.
- Improved demo walkthrough for first-time users.

Success criteria:

- A new user can inspect a demo trace and explain what happened without reading raw event JSON.
- A reviewer can decide whether a run is trustworthy from the report page.

## v0.4: Adapter Ecosystem

Focus: make it easy for agent authors to connect to RunQ.

- Clear adapter authoring guide.
- More fixture-driven adapter tests.
- Explicit task boundary events.
- Better support for generic tool, MCP, skill, and workflow runtimes.
- Import/export compatibility checks for third-party agent traces.

Success criteria:

- A new integration can produce a useful Run Summary with a small set of required events.
- Adapter contributors can add fixtures and tests without understanding the whole product UI.

## v0.5: Comparison And Improvement Loop

Focus: turn run traces into operational decisions.

- Agent comparison across reliability, verification, cost, and rework signals.
- Prompt/config/workflow before-and-after comparison.
- Recommendation impact analysis across follow-up runs.
- Better readiness and quality gates for real local sessions.
- Trend views for common failure modes.

Success criteria:

- A team can compare two agents or two workflows and identify which one is more reliable.
- Accepted recommendations show measurable follow-up impact.

## v0.6: Local-First Team Sync Design

Focus: prepare the commercial/team path without compromising local-first open source.

- Cloud-sync metadata envelope design.
- Team dashboard protocol draft.
- Audit/export format for run bundles.
- Privacy and redaction policy controls.
- Workspace-level agent reliability leaderboard.

Success criteria:

- Local users can keep all data local.
- Teams can evaluate a sync path that shares only intended metadata.

## v1.0: Stable Protocol

Focus: stabilize the protocol and compatibility guarantees.

- Stable event envelope.
- Stable core event taxonomy.
- Stable privacy levels and redaction expectations.
- Stable score and recommendation evidence contracts.
- Migration guide from pre-1.0 schemas.

Success criteria:

- Third-party agent runtimes can target RunQ without tracking every internal product change.
- Protocol-breaking changes require explicit versioning and migration notes.

## Ongoing Principles

- Local-first by default.
- Metadata-first privacy.
- Every score must cite evidence.
- Every recommendation must be actionable.
- Adapters should preserve useful quality metadata without storing raw private content.
- Product UI should explain agent work to humans, not merely display logs.
