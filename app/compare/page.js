import { RunComparePage } from '../../components/run-inbox/RunComparePage.js';
import { compareRuns } from '../../src/compare-runs.js';
import { getRunInboxEvents, getRunInboxSessions, resolveRunInboxDbPath } from '../../src/run-inbox-data.js';
import { pageLang } from '../lang.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'RunQ — Compare runs',
  description: 'Side-by-side diff between two agent runs'
};

export default async function ComparePage({ searchParams }) {
  const params = await searchParams;
  const dbPath = resolveRunInboxDbPath(params?.db);
  const aId = params?.a ?? null;
  const bId = params?.b ?? null;
  const sessions = getRunInboxSessions(dbPath);
  const leftSession = aId ? sessions.find((s) => s.session_id === aId) ?? null : null;
  const rightSession = bId ? sessions.find((s) => s.session_id === bId) ?? null : null;
  const leftEvents = leftSession ? getRunInboxEvents(leftSession.session_id, dbPath) : [];
  const rightEvents = rightSession ? getRunInboxEvents(rightSession.session_id, dbPath) : [];
  const diff = (leftSession && rightSession)
    ? compareRuns(leftEvents, rightEvents, { leftSession, rightSession })
    : null;

  return (
    <RunComparePage
      dbPath={dbPath}
      diff={diff}
      initialLang={await pageLang(Promise.resolve(params))}
      leftSession={leftSession}
      rightSession={rightSession}
      sessions={sessions}
    />
  );
}
