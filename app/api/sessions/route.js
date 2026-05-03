import { getRunInboxSessions } from '../../../src/run-inbox-data.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return Response.json(getRunInboxSessions());
}
