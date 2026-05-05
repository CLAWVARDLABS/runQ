# RunQ Product & UI Design Brief

Last updated: 2026-05-05

## 1. Product Positioning

RunQ is an agent experience observability product for modern coding agents.

It is built for developers, founders, and engineering teams using general-purpose agents such as Claude Code, Codex, OpenClaw, and Hermes. These agents do not only call LLM APIs. They read files, edit code, run commands, execute tests, ask for permissions, hit loops, consume tokens, and produce outcomes that users either accept, correct, rerun, abandon, or escalate.

RunQ observes that full agent run, scores the quality of the outcome, captures satisfaction signals, and turns trace evidence into actionable recommendations.

RunQ is not:

- A generic LLM prompt tracing dashboard.
- A classic APM product for backend services.
- A toy agent framework monitor.
- A cloud-only team analytics tool.

RunQ should feel like:

- Datadog for local and autonomous coding agents.
- Linear-quality product polish applied to agent reliability.
- A local-first command center for understanding whether agents are actually helping.

## 2. Core Product Promise

RunQ answers five questions quickly:

1. Which agents are connected?
2. Which agents are producing good or bad runs?
3. What happened inside a specific run?
4. Was the user satisfied with the result?
5. What should be changed to improve the next run?

The product should always connect observation to improvement. Trace data without recommendations is not enough. Recommendations without trace evidence are not credible.

## 3. Target Users

### Individual Power Users

Developers using Claude Code, Codex, OpenClaw, Hermes, Cursor-like agents, or custom terminal agents every day.

Their goals:

- Understand why an agent failed.
- Compare agents across the same repo or task type.
- Find loops, wasted commands, missing verification, and bad instructions.
- Improve local agent configuration.

### Engineering Teams

Small teams adopting coding agents for real work.

Their goals:

- Understand agent quality across repos and workflows.
- Measure accepted vs corrected vs abandoned runs.
- Build a repeatable evaluation and improvement loop.
- Avoid sending sensitive raw code or prompts to a cloud service.

### Agent Framework Builders

Builders of OpenClaw-like or Hermes-like agent frameworks.

Their goals:

- Provide first-class observability to users.
- Debug framework behavior from real sessions.
- Standardize reporting events.

## 4. Product Principles

### Agent First

The first screen should show monitored agents, not raw logs. Users think in terms of “How is Claude Code doing?” or “Is OpenClaw reliable?” before they think in individual event rows.

### Evidence First

Every score and recommendation should be explainable by trace evidence: command failures, missing tests, repeated retries, final satisfaction, token use, or file changes.

### Local First

RunQ must work locally with metadata-first capture. The UI should reinforce that the product can be useful without uploading raw prompts, source code, or command output.

### Quality Over Volume

The product should not look like a log dump. It should prioritize confidence, risk, satisfaction, and recommended action.

### Calm Engineering Tool

The visual design should feel focused, precise, and professional. Avoid marketing hero treatment, decorative gradients, giant cards, and over-saturated purple.

## 5. Core User Flow

### Default Flow

1. User opens RunQ.
2. User sees an Agent Overview page.
3. User selects an agent: Claude Code, Codex, OpenClaw, Hermes, or Custom.
4. User sees that agent’s run quality dashboard.
5. User opens a run/session.
6. User expands trace groups: lifecycle, model, commands/tools, files/verification, feedback.
7. User checks quality score, satisfaction label, and evidence.
8. User accepts a recommendation or changes configuration outside RunQ.
9. Future runs show whether quality improved.

### Setup Flow

1. User opens Setup.
2. User sees supported agent integrations.
3. Each integration shows hook/reporter status.
4. User copies or runs a setup command.
5. RunQ verifies events are arriving.
6. Agent status changes from “Needs setup” to “Connected”.

### Evaluation Flow

1. User opens Evaluations.
2. User sees task suites or recent evaluation runs.
3. User compares agents by pass rate, satisfaction, confidence, and regression trend.
4. User opens failed cases and sees linked traces.

## 6. Information Architecture

Recommended left navigation:

- Agents
- Sessions
- Traces
- Evaluations
- Recommendations
- Setup
- Settings

The left navigation is the only global module switcher. The top bar should not repeat these module links; it should show the product name, current page or agent context, search, refresh, notifications, language switching, and future workspace utilities.

### Agents

The main home page. It shows the monitored agent fleet and high-level quality.

### Sessions

A filterable list of runs. This is for operators who want to find specific runs by status, agent, repo, time, satisfaction, or risk.

### Traces

A visual run explorer. It shows grouped events and payload detail.

### Evaluations

A structured benchmark and regression area. It should eventually support task suites and historical comparison.

### Recommendations

A cross-agent optimization queue. It turns observations into action items.

### Setup

Integration and health page for Claude Code, Codex, OpenClaw, Hermes, and custom reporters.

### Settings

Workspace, privacy, retention, language, theme, and data export controls.

## 7. Page Requirements

## 7.1 Agents Page

Purpose: answer “What agents are being observed, and which ones need attention?”

Primary modules:

- Header with product name, current page context, search, language switcher, refresh, and notification controls.
- Agent fleet summary.
- Agent cards.
- Cross-agent quality overview.
- Product module shortcuts.

Agent card fields:

- Agent name.
- Agent type/framework.
- Connection status.
- Last seen.
- Total sessions.
- Average outcome confidence.
- Failed or abandoned rate.
- Recommendation count.
- Setup status.

Agent card states:

- Connected and healthy.
- Connected with issues.
- Needs setup.
- No data yet.

Design notes:

- Agent cards should be compact and scannable.
- Avoid oversized empty cards.
- Prefer a horizontal metric strip or dense card layout.
- The active selected agent should be visually clear but not aggressively purple.
- Empty agents should look like setup opportunities, not broken data.

## 7.2 Agent Detail / Sessions Page

Purpose: answer “How has this agent been performing recently?”

Primary modules:

- Agent selector or selected agent header.
- Metric cards.
- Token/cost chart.
- Confidence/reliability trend.
- Run history table.
- Quality inspector for selected run.

Key metrics:

- Run count.
- Failure/abandon rate.
- Average outcome confidence.
- Recommendation count.
- Total tokens.
- Input tokens.
- Output tokens.
- Command count.
- Verification count.
- Satisfaction distribution.

Run table fields:

- Session ID.
- Agent/framework.
- Started or last event time.
- Event count.
- Outcome confidence.
- Satisfaction label.
- Verdict.
- Recommendation count.

Important interactions:

- Filter by all / needs review / accepted / failed.
- Search by session ID, agent, satisfaction, reasons, recommendation.
- Select a run and update inspector.

## 7.3 Traces Page

Purpose: answer “What actually happened inside this run?”

Trace groups:

- Lifecycle: session started, prompt submitted, session ended.
- Model: model calls, agent steps, token usage.
- Commands & Tools: shell commands, tool calls, exit codes.
- Files & Verification: file changes, diffs, tests, build, lint.
- Feedback: satisfaction, user correction, recommendation events.
- Other: unknown or custom events.

Trace event row should show:

- Event type.
- Timestamp.
- Source.
- Privacy level.
- Human-readable summary.
- Expandable metadata payload.

Side panel should show:

- Selected session ID.
- Framework.
- Model calls.
- Commands.
- Verification count.
- Token count.
- Outcome confidence.
- Satisfaction.

Design notes:

- This page can be denser than Agents.
- Use an evidence timeline, not a generic log table.
- Event payload should be hidden by default but easy to inspect.
- Failed command/test events should be visually obvious.

## 7.4 Evaluations Page

Purpose: answer “How do agents perform against repeatable tasks?”

Near-term version:

- Show recent harness/evaluation scenarios.
- Show pass/fail, outcome confidence, satisfaction, command statuses.
- Link each evaluation run to trace.

Future version:

- Task suite management.
- Agent comparison matrix.
- Regression trend.
- Evaluation schedule.
- Golden result comparison.

Key metrics:

- Pass rate.
- Average confidence.
- Failed verification rate.
- Recovery rate.
- Abandoned rate.
- Recommendation categories triggered.

## 7.5 Recommendations Page

Purpose: answer “What should I change to improve future agent runs?”

Recommendation categories:

- Verification strategy.
- Loop prevention.
- Repo instructions.
- Permission allowlist.
- Workspace targeting.
- Feedback follow-up.
- Cost/token efficiency.

Recommendation card fields:

- Category.
- Title.
- Summary.
- Suggested action.
- Evidence events.
- Impact estimate.
- Affected agent.
- Affected sessions.
- Status: new, accepted, ignored, resolved.

Design notes:

- This page should feel like an optimization queue, not a blog.
- Recommendations must link back to trace evidence.
- The user should understand why the suggestion exists.

## 7.6 Setup Page

Purpose: answer “Is RunQ receiving data from my agents?”

Integration cards:

- Claude Code.
- Codex.
- OpenClaw.
- Hermes.
- Custom reporter.

Each card should show:

- Status.
- Setup command.
- Last received event.
- Expected hook/reporter location.
- Privacy mode.
- Troubleshooting hints.

States:

- Ready.
- Missing.
- Misconfigured.
- Events stale.
- Manual setup available.

## 8. Metrics System

### Outcome Confidence

A score from 0 to 1 estimating whether the run likely completed successfully.

Signals:

- Passing verification after file changes.
- Final satisfaction accepted.
- Failed verification at end.
- Abandoned satisfaction.
- Repeated command failures.

### Satisfaction Label

A human or evaluator signal.

Suggested labels:

- Accepted.
- Corrected.
- Rerun.
- Abandoned.
- Escalated.
- Needs review.

### Verification Coverage

How well the run verified its changes.

Signals:

- Test command.
- Build command.
- Lint command.
- Verification passed.
- Verification failed.
- Code changed without verification.

### Rework Risk

Likelihood that the user will need to redo or fix the result.

Signals:

- Failed verification.
- Abandoned run.
- No verification after file changes.
- Low confidence.

### Loop Risk

Likelihood the agent is stuck repeating commands or actions.

Signals:

- Same command fails repeatedly.
- Similar error sequence.
- Long run with no successful progress.

### Permission Friction

How much the agent is slowed by approval prompts or blocked actions.

Signals:

- Repeated permission requests.
- Denied commands.
- Long wait between tool calls.

### Cost Efficiency

Whether the run consumed reasonable tokens and commands for the outcome.

Signals:

- Token usage.
- Model call count.
- Command count.
- Outcome confidence.
- Satisfaction.

## 9. Event Model Surface

The UI should assume sessions are built from metadata-first events.

Important event types:

- `session.started`
- `session.ended`
- `user.prompt.submitted`
- `model.call.started`
- `model.call.ended`
- `agent.step.started`
- `agent.step.ended`
- `command.started`
- `command.ended`
- `tool.call.started`
- `tool.call.ended`
- `file.changed`
- `git.diff.summarized`
- `test.started`
- `test.ended`
- `build.started`
- `build.ended`
- `lint.started`
- `lint.ended`
- `satisfaction.recorded`
- `recommendation.created`

Privacy levels:

- `metadata`: safe operational metadata only.
- `summary`: summarized content, no raw secrets.
- `content`: raw or near-raw content, should require explicit opt-in.

## 10. Visual Design Direction

### Desired Feeling

RunQ should feel like a modern engineering intelligence console:

- Calm.
- Precise.
- Trustworthy.
- Local-first.
- Evidence-driven.
- Not flashy.

### Avoid

- Huge empty cards.
- Too many nested cards.
- Decorative gradient blobs.
- Purple-only palette.
- Marketing hero sections.
- Generic SaaS dashboard templates.
- Log-table-first layouts.
- Overly playful icons.

### Prefer

- Dense but readable tables.
- Strong left navigation.
- Clear active page state.
- Compact metric cards.
- Evidence timeline.
- Small status chips.
- Subtle product mark.
- White or near-white canvas with restrained accents.
- Data-first hierarchy.

### Color Guidance

Use a neutral foundation:

- Canvas: near-white.
- Primary text: slate/near-black.
- Secondary text: gray.
- Borders: subtle gray.
- Main brand: dark ink or controlled violet/indigo.

Accent colors by meaning:

- Success: green.
- Warning: amber.
- Error: red.
- Model: cyan or blue.
- File/change: violet.
- Feedback: indigo.

Do not let violet dominate the full interface.

### Typography

Use a clean sans-serif such as Inter, Geist Sans, or system UI.

Recommended hierarchy:

- Page title: 24-28px, 600-700.
- Section title: 16-18px, 600.
- Card title: 14-16px, 600.
- Body: 14px.
- Metadata: 12-13px.
- Eyebrow: 11-12px, uppercase or semibold label.

Avoid oversized display type inside the product UI.

### Shape & Spacing

- Radius: 8px for most controls and cards.
- Large panels: 10-12px max.
- Buttons: 8px radius.
- Base spacing: 8px.
- Card padding: 16-20px.
- Page gutters: 24-32px.
- Avoid 24px radius pill-like enterprise SaaS look.

## 11. Logo Direction

Current temporary mark is not final.

Logo should communicate:

- Agent run.
- Trace/evidence.
- Quality signal.
- Local-first developer tool.

Possible directions:

1. Wordmark-first: `RunQ` with a small trace-node symbol.
2. Monogram: `RQ` built from a path/trace line.
3. Signal mark: a small route line ending in a check or pulse.
4. Bracket/terminal motif: subtle coding-agent context without looking like a generic terminal app.

Avoid:

- Plain `rq` text in a square.
- Robot face.
- Cloud-only symbolism.
- Heavy enterprise ops iconography.

## 12. Localization Requirements

Default language can be Chinese for current internal testing.

English must be first-class for North America demos.

Language switcher:

- Use globe icon.
- Show current language.
- Open a small dropdown.
- Options: 中文, English.
- Store preference locally.
- URL fallback: `?lang=zh` or `?lang=en`.

Do not translate raw technical identifiers:

- Session IDs.
- Event type strings.
- Framework IDs.
- Command names.
- File extensions.
- Raw payload keys.

Do translate:

- Navigation.
- Page titles.
- Empty states.
- Metric labels.
- Buttons.
- Help text.
- Recommendation UI labels.

## 13. Empty States

Empty states are important because early users may have no data yet.

### No agents connected

Message should direct user to Setup and show supported agents.

### Agent connected but no sessions

Show status, expected hook, and “waiting for first run.”

### No recommendations

Frame positively: “No evidence-backed recommendations yet.”

### No trace events

Show likely causes:

- Session has not reported events.
- Reporter not enabled.
- Database path mismatch.

## 14. MVP Scope for UI Design

Design these screens first:

1. Agents overview.
2. Agent detail / sessions page.
3. Trace explorer.
4. Setup page.

Secondary screens:

5. Recommendations queue.
6. Evaluations.
7. Settings.

The MVP does not need:

- Team auth.
- Billing.
- Cloud sync.
- Complex project hierarchy.
- Custom dashboard builder.

## 15. Design Deliverables Needed

Please provide:

- Desktop layout for all MVP screens.
- Mobile or narrow layout for Agents and Trace.
- Component library states.
- Logo/wordmark proposal.
- Color and typography tokens.
- Empty states.
- Language switcher.
- Agent card variants.
- Trace event variants.
- Recommendation card variants.

Useful component list:

- App shell.
- Sidebar nav.
- Top bar.
- Language dropdown.
- Agent card.
- Metric card.
- Trend chart panel.
- Run table row.
- Trace event row.
- Trace group accordion.
- Quality score panel.
- Recommendation card.
- Setup integration card.
- Status chip.
- Empty state.

## 16. Success Criteria

The redesigned UI is successful if a new user can answer these within 10 seconds:

- What is this product for?
- Which agents are connected?
- Which agent needs attention?
- Where do I click to inspect a run?
- Where do I see trace evidence?
- Where do I configure my agent hooks?

The product should feel credible enough for a North America developer demo while still supporting Chinese-first iteration.
