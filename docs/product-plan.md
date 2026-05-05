# RunQ Product Plan

Last updated: 2026-05-05

## Current Stage

RunQ is in v0.2 local alpha complete. The product can capture, import, score, inspect, filter, redact, readiness-check, harness-test, browser-test, and release-check coding-agent runs locally. The v0.2 alpha code path is ready for open source local-alpha release, but the project is not yet a hosted team product or broad developer preview.

## North Star

Help developers and teams answer: did this coding-agent run actually work, and what should we change to make the next run better?

## Active Milestones

### v0.1 Local Alpha

Status: completed for local alpha

Scope:

- Local RunQ event protocol.
- SQLite local collector.
- Claude Code, Codex, OpenClaw, and Hermes adapters.
- Run Inbox local workbench.
- OpenClaw session reporter.
- Agent Manager for product testing.
- Setup Health checks.
- `runq doctor` remediation hints.

Exit criteria:

- A new user can clone the repo, run setup, connect one agent, and see a real run in Run Inbox within 10 minutes.
- `npm test`, `npm run build`, and `npm audit --omit=dev` pass.
- At least 5 real local agent sessions are captured without hand-editing event JSON.

### v0.2 Capture Quality

Status: completed for local alpha; real-session tuning continues after v0.2

Scope:

- `runq doctor` remediation hints for failed checks.
- OpenClaw reporter support for richer real event rows.
- Claude Code and Codex hook initialization.
- Hermes adapter entrypoint.
- Timeline filtering and event search.
- Default local redaction policy.
- Readiness report for public-preview criteria.
- Richer satisfaction labels: corrected, rerun, escalated.
- Feedback recommendations for correction, rerun, and escalation outcomes.
- ARQ Agent Run Quality standard draft.
- Deterministic coding-task harness with real failing-then-passing verification.
- v0.2 release check that runs OpenClaw success/failure and coding-task recovery product scenarios.

Exit criteria:

- 80 percent of imported real sessions produce a usable timeline in the alpha test set.
- Setup Health explains every missing integration with an exact fix command.
- Raw prompts, command strings, command output, and secret-looking strings are redacted before storage unless an explicit future opt-in policy changes that behavior.
- `runq readiness` reports session count, usable timeline percentage, framework coverage, and secret-like payload findings.
- A local harness can prove that a coding task with an early failed test and later passing verification is scored as recovered work.
- `npm run release-check` exits successfully and produces a machine-readable acceptance report.

### v0.3 Team Boundary

Status: planned

Scope:

- Define cloud-syncable metadata envelope.
- Keep sensitive payloads local by default.
- Add export/upload boundary for team reports.
- Prototype weekly team reliability report.

Exit criteria:

- A team can share aggregate quality metrics without uploading raw prompts, file contents, command output, or secrets.

## Recently Completed

- Open source release readiness files: changelog, security policy, support guide, code of conduct, release process, GitHub issue templates, PR template, and CI workflow.
- Package metadata for repository, issues, homepage, keywords, and explicit npm package file allowlist.
- Playwright E2E coverage for the primary Agent -> Sessions -> Evaluations -> Traces -> Recommendations -> Setup -> Docs user flow.
- Recommendation feedback notes in the Run Inbox UI and feedback API flow.
- Notification center and scoped notification links for agent pages.
- Mobile bottom navigation and browser coverage for mobile overflow.
- Next.js + Tailwind Run Inbox.
- Agent Manager local and Docker-oriented harness.
- OpenClaw real-session import.
- OpenClaw reporter with once-only import state.
- OpenClaw native plugin installer via `runq init openclaw`.
- Hermes minimal adapter.
- Hermes hook manifest installer via `runq init hermes`.
- `runq init claude-code`.
- `runq init codex`.
- `runq init all` for Claude Code, Codex, OpenClaw, and Hermes.
- `runq doctor`.
- Setup Health panel in Run Inbox.
- Run Inbox run search, status filters, event search, and event-type filtering.
- Default collector redaction.
- OpenClaw `tool_call` and `tool_result` rows become command timeline events.
- Satisfaction signals now affect outcome scoring.
- Rich satisfaction labels now include accepted, abandoned, needs_review, corrected, rerun, and escalated.
- Feedback recommendations now identify manual correction capture, rerun/task sizing, and escalation policy opportunities.
- `runq readiness` summarizes public-preview readiness criteria.
- `docs/arq-standard.md` defines RunQ's coding-agent quality semantics.
- Coding-task harness creates a small repo, observes a failing verification, applies a bugfix, observes a passing verification, and stores the timeline.
- `npm run release-check` validates the v0.2 local-alpha product contract end to end.
- Recommendation acceptance/dismissal events: `runq accept-recommendation` and `runq dismiss-recommendation` CLI commands and the Run Inbox `/api/sessions/:sessionId/recommendations/:recommendationId/feedback` endpoint write `recommendation.accepted` / `recommendation.dismissed` events. Recommendation cards in the Run Inbox now show new / accepted / dismissed state and the decision note.

## Latest Verification

On 2026-05-05:

- `npm test` passed with 104 tests.
- `npm run build` passed.
- `npm run test:e2e` passed with 2 browser tests.
- Open source release packaging and audit are part of the v0.2 release gate in `RELEASE.md`.

On 2026-05-03:

- `npm test` passed with 81 tests.
- `npm run build` passed.
- `npm audit --omit=dev` found 0 vulnerabilities.
- Coding-task harness recorded a real failing-then-passing bugfix timeline with outcome confidence 0.9 and no follow-up recommendations after recovery.
- `runq readiness --db .runq/coding-task-recheck.db --json` reported 1 usable timeline out of 1 session and 0 redaction findings.
- `npm run release-check` passed with 3 local product scenarios, 100 percent usable timeline coverage, and 0 redaction findings.
- Agent Manager local mode generated and ingested 2 product-test sessions.
- OpenClaw reporter one-shot imported 3 local OpenClaw session files into RunQ.
- Real OpenClaw eval `runq-eval-bugfix-20260503` exposed a workspace-targeting failure: OpenClaw ran in its own workspace, explored broadly for 600 seconds, made no useful code change, and timed out. RunQ now imports the full 157-event timeline and emits a workspace-targeting recommendation.
- Docker OpenClaw E2E now runs against latest OpenClaw `2026.5.2` with an OpenAI-compatible provider and captures two model-call pairs plus one `exec` command start/end pair through the native RunQ plugin.

## Current Risks

- OpenClaw native reporter is now installable and validated in Docker against latest OpenClaw for model calls and one command timeline. It still needs more tool-call-heavy real coding sessions to validate file edit/read timelines and richer recommendations.
- The coding-task harness is deterministic, not yet driven by a live OpenClaw code-editing session.
- Hermes adapter uses a generic event shape until its hook contract is confirmed.
- Recommendations are deterministic rules, not yet a deeper optimization assistant.
- Run Inbox is local-only and has no auth, team workspace, or sync model.
- The v0.2 code path still needs at least 5 fresh real local sessions to validate the 80 percent usable-timeline target, and 50 total real sessions before public developer preview.

## Operating Rules

- Every behavior change starts with a failing test.
- Product quality changes require golden snapshot updates.
- Local privacy remains the default: metadata-first, summaries and hashes instead of raw content.
- This file is the planning source of truth. Update it when scope, milestone status, or exit criteria change.
