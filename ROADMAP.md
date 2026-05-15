# RunQ Roadmap

> This document is the authoritative source for "what is RunQ, what are we building next,
> and what are we deliberately not building". Every PR should be reference-able against it.
> Last updated: 2026-05.

## Positioning

**RunQ is observability for humans using AI agents to get work done.**

We measure the *human ↔ agent* loop — what you asked, how the agent responded, whether you
got the outcome you wanted — across the four CLI agents we support today
(Claude Code, Codex, OpenClaw, Hermes). Everything stays on your machine. Free forever
for individuals; paid tiers for teams and enterprises (later).

We are **not**:

- **LangSmith / Langfuse / Arize** — those observe the *agent app ↔ LLM* loop and serve
  the developers building agents. Their data model (chain/llm/tool spans on their cloud)
  is the wrong shape for our user.
- **Pendo Agent Analytics** — observes end-users using AI features inside your product;
  serves PMs and customer-success teams. We don't.
- **A LangChain wrapper** — we hook in at the agent runtime layer, no SDK to install.
- **A multi-modal playground / prompt hub / agent IDE** — out of scope.

## What we're focused on right now

**CLI agents only.** The four we already support are enough surface area for the next two
quarters. We are deliberately not chasing Cursor / Cline / Continue / Claude Desktop /
ChatGPT Desktop until the CLI experience is excellent and we have validated demand.

Why CLI-first:

- Hook-based capture is reliable (files + stdin, no Electron/IDE state reverse-engineering)
- CLI users are technical early adopters, the right audience for OSS
- Adapter maintenance cost stays bounded
- The CLI agent space is **growing fast** — Claude Code GA, Codex back, new tools weekly

## 6-week execution plan

Each row below is a self-contained release. Verification = unit tests + manual walkthrough
on the maintainer's own `~/.claude` and `~/.codex` history (a corpus of ~1800 real sessions).

| Week | Theme | Deliverable | Critical files |
|---|---|---|---|
| **1–2** | Scoring tiered | Split `src/scoring.js` into `src/scoring/universal.js` (prompt_repeat, prompt_revision, inter_prompt_pause, session_close_kind, acknowledge_signal — applies to all agents) and `src/scoring/domains/{coding,conversation}.js` (coding-specific verification/exit_code stays here). Orchestrator picks domain based on framework. Backward-compatible `scoreRun` export. | `src/scoring/`, `src/agent-profiles.js` (new) |
| **3** | Adapter depth | Audit each existing importer + hook for missing event coverage. Claude Code: emit subagent traces from the `Task` tool. Codex: emit `reasoning` items, `turn_context` model switches, cwd changes. OpenClaw/Hermes: confirm every messages column is consumed. | `src/importers/*`, `adapters/*/normalize.js` |
| **4** | Compare two runs | New `/compare?a=<id>&b=<id>` page rendering both trace trees side-by-side. Common prefix collapsed, divergence highlighted in red. Diff summary header (tool counts, verification status, durations). Reuse existing `buildActionTree` / `TaskWorkflowCanvas`. | `app/compare/page.js` (new), `components/run-inbox/RunCompare.js` (new) |
| **5** | Flaky prompt detection | Cluster sessions by `prompt_hash`; flag clusters with high `trust_score` variance as "flaky prompts". New tile in health-report + dedicated `/flaky` view listing each flaky prompt with success/fail counts and links to individual runs. | `src/flaky.js` (new), `components/run-inbox/RunInboxApp.js` |
| **6a** | `runq replay` MVP | CLI `runq replay <session_id> [--prompt-file new.txt] [--model X]` spawns a headless Claude Code or Codex with the original prompt + cwd, captures the new run into RunQ as a child of the original (`replayed_from: <id>`). Only the two agents with headless CLI; OpenClaw/Hermes later. | `src/cli.js`, `src/replay.js` (new), `adapters/claude-code/spawn.js`, `adapters/codex/spawn.js` |
| **6b** | Productivity dashboard | New `/productivity` page powered entirely by the universal-layer signals from Week 1–2. Today/week aggregate of: total session time, prompt count, retry rate, abandonment rate, top frustration prompts. Works for all four CLI agents without coding-specific assumptions. | `app/productivity/page.js` (new), `src/productivity.js` (new) |

## Foundational architecture changes (now)

Two refactors should land **before** the weekly plan if not at the same time, because
everything else benefits:

1. **`src/scoring/` directory replaces `src/scoring.js`** — see Week 1–2. Universal layer
   first, domains second.
2. **`src/agent-profiles.js`** — promote `framework` from a stringly-typed enum into a
   registered profile (`id`, `category: coding|conversation|task`, `display_name`, `icon`,
   `gradient`, `default_scoring_domain`, `event_capture_strategy`). Adapters register their
   profile; scoring picks the right domain automatically; UI reads `category` for word choice
   (Trust Score vs Effectiveness). Adding a 5th adapter later becomes a one-file change.

## What we are explicitly **not** building

- ❌ Cloud SaaS (data leaving the device — that's the LangSmith / Pendo path, breaks our moat)
- ❌ Cursor / Cline / Continue / Claude Desktop / ChatGPT Desktop adapters
  (reconsider after CLI version has paying users and proves demand)
- ❌ Multi-modal (images, PDFs, audio) — not relevant for CLI agent users
- ❌ Per-LLM-call token breakdown UI — we surface aggregate token use; per-call drilldown
  is LangSmith's domain
- ❌ Prompt hub / playground / version registry — community tools (LangChain Hub) exist
- ❌ LLM-as-judge built-in (use customer's own provider key if/when added — never host the
  judge model ourselves)
- ❌ Generic OTEL integration — adds complexity, not in line with hook-first capture
- ❌ Custom agent SDK requiring users to wrap their code

## What we sell (later — not now)

The OSS individual edition is free forever. Two paid tiers are planned once the CLI
experience hits "v1.0" quality and we have a beachhead of organic users:

- **Team Self-Hosted (~$29/seat/month, billed annually, 5-seat minimum)**: team aggregator
  service running in the customer's VPC, cross-developer dashboards, SSO, Slack alerts,
  shared flaky-prompt library, audit log.
- **Enterprise (~$79–150/seat/month)**: SAML/SCIM, policy engine (block commits below trust
  threshold, alert on secret-pattern prompts), AI governance dashboard, BYOC deployment
  module, SOC 2 reports, dedicated support + SLA.

Both tiers preserve the local-first promise: original prompt/code stays on the developer's
machine, only redacted aggregates flow to the team/enterprise dashboard.

## Decision filter for every PR

Before merging, ask:

1. Does this strengthen "Human ↔ Agent observability" framing, or muddy it?
2. Does it work across all four supported CLI agents, or only coding ones? If coding-only,
   does it cleanly live in the **domain** layer?
3. Does it require sending data off the machine? (If yes, hard stop.)
4. Is this a feature individuals want, a feature teams want, or a feature only enterprise
   wants? Make sure it lives in the right tier and isn't accidentally given away.
5. Can a non-engineer use the page / understand the metric? (Even if the user is a
   developer, plain language wins.)

If a PR fails any of (1)(2)(3), it should be reconsidered — not silently merged.
