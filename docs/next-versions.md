# Next Versions

## v0.2.0: Better Session Capture

Status: implemented for local alpha; needs real-session tuning.

- Harden OpenClaw reporter coverage against real plugin payloads.
- Add OpenClaw tool row import into command timeline events.
- Add Run Inbox timeline filtering and event search.
- Add Run Inbox run search and status filters.
- Add default local redaction for prompts, command strings, command output, and secret-looking strings.
- Add setup health remediation hints for Claude Code, Codex, OpenClaw, and Hermes.
- Add setup health checks for Claude Code, Codex, OpenClaw, and Hermes.

## v0.3.0: Capture Depth

- Add a native OpenClaw plugin reporter that batches hook events asynchronously.
- Add richer Claude Code permission and file-change hook coverage as stable hook payloads are confirmed.
- Add Codex fixtures as public hook contracts stabilize.
- Add Hermes harness coverage once its hook/event shape is confirmed.
- Add richer satisfaction labels: corrected, rerun, escalated.
- Add golden quality snapshots for real imported sessions.

## v0.4.0: Repo Readiness

- Detect missing AGENTS.md / CLAUDE.md / Codex instructions.
- Suggest test command documentation.
- Add repo-level aggregate scoring.
- Add recommendation acceptance/dismissal events.

## v0.5.0: OpenClaw And Hermes

- Add native observer interface examples.
- Support explicit model/tool/retriever spans from frameworks.

## v0.6.0: Team Metadata Sync

- Define cloud-syncable metadata payload.
- Add local export upload boundary.
- Add team weekly report prototype.
