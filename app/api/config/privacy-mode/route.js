import { resolveRunInboxDbPath } from '../../../../src/run-inbox-data.js';
import { getPrivacyMode, setPrivacyMode } from '../../../../src/config.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function dbHintFromRequest(request) {
  const dbParam = new URL(request.url).searchParams.get('db');
  return resolveRunInboxDbPath(dbParam);
}

export async function GET(request) {
  const dbPath = dbHintFromRequest(request);
  return Response.json({ mode: getPrivacyMode(dbPath) });
}

export async function POST(request) {
  const dbPath = dbHintFromRequest(request);
  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const requested = String(body?.mode ?? '').toLowerCase();
  if (requested !== 'on' && requested !== 'off') {
    return Response.json({ error: 'mode must be "on" or "off"' }, { status: 400 });
  }
  const next = setPrivacyMode(requested, dbPath);
  return Response.json({ mode: next });
}
