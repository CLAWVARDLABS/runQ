import { RunInboxApp } from '../../../../components/run-inbox/RunInboxApp.js';
import { checkSetupHealth } from '../../../../src/doctor.js';
import { getRunInboxEvents, getRunInboxSessions } from '../../../../src/run-inbox-data.js';
import { pageLang } from '../../../lang.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'RunQ Agent Evaluations',
  description: 'Per-agent evaluation queue and quality review'
};

export default async function AgentEvaluationsPage({ params, searchParams }) {
  const { agentId: rawAgentId } = await params;
  const agentId = decodeURIComponent(rawAgentId);
  const sessions = getRunInboxSessions();
  const agentSessions = sessions.filter((session) => session.framework === agentId);
  const selectedSession = agentSessions[0] ?? sessions[0] ?? null;
  const events = selectedSession ? getRunInboxEvents(selectedSession.session_id) : [];
  const setupHealth = checkSetupHealth({ runqRoot: process.cwd() });

  return (
    <RunInboxApp
      activeView="evaluations"
      initialAgentId={agentId}
      initialLang={await pageLang(searchParams)}
      initialSessions={sessions}
      initialEvents={events}
      setupHealth={setupHealth}
    />
  );
}
