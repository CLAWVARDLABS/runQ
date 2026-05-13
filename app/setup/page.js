import { RunQPage } from '../runq-page.js';
import { pageLang } from '../lang.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'RunQ Setup',
  description: 'Setup health for supported local agent hooks'
};

export default async function SetupPage({ searchParams }) {
  const params = await searchParams;
  return <RunQPage activeView="setup" db={params?.db} initialLang={await pageLang(Promise.resolve(params))} />;
}
