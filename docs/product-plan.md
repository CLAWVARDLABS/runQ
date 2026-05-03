# RunQ Product Plan

Last updated: 2026-05-03

## Current Stage

RunQ is in local alpha. The product can capture, import, score, and inspect coding-agent runs locally. It is ready for controlled developer trials, but not yet a hosted team product.

## North Star

Help developers and teams answer: did this coding-agent run actually work, and what should we change to make the next run better?

## Active Milestones

### v0.1 Local Alpha

Status: in progress

Scope:

- Local RunQ event protocol.
- SQLite local collector.
- Claude Code, Codex, OpenClaw, and Hermes adapters.
- Run Inbox local workbench.
- OpenClaw session reporter.
- Agent Manager for product testing.
- Setup Health checks.

Exit criteria:

- A new user can clone the repo, run setup, connect one agent, and see a real run in Run Inbox within 10 minutes.
- `npm test`, `npm run build`, and `npm audit --omit=dev` pass.
- At least 5 real local agent sessions are captured without hand-editing event JSON.

### v0.2 Capture Quality

Status: planned

Scope:

- `runq doctor` remediation hints for failed checks.
- OpenClaw reporter support for richer real event rows.
- Claude Code permission and file-change hooks.
- Codex hook fixtures as public hook contracts stabilize.
- Timeline filtering and event search.
- Redaction policy file.

Exit criteria:

- 80 percent of imported real sessions produce a usable timeline.
- Setup Health explains every missing integration with an exact fix command.
- No raw prompts or command output are stored unless explicitly enabled.

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
- Satisfaction signals now affect outcome scoring.

## Current Risks

- OpenClaw reporter is file-based, not a native low-latency plugin.
- Hermes adapter uses a generic event shape until its hook contract is confirmed.
- Recommendations are deterministic rules, not yet a deeper optimization assistant.
- Run Inbox is local-only and has no auth, team workspace, or sync model.
- Docker Agent Manager still needs a daemon-backed verification run on a machine with Docker running.

## Operating Rules

- Every behavior change starts with a failing test.
- Product quality changes require golden snapshot updates.
- Local privacy remains the default: metadata-first, summaries and hashes instead of raw content.
- This file is the planning source of truth. Update it when scope, milestone status, or exit criteria change.
