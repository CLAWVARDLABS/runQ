# ARQ: Agent Run Quality Standard

ARQ is RunQ's coding-agent quality standard. It defines how to observe, score, and improve agent runs that read code, edit files, execute commands, and hand work back to a developer.

## Scope

ARQ is intentionally narrower than general LLM observability. It focuses on engineering outcomes:

- Did the agent understand the repo and task boundary?
- Did it change the intended files?
- Did it run meaningful verification?
- Did it stop or recover after failures?
- Did the developer accept, correct, rerun, abandon, or escalate the work?
- What should change in repo instructions, tests, or agent policy before the next run?

## Event Layers

### Session

- `session.started`
- `session.ended`
- `user.prompt.submitted`

Session events identify the run, framework, source, repo hash, and privacy level. They should not store raw private prompts by default.

### Model And Reasoning

- `model.call.started`
- `model.call.ended`
- `agent.step.started`
- `agent.step.ended`

Model events capture provider, model, duration, token metadata, request/response sizes, and hashed call identity. Raw prompts and model output remain redacted by default.

### Engineering Actions

- `command.started`
- `command.ended`
- `tool.call.started`
- `tool.call.ended`
- `file.changed`
- `git.diff.summarized`

Engineering events are the center of ARQ. A useful coding-agent trace must show what the agent actually did to the repository and shell, not only what it asked the model.

### Verification

- `test.started`
- `test.ended`
- `build.started`
- `build.ended`
- `lint.started`
- `lint.ended`
- `command.ended` with `is_verification: true`

Verification events determine whether a run deserves trust. A run can recover from an early failed test if the latest relevant verification passes after the code change.

### Human Feedback

- `satisfaction.recorded`
- `recommendation.accepted`
- `recommendation.dismissed`

The minimum satisfaction labels are:

- `accepted`: the developer keeps the output.
- `needs_review`: the output may be usable but needs human inspection.
- `corrected`: the developer manually fixed the output.
- `rerun`: the developer launched another agent pass.
- `abandoned`: the developer stopped using the output.
- `escalated`: a human owner took over.

## Quality Dimensions

- Outcome Confidence: probability the run produced usable work.
- Verification Coverage: strength of tests, builds, lints, or other checks after changes.
- Rework Risk: likelihood the work needs another pass.
- Permission Friction: time and interruption cost from permissions.
- Loop Risk: repeated failed commands or unproductive retries.
- Cost Efficiency: token and time cost relative to useful progress.
- Repo Agent Readiness: whether the repo has enough instructions, scripts, and boundaries for agents.

## Recommendation Categories

- `verification_strategy`: improve when and how verification runs.
- `loop_prevention`: stop repeated failures and force strategy changes.
- `repo_instructions`: add or refine repo-level agent guidance.
- `permission_policy`: reduce repeated low-risk approvals.
- `task_sizing`: split or constrain ambiguous tasks.
- `feedback_loop`: capture human corrections as future training signal.
- `escalation_policy`: define when agents should hand off to humans.

## Privacy Defaults

ARQ is metadata-first:

- Store hashes, lengths, file extensions, command binaries, exit codes, durations, and verification flags.
- Redact raw prompts, command strings, command output, file contents, API keys, tokens, and secret-looking strings.
- Treat sensitive payloads as local-only unless a future explicit opt-in sync policy is enabled.

## Readiness Criteria

A RunQ dataset is ready for public developer preview when:

- At least 50 real sessions are captured.
- At least 80 percent of sessions reconstruct a usable timeline.
- Default metadata mode has zero secret-like payload findings.
- At least 3 developers act on one recommendation.

`runq readiness --db <path>` reports the measurable subset of these criteria.
