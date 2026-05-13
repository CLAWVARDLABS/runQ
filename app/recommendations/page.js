import { RunQPage } from '../runq-page.js';
import { pageLang } from '../lang.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'RunQ Recommendations',
  description: 'Optimization queue for agent runs'
};

export default async function RecommendationsPage({ searchParams }) {
  const params = await searchParams;
  return <RunQPage activeView="recommendations" db={params?.db} initialLang={await pageLang(Promise.resolve(params))} />;
}
