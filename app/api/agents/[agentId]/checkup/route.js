import { runAgentCheckup, SUPPORTED_CHECKUP_AGENTS } from '../../../../../src/agent-checkup.js';
import { resolveRunInboxDbPath } from '../../../../../src/run-inbox-data.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Importing a large JSONL history (a few thousand sessions) can run for
// 30-60s on cold caches; raise the function timeout accordingly.
export const maxDuration = 120;

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

  try {
    const result = await runAgentCheckup(agentId, { dbPath, homeDir });
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error?.message ?? 'Agent checkup failed' },
      { status: 500 }
    );
  }
}
