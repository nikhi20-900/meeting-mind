import fs from "fs/promises";
import path from "path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import type { PoolClient } from "pg";
import type { ConflictRecord, MeetingMindDatabase, MeetingTemplate } from "./types";
import type { Decision, MeetingSummary, TaskItem } from "@/types";
import { sampleMeetings, sampleDecisions, sampleTasks } from "@/data/mockData";

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "meeting_mind_db.json");
const STATE_ID = 1;
const SCHEMA_LOCK_ID = 734120018;

type DatabaseMutation<T> = (database: MeetingMindDatabase) => T | Promise<T>;

const globalForPg = globalThis as typeof globalThis & { meetingMindPool?: Pool };
let fileMutationQueue: Promise<void> = Promise.resolve();
let schemaReady: Promise<void> | undefined;
let rateLimitSchemaReady: Promise<void> | undefined;
const localRateLimits = new Map<string, { count: number; resetAt: number }>();
let rateLimitOperations = 0;

const initialConflicts: MeetingMindDatabase["conflicts"] = [
  {
    id: "conf-01",
    sourceDecisionId: "dec-01",
    targetDecisionId: "dec-02",
    sourceMeetingTitle: "Q4 API Gateway Migration & Rate Limiting Sync",
    targetMeetingTitle: "Client Enterprise SLA & Support Tier Overhaul",
    description:
      "Rate ceiling conflict: Dec-01 capped standard clients at 1,200 req/min, contradicting Dec-02 Enterprise contract burst guarantee of 3,000 req/min.",
    severity: "Critical",
    detectedAt: "2026-10-30T14:32:00Z",
    resolved: false,
  },
];

function getInitialDatabase(): MeetingMindDatabase {
  const now = new Date().toISOString();
  return {
    meetings: sampleMeetings,
    decisions: sampleDecisions,
    tasks: sampleTasks,
    conflicts: initialConflicts,
    templates: [],
    meta: { version: 1, initializedAt: now, lastUpdated: now },
  };
}

function getEmptyDatabase(): MeetingMindDatabase {
  const now = new Date().toISOString();
  return {
    meetings: [],
    decisions: [],
    tasks: [],
    conflicts: [],
    templates: [],
    meta: { version: 1, initializedAt: now, lastUpdated: now },
  };
}

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for hosted database storage.");
  }

  if (!globalForPg.meetingMindPool) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
    });
    pool.on("error", (error) => {
      console.error("[db/store] Unexpected idle PostgreSQL connection error:", error);
    });
    globalForPg.meetingMindPool = pool;
  }

  return globalForPg.meetingMindPool;
}

async function ensurePostgresSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const client = await getPool().connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [SCHEMA_LOCK_ID]);

        // Retain the legacy table as a one-time migration source for existing deployments.
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
            id TEXT PRIMARY KEY,
            position INTEGER NOT NULL,
            meeting_date TEXT NOT NULL,
            status TEXT NOT NULL,
            payload JSONB NOT NULL
          )
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS meeting_mind_decisions (
            id TEXT PRIMARY KEY,
            position INTEGER NOT NULL,
            meeting_id TEXT NOT NULL,
            category TEXT NOT NULL,
            status TEXT NOT NULL,
            payload JSONB NOT NULL
          )
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS meeting_mind_tasks (
            id TEXT PRIMARY KEY,
            position INTEGER NOT NULL,
            associated_decision_id TEXT,
            status TEXT NOT NULL,
            due_date TEXT NOT NULL,
            payload JSONB NOT NULL
          )
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS meeting_mind_conflicts (
            id TEXT PRIMARY KEY,
            position INTEGER NOT NULL,
            source_decision_id TEXT NOT NULL,
            target_decision_id TEXT NOT NULL,
            resolved BOOLEAN NOT NULL,
            payload JSONB NOT NULL
          )
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS meeting_mind_templates (
            id TEXT PRIMARY KEY,
            position INTEGER NOT NULL,
            payload JSONB NOT NULL
          )
        `);
        await client.query("CREATE INDEX IF NOT EXISTS meeting_mind_meetings_date_idx ON meeting_mind_meetings (meeting_date)");
        await client.query("CREATE INDEX IF NOT EXISTS meeting_mind_decisions_meeting_idx ON meeting_mind_decisions (meeting_id)");
        await client.query("CREATE INDEX IF NOT EXISTS meeting_mind_decisions_status_idx ON meeting_mind_decisions (status)");
        await client.query("CREATE INDEX IF NOT EXISTS meeting_mind_tasks_status_due_idx ON meeting_mind_tasks (status, due_date)");
        await client.query("CREATE INDEX IF NOT EXISTS meeting_mind_tasks_decision_idx ON meeting_mind_tasks (associated_decision_id)");
        await client.query("CREATE INDEX IF NOT EXISTS meeting_mind_conflicts_decisions_idx ON meeting_mind_conflicts (source_decision_id, target_decision_id)");

        const metadata = await client.query("SELECT id FROM meeting_mind_metadata WHERE id = $1", [STATE_ID]);
        if (!metadata.rows[0]) {
          const legacy = await client.query<{ state: MeetingMindDatabase }>(
            "SELECT state FROM meeting_mind_state WHERE id = $1",
            [STATE_ID]
          );
          const initial = legacy.rows[0]?.state || getEmptyDatabase();
          await persistEntityRows(client, initial);
          await client.query(
            `INSERT INTO meeting_mind_metadata (id, version, initialized_at, last_updated)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO NOTHING`,
            [
              STATE_ID,
              Number(initial.meta?.version) || 1,
              initial.meta?.initializedAt || new Date().toISOString(),
              initial.meta?.lastUpdated || new Date().toISOString(),
            ]
          );
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    })().catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }

  await schemaReady;
}

type PostgresEntityTable = "meeting_mind_meetings" | "meeting_mind_decisions" | "meeting_mind_tasks" | "meeting_mind_conflicts" | "meeting_mind_templates";

async function synchronizeEntityRows<T extends { id: string }>(
  client: PoolClient,
  table: PostgresEntityTable,
  rows: T[],
  valuesForRow: (row: T) => unknown[]
): Promise<void> {
  const ids = rows.map((row) => row.id);
  await client.query(`DELETE FROM ${table} WHERE NOT (id = ANY($1::text[]))`, [ids]);

  for (const [position, row] of rows.entries()) {
    const specificValues = valuesForRow(row);
    const columns = table === "meeting_mind_templates"
      ? "id, position, payload"
      : table === "meeting_mind_meetings"
      ? "id, position, meeting_date, status, payload"
      : table === "meeting_mind_decisions"
      ? "id, position, meeting_id, category, status, payload"
      : table === "meeting_mind_tasks"
      ? "id, position, associated_decision_id, status, due_date, payload"
      : "id, position, source_decision_id, target_decision_id, resolved, payload";
    const values = [row.id, position, ...specificValues, JSON.stringify(row)];
    const parameterSlots = Array.from({ length: values.length }, (_, index) => `$${index + 1}`);
    const mutableColumns = columns.split(", ").filter((column) => column !== "id");
    const updates = mutableColumns.map((column) => `${column} = EXCLUDED.${column}`).join(", ");
    await client.query(
      `INSERT INTO ${table} (${columns}) VALUES (${parameterSlots.join(", ")})
       ON CONFLICT (id) DO UPDATE SET ${updates}`,
      values
    );
  }
}

async function persistEntityRows(client: PoolClient, database: MeetingMindDatabase): Promise<void> {
  await synchronizeEntityRows(client, "meeting_mind_meetings", database.meetings || [], (meeting: MeetingSummary) => [meeting.date, meeting.status]);
  await synchronizeEntityRows(client, "meeting_mind_decisions", database.decisions || [], (decision: Decision) => [decision.meetingId, decision.category, decision.status]);
  await synchronizeEntityRows(client, "meeting_mind_tasks", database.tasks || [], (task: TaskItem) => [task.associatedDecisionId || null, task.status, task.dueDate]);
  await synchronizeEntityRows(client, "meeting_mind_conflicts", database.conflicts || [], (conflict: ConflictRecord) => [conflict.sourceDecisionId, conflict.targetDecisionId, conflict.resolved]);
  await synchronizeEntityRows(client, "meeting_mind_templates", database.templates || [], () => []);
}

async function readPostgresState(client: PoolClient): Promise<MeetingMindDatabase> {
  const metadata = await client.query<{ version: number; initialized_at: Date; last_updated: Date }>(
    "SELECT version, initialized_at, last_updated FROM meeting_mind_metadata WHERE id = $1",
    [STATE_ID]
  );
  const meetings = await client.query<{ payload: MeetingSummary }>("SELECT payload FROM meeting_mind_meetings ORDER BY position, id");
  const decisions = await client.query<{ payload: Decision }>("SELECT payload FROM meeting_mind_decisions ORDER BY position, id");
  const tasks = await client.query<{ payload: TaskItem }>("SELECT payload FROM meeting_mind_tasks ORDER BY position, id");
  const conflicts = await client.query<{ payload: ConflictRecord }>("SELECT payload FROM meeting_mind_conflicts ORDER BY position, id");
  const templates = await client.query<{ payload: MeetingTemplate }>("SELECT payload FROM meeting_mind_templates ORDER BY position, id");
  const meta = metadata.rows[0];
  if (!meta) throw new Error("Hosted database metadata row is missing.");
  return {
    meetings: meetings.rows.map((row) => row.payload),
    decisions: decisions.rows.map((row) => row.payload),
    tasks: tasks.rows.map((row) => row.payload),
    conflicts: conflicts.rows.map((row) => row.payload),
    templates: templates.rows.map((row) => row.payload),
    meta: {
      version: Number(meta.version),
      initializedAt: new Date(meta.initialized_at).toISOString(),
      lastUpdated: new Date(meta.last_updated).toISOString(),
    },
  };
}

function isUsingPostgres(): boolean {
  if (process.env.DATABASE_URL) return true;
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL must be configured in production; file storage is development-only.");
  }
  return false;
}

async function readFileDatabase(): Promise<MeetingMindDatabase> {
  await fs.mkdir(DB_DIR, { recursive: true });
  try {
    const content = await fs.readFile(DB_FILE, "utf-8");
    const database = JSON.parse(content) as MeetingMindDatabase;
    return { ...database, templates: Array.isArray(database.templates) ? database.templates : [] };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const initial = getInitialDatabase();
    await writeFileDatabase(initial);
    return initial;
  }
}

async function writeFileDatabase(data: MeetingMindDatabase): Promise<void> {
  await fs.mkdir(DB_DIR, { recursive: true });
  data.meta.lastUpdated = new Date().toISOString();
  const tempFile = path.join(DB_DIR, `meeting_mind_db.${randomUUID()}.tmp.json`);
  try {
    await fs.writeFile(tempFile, JSON.stringify(data, null, 2), { encoding: "utf-8", flag: "wx" });
    await fs.rename(tempFile, DB_FILE);
  } catch (error) {
    await fs.rm(tempFile, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function readDatabase(): Promise<MeetingMindDatabase> {
  if (!isUsingPostgres()) return readFileDatabase();

  await ensurePostgresSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const database = await readPostgresState(client);
    await client.query("COMMIT");
    return database;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function mutateDatabase<T>(mutation: DatabaseMutation<T>): Promise<T> {
  if (!isUsingPostgres()) {
    let result!: T;
    const operation = fileMutationQueue.then(async () => {
      const database = await readFileDatabase();
      result = await mutation(database);
      database.meta.version += 1;
      await writeFileDatabase(database);
    });
    // Keep the queue usable after a failed mutation while returning that failure to its caller.
    fileMutationQueue = operation.then(() => undefined, () => undefined);
    await operation;
    return result;
  }

  await ensurePostgresSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT id FROM meeting_mind_metadata WHERE id = $1 FOR UPDATE",
      [STATE_ID]
    );
    const database = await readPostgresState(client);
    const value = await mutation(database);
    database.meta.version += 1;
    database.meta.lastUpdated = new Date().toISOString();
    await persistEntityRows(client, database);
    await client.query(
      "UPDATE meeting_mind_metadata SET version = $2, last_updated = $3 WHERE id = $1",
      [STATE_ID, database.meta.version, database.meta.lastUpdated]
    );
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  if (!isUsingPostgres()) {
    const now = Date.now();
    const current = localRateLimits.get(key);
    if (!current || current.resetAt <= now) {
      localRateLimits.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfterSeconds: Math.ceil(windowMs / 1000) };
    }
    current.count += 1;
    return {
      allowed: current.count <= limit,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  if (!rateLimitSchemaReady) {
    rateLimitSchemaReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS meeting_mind_rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        reset_at TIMESTAMPTZ NOT NULL
      )
    `).then(() => undefined).catch((error) => {
      rateLimitSchemaReady = undefined;
      throw error;
    });
  }
  await rateLimitSchemaReady;
  rateLimitOperations += 1;
  if (rateLimitOperations % 250 === 0) {
    await getPool().query("DELETE FROM meeting_mind_rate_limits WHERE reset_at < NOW() - INTERVAL '1 day'");
  }

  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const result = await getPool().query<{ count: number; retry_after: number }>(
    `INSERT INTO meeting_mind_rate_limits (key, count, reset_at)
     VALUES ($1, 1, NOW() + make_interval(secs => $2))
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN meeting_mind_rate_limits.reset_at <= NOW() THEN 1 ELSE meeting_mind_rate_limits.count + 1 END,
       reset_at = CASE WHEN meeting_mind_rate_limits.reset_at <= NOW() THEN NOW() + make_interval(secs => $2) ELSE meeting_mind_rate_limits.reset_at END
     RETURNING count, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (reset_at - NOW()))))::INTEGER AS retry_after`,
    [key, windowSeconds]
  );
  return {
    allowed: result.rows[0].count <= limit,
    retryAfterSeconds: result.rows[0].retry_after,
  };
}

