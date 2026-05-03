import { getRunInboxEvents } from '../../../../../src/run-inbox-data.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request, { params }) {
  const { sessionId } = await params;
  return Response.json(getRunInboxEvents(decodeURIComponent(sessionId)));
}
