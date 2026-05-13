import { RunInboxApp } from '../../../components/run-inbox/RunInboxApp.js';
import { loadRunQData } from '../../runq-page.js';
import { pageLang } from '../../lang.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'RunQ Agent Detail',
  description: 'Per-agent run quality detail'
};

export default async function AgentDetailPage({ params, searchParams }) {
  const { agentId: rawAgentId } = await params;
  const agentId = decodeURIComponent(rawAgentId);
  const parsedSearchParams = await searchParams;
  const initialLang = await pageLang(Promise.resolve(parsedSearchParams));
  const { dataSources, dbPath, events, sessions, setupHealth } = loadRunQData(parsedSearchParams?.db);

  return (
    <RunInboxApp
      activeView="sessions"
      dataSources={dataSources}
      dbPath={dbPath}
      initialAgentId={agentId}
      initialLang={initialLang}
      initialSessions={sessions}
      initialEvents={events}
      setupHealth={setupHealth}
    />
  );
}
