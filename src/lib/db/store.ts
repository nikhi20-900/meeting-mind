import fs from "fs/promises";
import path from "path";
import { Pool } from "pg";
import { MeetingMindDatabase } from "./types";
import { sampleMeetings, sampleDecisions, sampleTasks } from "@/data/mockData";

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "meeting_mind_db.json");
const TMP_FILE = path.join(DB_DIR, "meeting_mind_db.tmp.json");
const STATE_ID = 1;

type DatabaseMutation<T> = (database: MeetingMindDatabase) => T | Promise<T>;

const globalForPg = globalThis as typeof globalThis & { meetingMindPool?: Pool };
let writeQueue = Promise.resolve();
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

async function ensurePostgresState(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS meeting_mind_state (
          id SMALLINT PRIMARY KEY CHECK (id = 1),
          state JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(
        `INSERT INTO meeting_mind_state (id, state) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING`,
        [STATE_ID, JSON.stringify(getEmptyDatabase())]
      );
    })().catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }

  await schemaReady;
}

function usePostgres(): boolean {
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
    return JSON.parse(content) as MeetingMindDatabase;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const initial = getInitialDatabase();
    await writeFileDatabase(initial);
    return initial;
  }
}

async function writeFileDatabase(data: MeetingMindDatabase): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(DB_DIR, { recursive: true });
    data.meta.lastUpdated = new Date().toISOString();
    await fs.writeFile(TMP_FILE, JSON.stringify(data, null, 2), "utf-8");
    await fs.rename(TMP_FILE, DB_FILE);
  });
  await writeQueue;
}

export async function readDatabase(): Promise<MeetingMindDatabase> {
  if (!usePostgres()) return readFileDatabase();

  await ensurePostgresState();
  const result = await getPool().query<{ state: MeetingMindDatabase }>(
    "SELECT state FROM meeting_mind_state WHERE id = $1",
    [STATE_ID]
  );
  if (!result.rows[0]) throw new Error("Hosted database state row is missing.");
  return result.rows[0].state;
}

export async function mutateDatabase<T>(mutation: DatabaseMutation<T>): Promise<T> {
  if (!usePostgres()) {
    const database = await readFileDatabase();
    const result = await mutation(database);
    database.meta.version += 1;
    await writeFileDatabase(database);
    return result;
  }

  await ensurePostgresState();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ state: MeetingMindDatabase }>(
      "SELECT state FROM meeting_mind_state WHERE id = $1 FOR UPDATE",
      [STATE_ID]
    );
    if (!result.rows[0]) throw new Error("Hosted database state row is missing.");

    const database = result.rows[0].state;
    const value = await mutation(database);
    database.meta.version += 1;
    database.meta.lastUpdated = new Date().toISOString();
    await client.query(
      "UPDATE meeting_mind_state SET state = $2::jsonb, updated_at = NOW() WHERE id = $1",
      [STATE_ID, JSON.stringify(database)]
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
  if (!usePostgres()) {
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

