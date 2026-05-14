import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { validateEvent } from './schema.js';
import { redactEvent } from './redaction.js';

export class RunqStore {
  #db;
  #redactionPolicy;

  constructor(dbPath, { redactionPolicy = {} } = {}) {
    if (!dbPath) {
      throw new Error('dbPath is required');
    }

    this.#redactionPolicy = redactionPolicy;
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

      CREATE TABLE IF NOT EXISTS session_metrics (
        session_id TEXT PRIMARY KEY,
        event_count INTEGER NOT NULL,
        last_event_at TEXT NOT NULL,
        metrics_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  appendEvent(event) {
    return this.#insertEvent(event, false);
  }

  // Idempotent variant used by batch importers (e.g. agent check-up). Returns
  // true if the row was inserted, false if event_id already existed.
  tryAppendEvent(event) {
    return this.#insertEvent(event, true);
  }

  #insertEvent(event, ignoreDuplicate) {
    const storedEvent = redactEvent(event, this.#redactionPolicy);
    const validation = validateEvent(storedEvent);
    if (!validation.ok) {
      throw new Error(`Invalid RunQ event: ${validation.errors.join(', ')}`);
    }

    const insert = this.#db.prepare(`
      INSERT ${ignoreDuplicate ? 'OR IGNORE ' : ''}INTO events (
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

    const result = insert.run(
      storedEvent.event_id,
      storedEvent.session_id,
      storedEvent.run_id,
      storedEvent.parent_id ?? null,
      storedEvent.event_type,
      storedEvent.framework,
      storedEvent.source,
      storedEvent.timestamp,
      storedEvent.privacy.level,
      JSON.stringify(storedEvent.payload),
      JSON.stringify(storedEvent)
    );
    return ignoreDuplicate ? Number(result?.changes ?? 0) > 0 : true;
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

  getSessionMetrics(sessionId) {
    const select = this.#db.prepare(`
      SELECT session_id, event_count, last_event_at, metrics_json, updated_at
      FROM session_metrics
      WHERE session_id = ?
    `);
    const row = select.get(sessionId);
    if (!row) return null;
    return {
      session_id: row.session_id,
      event_count: row.event_count,
      last_event_at: row.last_event_at,
      metrics: JSON.parse(row.metrics_json),
      updated_at: row.updated_at
    };
  }

  upsertSessionMetrics(sessionId, { event_count, last_event_at, metrics }) {
    const upsert = this.#db.prepare(`
      INSERT INTO session_metrics (
        session_id,
        event_count,
        last_event_at,
        metrics_json,
        updated_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        event_count = excluded.event_count,
        last_event_at = excluded.last_event_at,
        metrics_json = excluded.metrics_json,
        updated_at = excluded.updated_at
    `);

    upsert.run(
      sessionId,
      event_count,
      last_event_at,
      JSON.stringify(metrics),
      new Date().toISOString()
    );
  }

  close() {
    this.#db.close();
  }
}
