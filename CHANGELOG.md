# Changelog

All notable changes to RunQ are documented here.

The project follows semantic versioning once it reaches `1.0`. Before `1.0`, minor versions may include protocol or schema changes.

## 0.2.0 - 2026-05-05

### Added

- `runq demo --db <path>` to generate a realistic local demo database for first-time Run Inbox evaluation without connecting an agent.
- Next.js Run Inbox product shell with agent-first navigation.
- Agent routes for sessions, evaluations, recommendations, and setup.
- Agent trace explorer with deep links from evaluation review queues.
- In-product documentation for users and integration developers.
- Recommendation feedback API and UI for accept/dismiss decisions with optional notes.
- Recommendation impact tracking for accepted recommendations and later follow-up runs.
- Notification center on the recommendations page and scoped notification links for agent pages.
- Mobile bottom navigation and browser coverage for mobile overflow.
- Playwright end-to-end suite for the primary local user flow.
- `runq doctor` stable `agent_id` values for supported agent setup checks.
- Public-preview readiness reporting and release-check coverage.
- Open source release metadata, support, security, conduct, and release process docs.

### Changed

- Top navigation now focuses on page context and utility actions while the sidebar owns global module navigation.
- Setup pages prefer stable agent identifiers over display-label matching.
- Run Inbox recommendation cards show persisted decision state, decision note, and follow-up verification status.

### Security

- Documented private vulnerability reporting and local metadata-first security scope.
- Added package `files` allowlist to keep npm package contents explicit.

### Known Limitations

- RunQ is local-only and does not provide authentication, cloud sync, or team workspaces.
- Node's built-in SQLite APIs still emit experimental warnings.
- The project needs more real local sessions before a broader developer preview.
