import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { validateEvent } from './schema.js';
import { redactEvent } from './redaction.js';

// Bump this when the on-disk schema changes and existing DBs need a migration.
// Stored via SQLite's PRAGMA user_version; new DBs are created at SCHEMA_VERSION.
const SCHEMA_VERSION = 1;

// Hot fields lifted out of payload_json into typed columns. Keeping these as
// real columns lets the dashboard and health-report aggregations run in SQL
// (GROUP BY tool_name, etc.) instead of pulling every row into JS and parsing
// JSON. The full payload still lives in payload_json for fidelity.
const HOT_COLUMNS = [
  { name: 'tool_name', type: 'TEXT' },
  { name: 'model', type: 'TEXT' },
  { name: 'status', type: 'TEXT' },
  { name: 'exit_code', type: 'INTEGER' },
  { name: 'duration_ms', type: 'INTEGER' },
  { name: 'is_verification', type: 'INTEGER' }
];

function payloadHotFields(payload) {
  const p = payload ?? {};
  return {
    tool_name: p.tool_name ?? null,
    model: p.model ?? null,
    status: p.status ?? null,
    exit_code: p.exit_code === undefined || p.exit_code === null ? null : Number(p.exit_code),
    duration_ms: p.duration_ms === undefined || p.duration_ms === null ? null : Number(p.duration_ms),
    is_verification: p.is_verification === undefined ? null : (p.is_verification ? 1 : 0)
  };
}

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
    this.#migrate();
  }

  #initialize() {
    // WAL keeps readers from blocking the hook writer (and vice versa) — the
    // common case is "hook is writing while the dashboard is polling reads".
    this.#db.exec('PRAGMA journal_mode = WAL');
    this.#db.exec('PRAGMA synchronous = NORMAL');

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
        event_json TEXT NOT NULL,
        tool_name TEXT,
        model TEXT,
        status TEXT,
        exit_code INTEGER,
        duration_ms INTEGER,
        is_verification INTEGER
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

  #migrate() {
    const current = Number(this.#db.prepare('PRAGMA user_version').get().user_version ?? 0);
    if (current >= SCHEMA_VERSION) return;

    // Discover which hot columns are missing on a pre-existing events table
    // (CREATE TABLE IF NOT EXISTS above won't re-add columns to an old table).
    const existing = new Set(
      this.#db.prepare('PRAGMA table_info(events)').all().map((row) => row.name)
    );
    for (const column of HOT_COLUMNS) {
      if (!existing.has(column.name)) {
        this.#db.exec(`ALTER TABLE events ADD COLUMN ${column.name} ${column.type}`);
      }
    }

    // Backfill the new columns from payload_json in one shot using json1.
    // Cheap: it's all in-engine. For ~100k events on local disk this is ~1s.
    this.#db.exec(`
      UPDATE events SET
        tool_name = COALESCE(tool_name, json_extract(payload_json, '$.tool_name')),
        model = COALESCE(model, json_extract(payload_json, '$.model')),
        status = COALESCE(status, json_extract(payload_json, '$.status')),
        exit_code = COALESCE(exit_code, json_extract(payload_json, '$.exit_code')),
        duration_ms = COALESCE(duration_ms, json_extract(payload_json, '$.duration_ms')),
        is_verification = COALESCE(is_verification,
          CASE json_extract(payload_json, '$.is_verification')
            WHEN 1 THEN 1
            WHEN 0 THEN 0
            WHEN 'true' THEN 1
            WHEN 'false' THEN 0
            ELSE NULL
          END)
      WHERE tool_name IS NULL OR model IS NULL OR status IS NULL
        OR exit_code IS NULL OR duration_ms IS NULL OR is_verification IS NULL
    `);

    // Create the hot-column indexes only after the columns are guaranteed to
    // exist (legacy DBs need the ALTER TABLE pass first).
    this.#db.exec(`
      CREATE INDEX IF NOT EXISTS idx_events_framework_type_time
        ON events (framework, event_type, timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_tool_name
        ON events (tool_name) WHERE tool_name IS NOT NULL;
    `);

    this.#db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
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

    const hot = payloadHotFields(storedEvent.payload);

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
        event_json,
        tool_name,
        model,
        status,
        exit_code,
        duration_ms,
        is_verification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      JSON.stringify(storedEvent),
      hot.tool_name,
      hot.model,
      hot.status,
      hot.exit_code,
      hot.duration_ms,
      hot.is_verification
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

  // SQL-side aggregation of tool calls. Replaces a JS hot-loop that re-parsed
  // every event JSON to count tool_name occurrences.
  aggregateToolCalls(framework, { limit = 10 } = {}) {
    const select = this.#db.prepare(`
      SELECT tool_name, COUNT(*) AS count
      FROM events
      WHERE framework = ?
        AND event_type = 'tool.call.started'
        AND tool_name IS NOT NULL
      GROUP BY tool_name
      ORDER BY count DESC
      LIMIT ?
    `);
    return select.all(framework, limit).map((row) => ({
      tool: row.tool_name,
      count: Number(row.count)
    }));
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
