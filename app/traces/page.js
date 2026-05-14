import { AgentTraceExplorer } from '../../components/run-inbox/AgentTraceExplorer.js';
import { pageLang } from '../lang.js';
import { getRunInboxEvents, getRunInboxSessions, resolveRunInboxDbPath } from '../../src/run-inbox-data.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'RunQ Agent Session Traces',
  description: 'Expandable trace explorer for local agent sessions'
};

export default async function TracesPage({ searchParams }) {
  const params = await searchParams;
  const dbPath = resolveRunInboxDbPath(params?.db);
  const sessions = getRunInboxSessions(dbPath);
  const requestedSessionId = params?.session || null;
  const requestedAgent = params?.agent || null;
  const selectedSession = requestedSessionId
    ? sessions.find((session) => session.session_id === requestedSessionId) ?? null
    : null;
  const events = selectedSession ? getRunInboxEvents(selectedSession.session_id, dbPath) : [];
  const selectedAgent = selectedSession?.framework
    ?? (requestedAgent && sessions.some((session) => session.framework === requestedAgent) ? requestedAgent : null);

  return (
    <AgentTraceExplorer
      initialLang={await pageLang(Promise.resolve(params))}
      initialSelectedAgent={selectedAgent}
      initialSelectedSessionId={selectedSession?.session_id ?? null}
      initialSessions={sessions}
      initialEvents={events}
    />
  );
}
