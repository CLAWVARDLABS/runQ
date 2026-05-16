import { runReplay } from '../../../../../src/replay.js';
import { resolveRunInboxDbPath } from '../../../../../src/run-inbox-data.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// A replay spawns a real agent; default Claude Code / Codex headless runs
// can take a few minutes on cold-cache prompts. Give the function room.
export const maxDuration = 600;

function encodeLine(payload) {
  return new TextEncoder().encode(`${JSON.stringify(payload)}\n`);
}

export async function POST(request, { params }) {
  const { sessionId } = await params;
  const url = new URL(request.url);
  const dbPath = resolveRunInboxDbPath(url.searchParams.get('db'));
  const stream = url.searchParams.get('stream') !== '0';

  let body = {};
  try { body = await request.json(); } catch { /* empty body */ }
  const opts = {
    dbPath,
    inplace: Boolean(body?.inplace ?? false),
    model: body?.model ?? null,
    timeoutMs: Number.isFinite(Number(body?.timeoutMs)) ? Number(body.timeoutMs) : undefined
  };

  if (!stream) {
    try {
      const result = await runReplay(sessionId, opts);
      return Response.json(result);
    } catch (error) {
      return Response.json({ error: error?.message ?? 'replay failed' }, { status: 500 });
    }
  }

  const responseBody = new ReadableStream({
    async start(controller) {
      const emit = (payload) => {
        try { controller.enqueue(encodeLine(payload)); } catch { /* client gone */ }
      };
      emit({ type: 'progress', phase: 'queued', session_id: sessionId });
      try {
        const result = await runReplay(sessionId, {
          ...opts,
          onProgress: (event) => emit({ type: 'progress', ...event })
        });
        emit({ type: 'done', result });
      } catch (error) {
        emit({ type: 'error', message: error?.message ?? 'replay failed' });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(responseBody, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no'
    }
  });
}
