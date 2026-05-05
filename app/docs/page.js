import { RunQPage } from '../runq-page.js';
import { pageLang } from '../lang.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'RunQ Docs',
  description: 'User and developer documentation for the RunQ console'
};

export default async function DocsPage({ searchParams }) {
  return <RunQPage activeView="docs" initialLang={await pageLang(searchParams)} />;
}
