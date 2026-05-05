import { RunQPage } from '../runq-page.js';
import { pageLang } from '../lang.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'RunQ Recommendations',
  description: 'Optimization queue for coding-agent runs'
};

export default async function RecommendationsPage({ searchParams }) {
  return <RunQPage activeView="recommendations" initialLang={await pageLang(searchParams)} />;
}
