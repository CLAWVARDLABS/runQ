import { RunInboxApp } from '../../../../components/run-inbox/RunInboxApp.js';
import { loadRunQData } from '../../../runq-page.js';
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
  const parsedSearchParams = await searchParams;
  const { dataSources, dbPath, events, sessions, setupHealth } = loadRunQData(parsedSearchParams?.db);

  return (
    <RunInboxApp
      activeView="evaluations"
      dataSources={dataSources}
      dbPath={dbPath}
      initialAgentId={agentId}
      initialLang={await pageLang(Promise.resolve(parsedSearchParams))}
      initialSessions={sessions}
      initialEvents={events}
      setupHealth={setupHealth}
    />
  );
}
