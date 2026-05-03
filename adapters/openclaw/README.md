# RunQ OpenClaw Adapter

This adapter converts OpenClaw plugin hooks and agent event payloads into RunQ events.

OpenClaw exposes a richer surface than model-call wrappers: session lifecycle hooks, LLM input/output hooks, tool hooks, transcript persistence hooks, message hooks, subagent hooks, and node-host events such as `exec.finished`. RunQ uses those surfaces to observe coding-agent behavior without relying only on HTTP model requests.

## Supported Events

Current support:

- `session_start` -> `session.started`
- `session_end` -> `session.ended`
- `agent_end` -> `session.ended`
- `message_received` -> `user.prompt.submitted`
- `llm_input` -> `model.call.started`
- `llm_output` -> `model.call.ended`
- `before_tool_call` with `system.run` or shell-like tools -> `command.started`
- `after_tool_call` with `system.run` or shell-like tools -> `command.ended`
- `tool_result_persist` with shell-like tools -> `command.ended`
- OpenClaw agent event `tool/exec.finished` -> `command.ended`
- Other tool hooks -> `tool.call.started` / `tool.call.ended`

## Local Usage

Run the hook directly with sample JSON:

```bash
echo '{"hook":"session_start","event":{"sessionId":"demo","sessionKey":"local:demo"},"ctx":{"agentId":"devbot","sessionId":"demo","workspaceDir":"/repo"}}' \
  | node adapters/openclaw/hook.js --db .runq/dev.db
```

List captured sessions:

```bash
node src/cli.js sessions --db .runq/dev.db
```

## OpenClaw Plugin Shape

In an OpenClaw plugin, call the RunQ hook with the hook name, event payload, and hook context:

```js
import { spawnSync } from 'node:child_process';

function reportToRunQ(hook, event, ctx) {
  spawnSync('node', [
    '/absolute/path/to/runq/adapters/openclaw/hook.js',
    '--db',
    '/absolute/path/to/.runq/runq.db'
  ], {
    input: JSON.stringify({ hook, event, ctx }),
    encoding: 'utf8'
  });
}

export default {
  hooks: {
    session_start(event, ctx) {
      reportToRunQ('session_start', event, ctx);
    },
    llm_input(event, ctx) {
      reportToRunQ('llm_input', event, ctx);
    },
    llm_output(event, ctx) {
      reportToRunQ('llm_output', event, ctx);
    },
    before_tool_call(event, ctx) {
      reportToRunQ('before_tool_call', event, ctx);
    },
    after_tool_call(event, ctx) {
      reportToRunQ('after_tool_call', event, ctx);
    },
    session_end(event, ctx) {
      reportToRunQ('session_end', event, ctx);
    }
  }
};
```

The first production plugin should avoid blocking OpenClaw hot paths. This command-hook shape is useful for alpha validation; a native SDK reporter can batch and flush asynchronously.

## Harness

Run the OpenClaw-like harness:

```bash
npm run harness:openclaw -- --scenario verified-success --db .runq/openclaw-harness.db
npm run harness:openclaw -- --scenario repeated-test-failure --db .runq/openclaw-harness.db
```

The harness currently validates two core product questions:

- Can RunQ recognize a coding-agent run that changed code and passed targeted verification?
- Can RunQ recognize repeated failed verification and generate concrete workflow recommendations?
