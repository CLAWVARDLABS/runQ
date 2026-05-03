# Run Inbox UI v1

Status: Draft  
Target surface: local RunQ Run Inbox  
Reference style guide: `docs/design.md`

## Product Positioning

Run Inbox is a local workbench for coding-agent reliability. It should feel like a professional developer observability console, not a marketing page and not a generic chat history viewer.

The UI answers one primary question:

> Did this agent run actually work, and what should I change before the next run?

The first version should optimize for a solo developer running Claude Code, Codex, OpenClaw, or Hermes locally. Team and cloud dashboards come later.

## Design Direction

Use the HashiCorp-inspired system in `docs/design.md`, adapted from marketing canvas into product UI:

- Dark canvas as the app background.
- Charcoal surfaces for panels and rows.
- 1px translucent hairlines instead of heavy shadows.
- 8px radius for buttons, inputs, run rows, and timeline cards.
- Tight, engineered typography using Inter or system sans.
- Product-style accent colors repurposed as status semantics, not decoration.
- Dense information layout with clear hierarchy.

Do not use hero sections, decorative gradients, floating marketing cards, oversized illustrations, or one-note purple dashboard styling.

## Information Architecture

Run Inbox v1 uses a three-pane workbench:

1. Left pane: Run List
2. Center pane: Timeline
3. Right pane: Quality Inspector

This matches the workflow:

1. Pick a captured run.
2. Inspect what happened.
3. Understand the quality judgment and next action.

## Layout

### App Shell

The shell is full viewport height.

- Top bar: 56px height.
- Content area: `calc(100vh - 56px)`.
- Desktop grid: `360px minmax(520px, 1fr) 360px`.
- Tablet grid: `320px 1fr`, with inspector below timeline or as a collapsible drawer.
- Mobile grid: single column, with tabs for Runs, Timeline, and Quality.

### Top Bar

Purpose: establish product identity and local data context.

Content:

- Left: `RunQ` wordmark and `Run Inbox` label.
- Center: repo/workspace summary when available.
- Right: local DB path, event count, and refresh button.

Visual:

- Background: `{colors.canvas}`.
- Border bottom: `{colors.hairline}`.
- Height: 56px.
- Padding: 16px 20px.

## Pane 1: Run List

The run list is a scan-first index of captured sessions.

### Header

Content:

- Title: `Runs`
- Count: total sessions.
- Segmented filter: `All`, `Needs review`, `Accepted`, `Failed`.

The first version can render the filters as static controls if API support is not ready, but the layout should reserve space for them.

### Run Row

Each row is a clickable item with fixed structure:

- Primary line: short session id.
- Secondary line: framework, event count, last event time.
- Score pill: Outcome Confidence percentage.
- Satisfaction badge if present.
- Status markers:
  - Failed verification.
  - Repeated command failure.
  - Changes without verification.
  - High permission wait.

Visual states:

- Default: `{colors.surface-1}` with hairline border.
- Hover: `{colors.surface-2}`.
- Selected: left accent rail plus brighter border.

Accent mapping:

- High confidence: Nomad green.
- Medium confidence: Vault yellow.
- Low confidence: Consul red.
- Satisfaction accepted: Nomad green.
- Satisfaction corrected or rerun: Vault yellow.
- Satisfaction abandoned: Consul red.
- Unknown satisfaction: muted gray.

## Pane 2: Timeline

The timeline explains the run as a sequence of evidence.

### Header

Content:

- Selected session id.
- Framework badge.
- Duration if available.
- Event count.

### Timeline Event Card

Each event is a compact card, not a large JSON block by default.

Fields:

- Event icon or compact symbol.
- Event type label.
- Timestamp.
- Human summary.
- Privacy level chip.
- Expand control for raw payload.

Default event summaries:

- `user.prompt.submitted`: prompt summary and length.
- `model.call.started`: provider, model, prompt length, history count.
- `model.call.ended`: token usage and assistant summary hash or summary.
- `file.changed`: file extension, change kind, path hash.
- `command.started`: binary, verification flag.
- `command.ended`: binary, exit code, verification flag, duration.
- `permission.resolved`: decision, wait time, resource hash.
- `satisfaction.recorded`: label and signal.
- `recommendation.generated`: title and category.

### Timeline Visual Language

Use a thin vertical line with event cards attached to it.

Event accents:

- Model events: Waypoint cyan.
- File changes: Terraform purple.
- Commands: Vagrant blue.
- Passed verification: Nomad green.
- Failed verification or error: Consul red.
- Satisfaction: Terraform purple unless the label has stronger semantic color.

Raw payloads should use a compact monospace block only inside expanded cards.

## Pane 3: Quality Inspector

The inspector turns telemetry into product judgment.

### Quality Summary

Top section:

- Large Outcome Confidence percentage.
- One-line verdict:
  - `Likely completed`
  - `Needs review`
  - `Likely failed`
  - `Insufficient evidence`
- Reason chips.

Verdict rules:

- `>= 80%`: Likely completed.
- `50% to 79%`: Needs review.
- `< 50%`: Likely failed.
- No verification and no satisfaction: Insufficient evidence.

### Metrics

Show compact horizontal bars:

- Verification Coverage.
- Rework Risk.
- Permission Friction.
- Loop Risk.
- Cost Efficiency.

Bars should include value, label, and short evidence hint. Avoid gauges and circular charts for v1.

### Recommendations

Each recommendation card includes:

- Category.
- Title.
- Summary.
- Suggested action.
- Evidence event count.

Recommendation categories:

- `permission_policy`
- `verification_strategy`
- `repo_instruction`
- `loop_prevention`
- `cost_routing`

Visual:

- Surface 1 card.
- Category chip.
- Evidence count in muted text.
- Stronger border for high-confidence recommendations.

### Satisfaction

Show the latest `satisfaction.recorded` event if present.

Labels:

- `accepted`
- `corrected`
- `abandoned`
- `rerun`
- `unknown`

The UI must make clear that satisfaction is human or evaluator judgment, while Outcome Confidence is automated inference.

## Empty States

### No Sessions

Message:

`No runs captured yet. Configure a Claude Code, Codex, or OpenClaw hook to start collecting local run quality events.`

Actions:

- Show CLI snippet: `bash scripts/install-local.sh`.
- Show inbox command: `npm run inbox -- --db ~/.runq/runq.db --port 4545`.

### No Selected Run

Message:

`Select a run to inspect its timeline and quality signals.`

Show a small checklist:

- Prompt captured.
- Commands captured.
- Verification detected.
- Satisfaction recorded.

### No Recommendations

Message:

`No recommendations for this run. RunQ did not find an evidence-backed workflow improvement yet.`

## Interactions

### Selecting A Run

Clicking a run row:

- Loads `/api/sessions/:id/events`.
- Updates timeline.
- Updates inspector using the selected run quality and recommendations.
- Preserves selected state in the list.

### Expanding Payload

Each timeline card has an expand control.

Default:

- Show human summary.
- Hide raw payload.

Expanded:

- Show formatted JSON payload.
- Keep max height with scroll to avoid layout jumps.

### Refresh

The refresh button reloads sessions and the selected timeline. It should not clear selection if the session still exists.

### Keyboard

Minimum keyboard support:

- Up/down moves selected run.
- Enter selects run.
- Escape collapses expanded payload.

## Visual Tokens

Adapted from `docs/design.md`:

```css
:root {
  --canvas: #000000;
  --surface-1: #0f1115;
  --surface-2: #171a21;
  --surface-3: #20242c;
  --hairline: rgba(178, 182, 189, 0.14);
  --hairline-soft: rgba(178, 182, 189, 0.08);
  --ink: #ffffff;
  --ink-muted: #b2b6bd;
  --ink-subtle: #656a76;
  --accent-terraform: #7b42f6;
  --accent-vault: #ffd814;
  --accent-consul: #dc477d;
  --accent-waypoint: #14c6cb;
  --accent-vagrant: #1563ff;
  --accent-nomad: #00bc7f;
}
```

Use semantic colors sparingly. Most surfaces should remain black or charcoal.

## Typography

Use Inter or system sans:

- App title: 16px, 700, line-height 1.25.
- Pane title: 13px, 600, uppercase, letter spacing 0.04em.
- Run row title: 13px, 600.
- Body: 13px, 500, line-height 1.45.
- Meta: 12px, 500, line-height 1.35.
- Metric number: 28px, 700, line-height 1.1.
- Code payload: 12px, monospace, line-height 1.5.

Do not use viewport-scaled font sizes. Keep letter spacing at 0 except uppercase pane labels.

## Component Inventory

### Required Components

- `AppShell`
- `TopBar`
- `RunListPane`
- `RunRow`
- `TimelinePane`
- `TimelineEvent`
- `PayloadDisclosure`
- `QualityInspector`
- `MetricBar`
- `RecommendationCard`
- `SatisfactionBadge`
- `EmptyState`

In the current no-build server, these can be plain HTML/CSS/vanilla JS functions inside `apps/run-inbox/server.js`. If the UI grows beyond this v1, split static assets into separate files or move to a small frontend build.

## API Needs

Current API is enough for v1:

- `GET /api/sessions`
- `GET /api/sessions/:id/events`

Recommended small enhancement:

- Include latest `satisfaction.recorded` payload in each session returned from `/api/sessions`.
- Include derived verdict string in the frontend, not the API, for now.

## Implementation Boundary

Do for v1:

- Redesign HTML shell.
- Keep local-only behavior.
- Keep existing API routes.
- Add better derived frontend summaries.
- Add tests that assert the shell contains the three-pane structure and key labels.

Do not do for v1:

- Add authentication.
- Add cloud sync.
- Add charts requiring dependencies.
- Add a frontend build pipeline.
- Add editable recommendations.
- Add multi-user team analytics.

## Acceptance Criteria

- Run Inbox opens at `http://127.0.0.1:4545`.
- The UI uses a dark three-pane workbench.
- Empty state explains how to capture a run.
- Session rows show framework, event count, confidence, and recommendation status.
- Selecting a session shows a human-readable timeline.
- Raw payloads are hidden by default and expandable.
- Inspector shows quality score, metric bars, reasons, recommendations, and satisfaction.
- Existing API tests still pass.
- UI tests assert the presence of `Runs`, `Timeline`, `Quality`, and `Recommendations` regions.

## Future Extensions

- Golden screenshot tests for desktop and mobile.
- Framework-specific event icons.
- Search and filters.
- Session export button.
- Recommendation accept/dismiss actions.
- Team aggregate view.
- Cloud upload boundary for redacted bundles.
