import fs from "node:fs/promises";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("Set DATABASE_URL before importing the local Meeting Mind store.");
}

const sourceFile = new URL("../data/meeting_mind_db.json", import.meta.url);
const state = JSON.parse(await fs.readFile(sourceFile, "utf8"));
for (const collection of ["meetings", "decisions", "tasks", "conflicts"]) {
  if (!Array.isArray(state[collection])) {
    throw new Error(`The local store has an invalid ${collection} collection.`);
  }
  if (state[collection].some((record) => !record || typeof record.id !== "string" || !record.id)) {
    throw new Error(`The local ${collection} collection contains a record without an ID.`);
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
});

async function insertRows(client, table, records, valuesForRecord) {
  for (const [position, record] of records.entries()) {
    const values = [record.id, position, ...valuesForRecord(record), JSON.stringify(record)];
    const slots = values.map((_, index) => `$${index + 1}`);
    await client.query(
      `INSERT INTO ${table} (${table === "meeting_mind_meetings"
        ? "id, position, meeting_date, status, payload"
        : table === "meeting_mind_decisions"
        ? "id, position, meeting_id, category, status, payload"
        : table === "meeting_mind_tasks"
        ? "id, position, associated_decision_id, status, due_date, payload"
        : "id, position, source_decision_id, target_decision_id, resolved, payload"})
       VALUES (${slots.join(", ")})`,
      values
    );
  }
}

const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [734120018]);
  await client.query(`
    CREATE TABLE IF NOT EXISTS meeting_mind_state (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      state JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS meeting_mind_metadata (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL,
      initialized_at TIMESTAMPTZ NOT NULL,
      last_updated TIMESTAMPTZ NOT NULL
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS meeting_mind_meetings (
      id TEXT PRIMARY KEY, position INTEGER NOT NULL, meeting_date TEXT NOT NULL,
      status TEXT NOT NULL, payload JSONB NOT NULL
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS meeting_mind_decisions (
      id TEXT PRIMARY KEY, position INTEGER NOT NULL, meeting_id TEXT NOT NULL,
      category TEXT NOT NULL, status TEXT NOT NULL, payload JSONB NOT NULL
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS meeting_mind_tasks (
      id TEXT PRIMARY KEY, position INTEGER NOT NULL, associated_decision_id TEXT,
      status TEXT NOT NULL, due_date TEXT NOT NULL, payload JSONB NOT NULL
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS meeting_mind_conflicts (
      id TEXT PRIMARY KEY, position INTEGER NOT NULL, source_decision_id TEXT NOT NULL,
      target_decision_id TEXT NOT NULL, resolved BOOLEAN NOT NULL, payload JSONB NOT NULL
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS meeting_mind_meetings_date_idx ON meeting_mind_meetings (meeting_date)");
  await client.query("CREATE INDEX IF NOT EXISTS meeting_mind_decisions_meeting_idx ON meeting_mind_decisions (meeting_id)");
  await client.query("CREATE INDEX IF NOT EXISTS meeting_mind_decisions_status_idx ON meeting_mind_decisions (status)");
  await client.query("CREATE INDEX IF NOT EXISTS meeting_mind_tasks_status_due_idx ON meeting_mind_tasks (status, due_date)");
  await client.query("CREATE INDEX IF NOT EXISTS meeting_mind_tasks_decision_idx ON meeting_mind_tasks (associated_decision_id)");
  await client.query("CREATE INDEX IF NOT EXISTS meeting_mind_conflicts_decisions_idx ON meeting_mind_conflicts (source_decision_id, target_decision_id)");

  const normalizedCounts = [];
  for (const table of [
    "meeting_mind_meetings", "meeting_mind_decisions", "meeting_mind_tasks", "meeting_mind_conflicts",
  ]) {
    normalizedCounts.push(await client.query(`SELECT COUNT(*)::INTEGER AS count FROM ${table}`));
  }
  const normalizedHasData = normalizedCounts.some((result) => result.rows[0].count > 0);
  const existingLegacy = await client.query("SELECT state FROM meeting_mind_state WHERE id = 1");
  const legacyState = existingLegacy.rows[0]?.state;
  const legacyHasData = legacyState && ["meetings", "decisions", "tasks", "conflicts"].some(
    (key) => Array.isArray(legacyState[key]) && legacyState[key].length > 0
  );
  if (normalizedHasData || legacyHasData) {
    throw new Error("The PostgreSQL store already has records. Import stopped to avoid overwriting them.");
  }

  await insertRows(client, "meeting_mind_meetings", state.meetings, (record) => [record.date || "Unknown", record.status || "Processed"]);
  await insertRows(client, "meeting_mind_decisions", state.decisions, (record) => [record.meetingId || "", record.category || "Unknown", record.status || "Under Review"]);
  await insertRows(client, "meeting_mind_tasks", state.tasks, (record) => [record.associatedDecisionId || null, record.status || "Awaiting Approval", record.dueDate || "Unknown"]);
  await insertRows(client, "meeting_mind_conflicts", state.conflicts, (record) => [record.sourceDecisionId || "", record.targetDecisionId || "", Boolean(record.resolved)]);

  const version = Number(state.meta?.version) || 1;
  const initializedAt = state.meta?.initializedAt || new Date().toISOString();
  const lastUpdated = state.meta?.lastUpdated || new Date().toISOString();
  await client.query(
    `INSERT INTO meeting_mind_metadata (id, version, initialized_at, last_updated)
     VALUES (1, $1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET
       version = EXCLUDED.version,
       initialized_at = EXCLUDED.initialized_at,
       last_updated = EXCLUDED.last_updated`,
    [version, initializedAt, lastUpdated]
  );
  await client.query("COMMIT");
  process.stdout.write("Imported the local Meeting Mind store into normalized PostgreSQL tables.\n");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
