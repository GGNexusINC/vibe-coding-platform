import type { SupabaseClient } from "@supabase/supabase-js";

export type HiveMember = {
  discord_id: string;
  username: string;
  avatar_url: string | null;
  role: "owner" | "officer" | "member";
  joined_at: string;
};

export type HiveRecord = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  owner_username: string;
  map_label: string;
  map_x: number;
  map_y: number;
  level: number;
  xp: number;
  next_reward_xp: number;
  status: "active" | "quiet" | "under_attack";
  members: HiveMember[];
  activity_log: {
    id: string;
    actor_id: string;
    actor_username: string;
    action: string;
    xp: number;
    created_at: string;
  }[];
  created_at: string;
  updated_at: string;
};

type HiveStore = {
  hives: HiveRecord[];
};

const HIVE_STORE_KEY = "hive_command_store_v1";

export function xpForNextLevel(level: number) {
  return Math.max(100, level * 125);
}

export async function loadHiveStore(sb: SupabaseClient): Promise<HiveStore> {
  const { data, error } = await sb
    .from("site_settings")
    .select("value")
    .eq("key", HIVE_STORE_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(`Hive store read failed: ${error.message}`);
  }

  const store = data?.value as Partial<HiveStore> | null;
  return {
    hives: Array.isArray(store?.hives) ? store.hives as HiveRecord[] : [],
  };
}

export async function saveHiveStore(sb: SupabaseClient, store: HiveStore) {
  const { error } = await sb
    .from("site_settings")
    .upsert({
      key: HIVE_STORE_KEY,
      value: store,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });

  if (error) {
    throw new Error(`Hive store save failed: ${error.message}`);
  }
}

export async function listHives(sb: SupabaseClient) {
  const store = await loadHiveStore(sb);
  return store.hives.sort((a, b) => b.level - a.level || b.xp - a.xp || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export async function createHive(sb: SupabaseClient, opts: {
  user: { discord_id: string; username: string; avatar_url?: string | null };
  name: string;
  description?: string | null;
  mapLabel: string;
  mapX: number;
  mapY: number;
}) {
  const store = await loadHiveStore(sb);
  const now = new Date().toISOString();
  const hive: HiveRecord = {
    id: crypto.randomUUID(),
    name: opts.name.trim(),
    description: opts.description?.trim() || null,
    owner_id: opts.user.discord_id,
    owner_username: opts.user.username,
    map_label: opts.mapLabel.trim() || "Unmarked territory",
    map_x: Math.min(100, Math.max(0, opts.mapX)),
    map_y: Math.min(100, Math.max(0, opts.mapY)),
    level: 1,
    xp: 0,
    next_reward_xp: xpForNextLevel(1),
    status: "active",
    members: [{
      discord_id: opts.user.discord_id,
      username: opts.user.username,
      avatar_url: opts.user.avatar_url ?? null,
      role: "owner",
      joined_at: now,
    }],
    activity_log: [{
      id: crypto.randomUUID(),
      actor_id: opts.user.discord_id,
      actor_username: opts.user.username,
      action: "created hive",
      xp: 0,
      created_at: now,
    }],
    created_at: now,
    updated_at: now,
  };
  store.hives = [hive, ...store.hives].slice(0, 100);
  await saveHiveStore(sb, store);
  return hive;
}

export async function updateHive(sb: SupabaseClient, hiveId: string, updater: (hive: HiveRecord) => HiveRecord | null) {
  const store = await loadHiveStore(sb);
  const index = store.hives.findIndex((hive) => hive.id === hiveId);
  if (index < 0) return null;
  const next = updater(store.hives[index]);
  if (!next) return null;
  store.hives[index] = { ...next, updated_at: new Date().toISOString() };
  await saveHiveStore(sb, store);
  return store.hives[index];
}

export function applyHiveXp(hive: HiveRecord, xpGain: number) {
  let xp = hive.xp + xpGain;
  let level = hive.level;
  let next = hive.next_reward_xp || xpForNextLevel(level);
  while (xp >= next) {
    xp -= next;
    level += 1;
    next = xpForNextLevel(level);
  }
  return { ...hive, xp, level, next_reward_xp: next };
}
