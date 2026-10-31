import fs from "fs/promises";
import path from "path";
import { MeetingMindDatabase, ConflictRecord } from "./types";
import { sampleMeetings, sampleDecisions, sampleTasks } from "@/data/mockData";

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "meeting_mind_db.json");
const TMP_FILE = path.join(DB_DIR, "meeting_mind_db.tmp.json");

let writeQueue = Promise.resolve();

const initialConflicts: ConflictRecord[] = [
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
  return {
    meetings: sampleMeetings,
    decisions: sampleDecisions,
    tasks: sampleTasks,
    conflicts: initialConflicts,
    meta: {
      version: 1,
      initializedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    },
  };
}

export async function readDatabase(): Promise<MeetingMindDatabase> {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    const content = await fs.readFile(DB_FILE, "utf-8");
    return JSON.parse(content) as MeetingMindDatabase;
  } catch (err: any) {
    if (err.code === "ENOENT") {
      const initial = getInitialDatabase();
      await writeDatabase(initial);
      return initial;
    }
    console.error("[db/store] Failed to read database, returning fresh fallback:", err);
    return getInitialDatabase();
  }
}

export async function writeDatabase(data: MeetingMindDatabase): Promise<void> {
  // Queue writes sequentially to prevent concurrent file write collisions
  writeQueue = writeQueue.then(async () => {
    try {
      await fs.mkdir(DB_DIR, { recursive: true });
      data.meta.lastUpdated = new Date().toISOString();
      const serialized = JSON.stringify(data, null, 2);

      // Write to tmp file first then rename for atomic file replacement
      await fs.writeFile(TMP_FILE, serialized, "utf-8");
      await fs.rename(TMP_FILE, DB_FILE);
    } catch (err) {
      console.error("[db/store] Failed to write database:", err);
      throw err;
    }
  });

  return writeQueue;
}

