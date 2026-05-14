import { detectAgentPresence } from '../../../../src/init.js';
import { runAgentCheckup, SUPPORTED_CHECKUP_AGENTS } from '../../../../src/agent-checkup.js';
import { resolveRunInboxDbPath } from '../../../../src/run-inbox-data.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Onboarding may iterate over 4 agents x thousands of historical sessions
// (Codex alone can be 30s); give the function room.
export const maxDuration = 300;

// init.js uses 'claude-code' as a target name; the rest of RunQ uses the
// framework id 'claude_code'. Translate here so callers consume one shape.
const PRESENCE_TARGET_TO_FRAMEWORK = {
  'claude-code': 'claude_code',
  codex: 'codex',
  openclaw: 'openclaw',
  hermes: 'hermes'
};

function detectedFrameworks(homeDir) {
  const presence = detectAgentPresence(homeDir);
  return Object.entries(presence)
    .filter(([, present]) => present)
    .map(([target]) => PRESENCE_TARGET_TO_FRAMEWORK[target])
    .filter((id) => SUPPORTED_CHECKUP_AGENTS.includes(id));
}

function encodeLine(payload) {
  return new TextEncoder().encode(`${JSON.stringify(payload)}\n`);
}

export async function GET(request) {
  const url = new URL(request.url);
  const homeDir = url.searchParams.get('home') ?? process.env.HOME;
  return Response.json({
    detected: detectedFrameworks(homeDir),
    supported: SUPPORTED_CHECKUP_AGENTS
  });
}

export async function POST(request) {
  const url = new URL(request.url);
  const dbPath = resolveRunInboxDbPath(url.searchParams.get('db'));
  const homeDir = url.searchParams.get('home') ?? process.env.HOME;
  const stream = url.searchParams.get('stream') !== '0';
  const frameworks = detectedFrameworks(homeDir);

  // Non-streaming fallback for tests / curl: run them all sequentially and
  // return one JSON summary.
  if (!stream) {
    const results = [];
    for (const agentId of frameworks) {
      try {
        results.push(await runAgentCheckup(agentId, { dbPath, homeDir }));
      } catch (error) {
        results.push({ agent_id: agentId, status: 'error', message: error?.message ?? 'checkup failed' });
      }
    }
    return Response.json({ detected: frameworks, results });
  }

  const body = new ReadableStream({
    async start(controller) {
      const emit = (payload) => {
        try { controller.enqueue(encodeLine(payload)); } catch { /* client gone */ }
      };
      emit({ type: 'detect', detected: frameworks });
      if (frameworks.length === 0) {
        emit({ type: 'done', summary: { detected: 0, succeeded: 0, results: [] } });
        controller.close();
        return;
      }
      const results = [];
      for (const [index, agentId] of frameworks.entries()) {
        emit({ type: 'agent-start', agent_id: agentId, agent_index: index + 1, agent_total: frameworks.length });
        try {
          const result = await runAgentCheckup(agentId, {
            dbPath,
            homeDir,
            onProgress: (event) => emit({ type: 'progress', agent_id: agentId, ...event })
          });
          results.push(result);
          emit({ type: 'agent-done', agent_id: agentId, result });
        } catch (error) {
          const message = error?.message ?? 'checkup failed';
          results.push({ agent_id: agentId, status: 'error', message });
          emit({ type: 'agent-error', agent_id: agentId, message });
        }
      }
      const succeeded = results.filter((r) => r.status === 'success' || r.status === 'empty').length;
      emit({ type: 'done', summary: { detected: frameworks.length, succeeded, results } });
      controller.close();
    }
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no'
    }
  });
}
