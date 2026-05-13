import { checkSetupHealth } from '../../../src/doctor.js';
import { resolveRunInboxDbPath } from '../../../src/run-inbox-data.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const dbPath = resolveRunInboxDbPath(new URL(request.url).searchParams.get('db'));
  return Response.json(checkSetupHealth({ dbPath, runqRoot: process.cwd() }));
}
