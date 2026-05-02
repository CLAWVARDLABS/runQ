import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { validateEvent } from './schema.js';

export class RunqStore {
  #db;

  constructor(dbPath) {
    if (!dbPath) {
      throw new Error('dbPath is required');
    }

    mkdirSync(dirname(dbPath), { recursive: true });
    this.#db = new DatabaseSync(dbPath);
    this.#initialize();
  }

  #initialize() {
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        event_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        parent_id TEXT,
        event_type TEXT NOT NULL,
        framework TEXT NOT NULL,
        source TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        privacy_level TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        event_json TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_events_session_time
        ON events (session_id, timestamp);

      CREATE INDEX IF NOT EXISTS idx_events_time
        ON events (timestamp);
    `);
  }

  appendEvent(event) {
    const validation = validateEvent(event);
    if (!validation.ok) {
      throw new Error(`Invalid RunQ event: ${validation.errors.join(', ')}`);
    }

    const insert = this.#db.prepare(`
      INSERT INTO events (
        event_id,
        session_id,
        run_id,
        parent_id,
        event_type,
        framework,
        source,
        timestamp,
        privacy_level,
        payload_json,
        event_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      event.event_id,
      event.session_id,
      event.run_id,
      event.parent_id ?? null,
      event.event_type,
      event.framework,
      event.source,
      event.timestamp,
      event.privacy.level,
      JSON.stringify(event.payload),
      JSON.stringify(event)
    );
  }

  listSessions() {
    const select = this.#db.prepare(`
      SELECT
        session_id,
        COUNT(DISTINCT run_id) AS run_count,
        COUNT(*) AS event_count,
        MIN(framework) AS framework,
        MIN(timestamp) AS started_at,
        MAX(timestamp) AS last_event_at
      FROM events
      GROUP BY session_id
      ORDER BY last_event_at DESC
    `);

    return select.all().map((row) => ({
      session_id: row.session_id,
      run_count: row.run_count,
      event_count: row.event_count,
      framework: row.framework,
      started_at: row.started_at,
      last_event_at: row.last_event_at
    }));
  }

  listEventsForSession(sessionId) {
    const select = this.#db.prepare(`
      SELECT event_json
      FROM events
      WHERE session_id = ?
      ORDER BY timestamp ASC, event_id ASC
    `);

    return select.all(sessionId).map((row) => JSON.parse(row.event_json));
  }

  close() {
    this.#db.close();
  }
}
