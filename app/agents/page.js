import { RunQPage } from '../runq-page.js';
import { pageLang } from '../lang.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'RunQ Agents',
  description: 'Agent fleet overview for local coding-agent observability'
};

export default async function AgentsPage({ searchParams }) {
  return <RunQPage activeView="agents" initialLang={await pageLang(searchParams)} />;
}
