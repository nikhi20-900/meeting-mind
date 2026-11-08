import fs from "node:fs/promises";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("Set DATABASE_URL before importing the local Meeting Mind store.");
}

const sourceFile = new URL("../data/meeting_mind_db.json", import.meta.url);
const state = JSON.parse(await fs.readFile(sourceFile, "utf8"));
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
});

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS meeting_mind_state (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      state JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const current = await pool.query("SELECT state FROM meeting_mind_state WHERE id = 1");
  if (current.rows[0]) {
    const existing = current.rows[0].state;
    const hasData = ["meetings", "decisions", "tasks", "conflicts"].some(
      (key) => Array.isArray(existing[key]) && existing[key].length > 0
    );
    if (hasData) {
      throw new Error("The PostgreSQL store already has records. Import stopped to avoid overwriting them.");
    }
  }

  await pool.query(
    `INSERT INTO meeting_mind_state (id, state, updated_at)
     VALUES (1, $1::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
    [JSON.stringify(state)]
  );
  process.stdout.write("Imported the local Meeting Mind store into PostgreSQL.\n");
} finally {
  await pool.end();
}
