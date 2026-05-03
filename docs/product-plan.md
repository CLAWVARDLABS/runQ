# RunQ Product Plan

Last updated: 2026-05-03

## Current Stage

RunQ is in local alpha. The product can capture, import, score, inspect, filter, and redact coding-agent runs locally. The v0.1/v0.2 alpha code path is ready for controlled developer trials, but the project is not yet a hosted team product.

## North Star

Help developers and teams answer: did this coding-agent run actually work, and what should we change to make the next run better?

## Active Milestones

### v0.1 Local Alpha

Status: code complete for local alpha; field validation pending

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

Status: code complete for alpha scope; needs real-session tuning

Scope:

- `runq doctor` remediation hints for failed checks.
- OpenClaw reporter support for richer real event rows.
- Claude Code and Codex hook initialization.
- Hermes adapter entrypoint.
- Timeline filtering and event search.
- Default local redaction policy.

Exit criteria:

- 80 percent of imported real sessions produce a usable timeline in the alpha test set.
- Setup Health explains every missing integration with an exact fix command.
- Raw prompts, command strings, command output, and secret-looking strings are redacted before storage unless an explicit future opt-in policy changes that behavior.

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

- Next.js + Tailwind Run Inbox.
- Agent Manager local and Docker-oriented harness.
- OpenClaw real-session import.
- OpenClaw reporter with once-only import state.
- Hermes minimal adapter.
- `runq init claude-code`.
- `runq init codex`.
- `runq doctor`.
- Setup Health panel in Run Inbox.
- Run Inbox run search, status filters, event search, and event-type filtering.
- Default collector redaction.
- OpenClaw `tool_call` and `tool_result` rows become command timeline events.
- Satisfaction signals now affect outcome scoring.

## Latest Verification

On 2026-05-03:

- `npm test` passed with 59 tests.
- `npm run build` passed.
- `npm audit --omit=dev` found 0 vulnerabilities.
- Agent Manager local mode generated and ingested 2 product-test sessions.
- OpenClaw reporter one-shot imported 3 local OpenClaw session files into RunQ.

## Current Risks

- OpenClaw reporter is file-based, not a native low-latency plugin.
- Hermes adapter uses a generic event shape until its hook contract is confirmed.
- Recommendations are deterministic rules, not yet a deeper optimization assistant.
- Run Inbox is local-only and has no auth, team workspace, or sync model.
- The v0.1/v0.2 code path still needs at least 5 fresh real local sessions to validate the 80 percent usable-timeline target.

## Operating Rules

- Every behavior change starts with a failing test.
- Product quality changes require golden snapshot updates.
- Local privacy remains the default: metadata-first, summaries and hashes instead of raw content.
- This file is the planning source of truth. Update it when scope, milestone status, or exit criteria change.
