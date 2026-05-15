import { ProductivityDashboardPage } from '../../components/run-inbox/ProductivityDashboardPage.js';
import { getProductivityReport } from '../../src/productivity.js';
import { resolveRunInboxDbPath } from '../../src/run-inbox-data.js';
import { pageLang } from '../lang.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'RunQ — Productivity dashboard',
  description: 'How your AI-augmented workday is going'
};

export default async function ProductivityPage({ searchParams }) {
  const params = await searchParams;
  const dbPath = resolveRunInboxDbPath(params?.db);
  const agentId = params?.agent ?? null;
  const range = Number(params?.range);
  const rangeDays = Number.isFinite(range) && range > 0 && range <= 30 ? range : 7;
  const report = getProductivityReport(dbPath, { agentId, rangeDays });

  return (
    <ProductivityDashboardPage
      agentId={agentId}
      dbPath={dbPath}
      initialLang={await pageLang(Promise.resolve(params))}
      rangeDays={rangeDays}
      report={report}
    />
  );
}
