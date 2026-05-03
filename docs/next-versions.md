# Next Versions

## v0.2.0: Better Session Capture

- Add Codex hook fixture coverage as official docs stabilize.
- Harden OpenClaw hook fixture coverage against real plugin payloads.
- Add PermissionRequest support for Claude Code.
- Add FileChanged support for Claude Code.
- Add `events` CLI command for timeline inspection.
- Add redaction policy file.

## v0.3.0: Product Harnesses

- Add a real OpenClaw plugin reporter that batches hook events asynchronously.
- Add Hermes harness coverage once its hook/event shape is confirmed.
- Add satisfaction labels to harness output: accepted, corrected, abandoned, rerun.
- Add golden quality snapshots so scoring changes require explicit review.

## v0.4.0: Repo Readiness

- Detect missing AGENTS.md / CLAUDE.md / Codex instructions.
- Suggest test command documentation.
- Add repo-level aggregate scoring.
- Add recommendation acceptance/dismissal events.

## v0.5.0: OpenClaw And Hermes

- Add native observer interface examples.
- Add Hermes adapter.
- Support explicit model/tool/retriever spans from frameworks.

## v0.6.0: Team Metadata Sync

- Define cloud-syncable metadata payload.
- Add local export upload boundary.
- Add team weekly report prototype.
