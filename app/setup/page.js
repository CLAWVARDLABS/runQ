import { RunQPage } from '../runq-page.js';
import { pageLang } from '../lang.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'RunQ Setup',
  description: 'Setup health for supported local coding-agent hooks'
};

export default async function SetupPage({ searchParams }) {
  return <RunQPage activeView="setup" initialLang={await pageLang(searchParams)} />;
}
