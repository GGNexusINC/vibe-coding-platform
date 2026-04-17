import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

export type AdminStatus = "approved" | "pending" | "denied";

export type AdminEntry = {
  id: string;
  discordId: string;
  username: string;
  avatarUrl?: string;
  status: AdminStatus;
  addedAt: string;
  updatedAt: string;
};

const TABLE = "admin_roster";
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "admin-roster.json");

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function readFile(): AdminEntry[] {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw) as AdminEntry[];
  } catch {
    return [];
  }
}

function writeFile(entries: AdminEntry[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2), "utf8");
  } catch {
    console.warn("admin-roster: fs write skipped (read-only env)");
  }
}

function mapRow(row: Record<string, unknown>): AdminEntry {
  return {
    id: String(row.id),
    discordId: String(row.discord_id),
    username: String(row.username ?? ""),
    avatarUrl: (row.avatar_url as string | null) ?? undefined,
    status: (row.status as AdminStatus) ?? "pending",
    addedAt: String(row.added_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getRoster(): Promise<AdminEntry[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .order("added_at", { ascending: false });
    if (!error && data) return data.map((r) => mapRow(r as Record<string, unknown>));
  }
  return readFile();
}

export async function upsertAdmin(entry: Omit<AdminEntry, "id" | "addedAt" | "updatedAt"> & { id?: string }): Promise<AdminEntry> {
  const now = new Date().toISOString();
  const sb = getSupabase();

  if (sb) {
    const { data, error } = await sb
      .from(TABLE)
      .upsert(
        {
          discord_id: entry.discordId,
          username: entry.username,
          avatar_url: entry.avatarUrl ?? null,
          status: entry.status,
          added_at: now,
          updated_at: now,
        },
        { onConflict: "discord_id" },
      )
      .select()
      .single();

    if (!error && data) return mapRow(data as Record<string, unknown>);
  }

  const roster = readFile();
  const existing = roster.find((e) => e.discordId === entry.discordId);
  if (existing) {
    existing.username = entry.username;
    existing.avatarUrl = entry.avatarUrl;
    existing.status = entry.status;
    existing.updatedAt = now;
    writeFile(roster);
    return existing;
  }
  const newEntry: AdminEntry = {
    id: crypto.randomUUID(),
    discordId: entry.discordId,
    username: entry.username,
    avatarUrl: entry.avatarUrl,
    status: entry.status,
    addedAt: now,
    updatedAt: now,
  };
  roster.unshift(newEntry);
  writeFile(roster);
  return newEntry;
}

export async function updateAdminStatus(discordId: string, status: AdminStatus): Promise<boolean> {
  const now = new Date().toISOString();
  const sb = getSupabase();

  if (sb) {
    const { data, error } = await sb
      .from(TABLE)
      .update({ status, updated_at: now })
      .eq("discord_id", discordId)
      .select("id");
    if (!error && data && data.length > 0) return true;
    if (!error && data && data.length === 0) {
      // Row doesn't exist yet — insert it as a placeholder
      const { error: insertErr } = await sb.from(TABLE).insert({
        discord_id: discordId,
        username: discordId,
        status,
        added_at: now,
        updated_at: now,
      });
      return !insertErr;
    }
    if (error) console.error("admin-roster updateAdminStatus Supabase error", error);
  }

  const roster = readFile();
  const entry = roster.find((e) => e.discordId === discordId);
  if (!entry) return false;
  entry.status = status;
  entry.updatedAt = now;
  writeFile(roster);
  return true;
}

export async function getAdminByDiscordId(discordId: string): Promise<AdminEntry | null> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("discord_id", discordId)
      .single();
    if (!error && data) return mapRow(data as Record<string, unknown>);
  }
  const roster = readFile();
  return roster.find((e) => e.discordId === discordId) ?? null;
}
