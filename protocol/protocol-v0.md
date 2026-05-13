# RunQ Protocol v0

Status: Draft

Protocol version: `0.1.0`

## Purpose

RunQ defines a common protocol for agent run quality. It captures what happened during an agent session and adds derived quality signals that help users understand whether the work held up.

## Core Concepts

### Session

A continuous interaction between a user and an agent runtime.

### Run

A goal-directed unit of agent work inside a session. In simple integrations, `session_id` and `run_id` may be the same.

### Evidence

Data that supports a score or recommendation, such as a failed test command, repeated approval request, or unverified file change.

### Outcome

The protocol's best estimate of whether the run likely succeeded. RunQ does not claim to know user satisfaction directly.

### Satisfaction

A user or evaluator label describing what happened after the run. Satisfaction is recorded separately from automated outcome scoring so RunQ can compare predicted quality against human judgment.

## Event Envelope

```json
{
  "runq_version": "0.1.0",
  "event_id": "evt_01HV...",
  "schema_version": "0.1.0",
  "event_type": "command.ended",
  "timestamp": "2026-05-02T10:15:30.000Z",
  "session_id": "ses_01HV...",
  "run_id": "run_01HV...",
  "parent_id": "evt_01HV...",
  "framework": "claude_code",
  "source": "hook",
  "privacy": {
    "level": "metadata",
    "redacted": true
  },
  "payload": {}
}
```

## Core Event Types

- `session.started`
- `session.ended`
- `user.prompt.submitted`
- `agent.step.started`
- `agent.step.ended`
- `model.call.started`
- `model.call.ended`
- `tool.call.started`
- `tool.call.ended`
- `command.started`
- `command.ended`
- `permission.requested`
- `permission.resolved`
- `file.changed`
- `git.diff.summarized`
- `test.started`
- `test.ended`
- `build.started`
- `build.ended`
- `lint.started`
- `lint.ended`
- `error.raised`
- `outcome.scored`
- `satisfaction.recorded`
- `recommendation.generated`
- `recommendation.accepted`
- `recommendation.dismissed`

## Privacy Levels

- `metadata`: safe structured metadata.
- `summary`: derived summary that may contain limited project context.
- `sensitive`: full prompts, command output, diffs, or source snippets.
- `secret`: detected credential material.

## Default Local Redaction

RunQ collectors redact sensitive payload fields before persistence. The default policy removes raw prompt/content fields, raw command strings, stdout, stderr, output, password/API-key/token/secret fields, and secret-looking strings. Adapters should preserve metadata that is useful for quality scoring, such as hashes, lengths, binary names, exit codes, durations, and verification flags.

Events that arrive with `privacy.level` set to `sensitive` or `secret` are stored as redacted metadata by default.

## Score Fields

`outcome.scored` payloads include compatibility scalar fields and the newer RunQ Trust Model:

- `trust_score`: integer `0..100`, the primary RunQ trust estimate.
- `trust_breakdown`: explainable dimension map.
- `outcome_confidence`: legacy `0..1` confidence value retained for compatibility.
- `verification_coverage`
- `rework_risk`
- `permission_friction`
- `loop_risk`
- `cost_efficiency`
- `reasons`

Trust breakdown dimensions:

- `evidence_strength`
- `verification_strength`
- `execution_quality`
- `autonomy_reliability`
- `cost_discipline`
- `risk_exposure`

## Recommendation Categories

- `permission_policy`
- `verification_strategy`
- `repo_instruction`
- `task_sizing`
- `loop_prevention`
- `cost_routing`

## Satisfaction Labels

- `accepted`: the user kept or shipped the agent output.
- `corrected`: the user kept part of the output but had to repair it.
- `abandoned`: the user discarded the run or stopped it before completion.
- `rerun`: the user asked another agent/run to solve the same task.
- `unknown`: no judgment is available yet.
