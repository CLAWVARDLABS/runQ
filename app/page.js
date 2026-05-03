import { RunInboxApp } from '../components/run-inbox/RunInboxApp.js';
import { checkSetupHealth } from '../src/doctor.js';
import { getRunInboxEvents, getRunInboxSessions } from '../src/run-inbox-data.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function HomePage() {
  const sessions = getRunInboxSessions();
  const selectedSession = sessions[0] ?? null;
  const events = selectedSession ? getRunInboxEvents(selectedSession.session_id) : [];
  const setupHealth = checkSetupHealth({ runqRoot: process.cwd() });

  return <RunInboxApp initialSessions={sessions} initialEvents={events} setupHealth={setupHealth} />;
}
