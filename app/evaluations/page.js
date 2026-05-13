import { RunQPage } from '../runq-page.js';
import { pageLang } from '../lang.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'RunQ Evaluations',
  description: 'Evaluation loop for agent sessions'
};

export default async function EvaluationsPage({ searchParams }) {
  const params = await searchParams;
  return <RunQPage activeView="evaluations" db={params?.db} initialLang={await pageLang(Promise.resolve(params))} />;
}
