# RunQ Protocol v0

Status: Draft

Protocol version: `0.1.0`

## Purpose

RunQ defines a common protocol for coding-agent run quality. It captures what happened during a coding-agent session and adds derived quality signals that help users understand whether the work held up.

## Core Concepts

### Session

A continuous interaction between a user and an agent runtime.

### Run

A goal-directed unit of agent work inside a session. In simple integrations, `session_id` and `run_id` may be the same.

### Evidence

Data that supports a score or recommendation, such as a failed test command, repeated approval request, or unverified file change.

### Outcome

The protocol's best estimate of whether the run likely succeeded. RunQ does not claim to know user satisfaction directly.

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
- `recommendation.generated`
- `recommendation.accepted`
- `recommendation.dismissed`

## Privacy Levels

- `metadata`: safe structured metadata.
- `summary`: derived summary that may contain limited project context.
- `sensitive`: full prompts, command output, diffs, or source snippets.
- `secret`: detected credential material.

## Score Dimensions

- Outcome Confidence
- Verification Coverage
- Rework Risk
- Permission Friction
- Loop Risk
- Cost Efficiency

## Recommendation Categories

- `permission_policy`
- `verification_strategy`
- `repo_instruction`
- `task_sizing`
- `loop_prevention`
- `cost_routing`
