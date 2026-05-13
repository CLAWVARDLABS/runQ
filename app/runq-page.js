import { RunInboxApp } from '../components/run-inbox/RunInboxApp.js';
import { checkSetupHealth } from '../src/doctor.js';
import {
  getRunInboxEvents,
  getRunInboxSessions,
  listRunInboxDataSources,
  resolveRunInboxDbPath
} from '../src/run-inbox-data.js';

export function loadRunQData(requestedDbPath, selectedSessionId = null) {
  const dbPath = resolveRunInboxDbPath(requestedDbPath);
  const sessions = getRunInboxSessions(dbPath);
  const selectedSession = sessions.find((session) => session.session_id === selectedSessionId) ?? sessions[0] ?? null;
  const events = selectedSession ? getRunInboxEvents(selectedSession.session_id, dbPath) : [];
  const setupHealth = checkSetupHealth({ dbPath, runqRoot: process.cwd() });
  const dataSources = listRunInboxDataSources(process.cwd(), dbPath);

  return { dataSources, dbPath, events, selectedSession, sessions, setupHealth };
}

export function RunQPage({ activeView, db, initialLang = 'zh', initialRunSearch = '' }) {
  const { dataSources, dbPath, events, sessions, setupHealth } = loadRunQData(db);

  return (
    <RunInboxApp
      activeView={activeView}
      dataSources={dataSources}
      dbPath={dbPath}
      initialLang={initialLang}
      initialRunSearch={initialRunSearch}
      initialSessions={sessions}
      initialEvents={events}
      setupHealth={setupHealth}
    />
  );
}
