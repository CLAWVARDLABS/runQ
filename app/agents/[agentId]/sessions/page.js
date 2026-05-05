import { RunInboxApp } from '../../../../components/run-inbox/RunInboxApp.js';
import { checkSetupHealth } from '../../../../src/doctor.js';
import { getRunInboxEvents, getRunInboxSessions } from '../../../../src/run-inbox-data.js';
import { pageLang } from '../../../lang.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'RunQ Agent Sessions',
  description: 'Per-agent session history and quality signals'
};

export default async function AgentSessionsPage({ params, searchParams }) {
  const { agentId: rawAgentId } = await params;
  const agentId = decodeURIComponent(rawAgentId);
  const parsedSearchParams = await searchParams;
  const sessions = getRunInboxSessions();
  const agentSessions = sessions.filter((session) => session.framework === agentId);
  const selectedSession = agentSessions[0] ?? sessions[0] ?? null;
  const events = selectedSession ? getRunInboxEvents(selectedSession.session_id) : [];
  const setupHealth = checkSetupHealth({ runqRoot: process.cwd() });

  return (
    <RunInboxApp
      activeView="sessions"
      initialAgentId={agentId}
      initialLang={await pageLang(Promise.resolve(parsedSearchParams))}
      initialRunSearch={parsedSearchParams?.q || ''}
      initialSessions={sessions}
      initialEvents={events}
      setupHealth={setupHealth}
    />
  );
}
