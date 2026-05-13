import { RunQPage } from '../runq-page.js';
import { pageLang } from '../lang.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'RunQ Agents',
  description: 'Agent fleet overview for local agent observability'
};

export default async function AgentsPage({ searchParams }) {
  const params = await searchParams;
  return <RunQPage activeView="agents" db={params?.db} initialLang={await pageLang(Promise.resolve(params))} />;
}
