import { AgentTraceExplorer } from '../../components/run-inbox/AgentTraceExplorer.js';
import { pageLang } from '../lang.js';
import { getRunInboxEvents, getRunInboxSessions } from '../../src/run-inbox-data.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'RunQ Agent Session Traces',
  description: 'Expandable trace explorer for local coding-agent sessions'
};

export default async function TracesPage({ searchParams }) {
  const params = await searchParams;
  const sessions = getRunInboxSessions();
  const requestedSessionId = params?.session || null;
  const selectedSession = sessions.find((session) => session.session_id === requestedSessionId) ?? sessions[0] ?? null;
  const events = selectedSession ? getRunInboxEvents(selectedSession.session_id) : [];

  return (
    <AgentTraceExplorer
      initialLang={await pageLang(Promise.resolve(params))}
      initialSelectedSessionId={selectedSession?.session_id ?? null}
      initialSessions={sessions}
      initialEvents={events}
    />
  );
}
