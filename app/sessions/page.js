import { RunQPage } from '../runq-page.js';
import { pageLang } from '../lang.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'RunQ Sessions',
  description: 'Run history and quality inspector for local agents'
};

export default async function SessionsPage({ searchParams }) {
  const params = await searchParams;
  return <RunQPage activeView="sessions" db={params?.db} initialLang={await pageLang(Promise.resolve(params))} initialRunSearch={params?.q || ''} />;
}
