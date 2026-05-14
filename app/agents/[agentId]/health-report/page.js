import { RunInboxApp } from '../../../../components/run-inbox/RunInboxApp.js';
import { loadRunQData } from '../../../runq-page.js';
import { pageLang } from '../../../lang.js';
import { getAgentHealthReport } from '../../../../src/agent-health-report.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'RunQ Agent Health Report',
  description: 'Full historical observation report for a connected agent'
};

export default async function AgentHealthReportPage({ params, searchParams }) {
  const { agentId: rawAgentId } = await params;
  const agentId = decodeURIComponent(rawAgentId);
  const parsedSearchParams = await searchParams;
  const { dataSources, dbPath, events, sessions, setupHealth } =
    loadRunQData(parsedSearchParams?.db);
  const report = getAgentHealthReport(agentId, dbPath);

  return (
    <RunInboxApp
      activeView="health-report"
      dataSources={dataSources}
      dbPath={dbPath}
      initialAgentId={agentId}
      initialHealthReport={report}
      initialLang={await pageLang(Promise.resolve(parsedSearchParams))}
      initialSessions={sessions}
      initialEvents={events}
      setupHealth={setupHealth}
    />
  );
}
