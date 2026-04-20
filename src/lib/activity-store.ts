import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { ActivityLogEntry } from "@/lib/activity-log";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "activity-log.json");
const TABLE_NAME = "activity_logs";

function ensureStoreFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf8");
  }
}

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mapRowToEntry(row: Record<string, unknown>): ActivityLogEntry {
  return {
    id: String(row.id),
    type: row.type as ActivityLogEntry["type"],
    createdAt: String(row.created_at),
    username: (row.username as string | null) ?? undefined,
    discordId: (row.discord_id as string | null) ?? undefined,
    avatarUrl: (row.avatar_url as string | null) ?? undefined,
    globalName: (row.global_name as string | null) ?? undefined,
    discriminator: (row.discriminator as string | null) ?? undefined,
    profile: (row.profile as Record<string, unknown> | null) ?? undefined,
    details: String(row.details ?? ""),
    metadata: (row.metadata as ActivityLogEntry["metadata"] | null) ?? undefined,
  };
}

function mapEntryToRow(entry: ActivityLogEntry) {
  return {
    id: entry.id,
    type: entry.type,
    created_at: entry.createdAt,
    username: entry.username ?? null,
    discord_id: entry.discordId ?? null,
    avatar_url: entry.avatarUrl ?? null,
    global_name: entry.globalName ?? null,
    discriminator: entry.discriminator ?? null,
    profile: entry.profile ?? null,
    details: entry.details,
    metadata: entry.metadata ?? null,
  };
}

function readActivityEntriesFromFile(): ActivityLogEntry[] {
  ensureStoreFile();

  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as ActivityLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeActivityEntriesToFile(entries: ActivityLogEntry[]) {
  ensureStoreFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2), "utf8");
}

export async function readActivityEntries(): Promise<ActivityLogEntry[]> {
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);

    if (!error && data) {
      return data.map((row) => mapRowToEntry(row));
    }
  }

  return readActivityEntriesFromFile();
}

export async function appendActivityEntry(entry: ActivityLogEntry, maxLogs: number) {
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    const { error } = await supabase.from(TABLE_NAME).insert(mapEntryToRow(entry));

    if (!error) {
      // Persist active day permanently so pruning logs never resets the counter
      if (entry.discordId) {
        const day = entry.createdAt.slice(0, 10);
        await Promise.resolve(
          supabase
            .from("user_active_days")
            .upsert({ discord_id: entry.discordId, day }, { onConflict: "discord_id,day" })
        ).catch(() => {});
      }

      const { data: overflowRows } = await supabase
        .from(TABLE_NAME)
        .select("id")
        .order("created_at", { ascending: false })
        .range(maxLogs, maxLogs + 500);

      const overflowIds = (overflowRows ?? []).map((row) => String(row.id));
      if (overflowIds.length) {
        await supabase.from(TABLE_NAME).delete().in("id", overflowIds);
      }
      return;
    }
  }

  try {
    const store = readActivityEntriesFromFile();
    store.unshift(entry);
    if (store.length > maxLogs) {
      store.length = maxLogs;
    }
    writeActivityEntriesToFile(store);
  } catch {
    // Filesystem is read-only in serverless environments (e.g. Vercel).
    // Log is skipped but execution continues so webhooks still fire.
    console.warn("activity-store: filesystem write skipped (read-only environment)");
  }
}
