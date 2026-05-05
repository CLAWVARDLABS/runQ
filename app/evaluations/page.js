import { RunQPage } from '../runq-page.js';
import { pageLang } from '../lang.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'RunQ Evaluations',
  description: 'Evaluation loop for coding-agent sessions'
};

export default async function EvaluationsPage({ searchParams }) {
  return <RunQPage activeView="evaluations" initialLang={await pageLang(searchParams)} />;
}
