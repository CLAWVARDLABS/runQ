import { runAgentCheckup, SUPPORTED_CHECKUP_AGENTS } from '../../../../../src/agent-checkup.js';
import { resolveRunInboxDbPath } from '../../../../../src/run-inbox-data.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Importing a large JSONL history (a few thousand sessions) can run for
// 30-60s on cold caches; raise the function timeout accordingly.
export const maxDuration = 120;

function encodeLine(payload) {
  return new TextEncoder().encode(`${JSON.stringify(payload)}\n`);
}

export async function POST(request, { params }) {
  const { agentId } = await params;
  if (!SUPPORTED_CHECKUP_AGENTS.includes(agentId)) {
    return Response.json(
      { error: `Unsupported agent: ${agentId}`, supported: SUPPORTED_CHECKUP_AGENTS },
      { status: 400 }
    );
  }
  const url = new URL(request.url);
  const dbPath = resolveRunInboxDbPath(url.searchParams.get('db'));
  const homeDir = url.searchParams.get('home') ?? process.env.HOME;
  // Non-streaming clients (CI / tests / curl) can opt out and just get the
  // final JSON result back the way the original endpoint did.
  const stream = url.searchParams.get('stream') !== '0';

  if (!stream) {
    try {
      const result = await runAgentCheckup(agentId, { dbPath, homeDir });
      return Response.json(result);
    } catch (error) {
      return Response.json({ error: error?.message ?? 'Agent checkup failed' }, { status: 500 });
    }
  }

  // Streaming path — emit application/x-ndjson so the UI can render progress.
  const body = new ReadableStream({
    async start(controller) {
      const emit = (payload) => {
        try {
          controller.enqueue(encodeLine(payload));
        } catch {
          // controller may already be closed if the client disconnected
        }
      };
      emit({ type: 'progress', phase: 'starting', agent_id: agentId });
      try {
        const result = await runAgentCheckup(agentId, {
          dbPath,
          homeDir,
          onProgress: (event) => emit({ type: 'progress', ...event })
        });
        emit({ type: 'done', result });
      } catch (error) {
        emit({ type: 'error', message: error?.message ?? 'Agent checkup failed' });
      } finally {
        controller.close();
      }
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
