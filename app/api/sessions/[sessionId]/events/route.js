import { getRunInboxEvents, resolveRunInboxDbPath } from '../../../../../src/run-inbox-data.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const { sessionId } = await params;
  const dbPath = resolveRunInboxDbPath(new URL(request.url).searchParams.get('db'));
  return Response.json(getRunInboxEvents(decodeURIComponent(sessionId), dbPath));
}
