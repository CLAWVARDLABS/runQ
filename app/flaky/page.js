import { FlakyPromptsPage } from '../../components/run-inbox/FlakyPromptsPage.js';
import { detectFlakyPrompts } from '../../src/flaky.js';
import { resolveRunInboxDbPath } from '../../src/run-inbox-data.js';
import { pageLang } from '../lang.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'RunQ — Flaky prompts',
  description: 'Prompts whose trust score swings widely from run to run'
};

export default async function FlakyPage({ searchParams }) {
  const params = await searchParams;
  const dbPath = resolveRunInboxDbPath(params?.db);
  const agentId = params?.agent ?? null;
  const result = detectFlakyPrompts(dbPath, { agentId });

  return (
    <FlakyPromptsPage
      agentId={agentId}
      dbPath={dbPath}
      initialLang={await pageLang(Promise.resolve(params))}
      result={result}
    />
  );
}
