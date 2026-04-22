import type { SupabaseClient } from "@supabase/supabase-js";

export type RaidParticipant = {
  id: string;
  raid_id: string;
  discord_id: string;
  username: string;
  avatar_url: string | null;
  role: string;
  status: string;
  joined_at: string;
};

export type RaidRecord = {
  id: string;
  created_by: string;
  creator_username: string;
  creator_avatar_url: string | null;
  target_location: string;
  raid_type: string;
  enemy_count: number | null;
  description: string | null;
  status: string;
  start_time: string | null;
  expires_at: string;
  team_size: number;
  discord_notified: boolean;
  created_at: string;
  updated_at: string;
  raid_participants: RaidParticipant[];
};

type RaidStore = {
  raids: RaidRecord[];
};

export const DEFAULT_RAID_ROLES = [
  { id: "leader", label: "Raid Leader", emoji: "Crown", description: "Coordinates the raid and makes tactical decisions", color: "#fbbf24", display_order: 1 },
  { id: "miner", label: "Miner", emoji: "Pick", description: "Gathers resources and breaks through structures", color: "#ef4444", display_order: 2 },
  { id: "builder", label: "Builder", emoji: "Build", description: "Sets up base defenses and builds structures", color: "#3b82f6", display_order: 3 },
  { id: "pvp", label: "PvP Fighter", emoji: "Sword", description: "Engages in combat and protects the team", color: "#dc2626", display_order: 4 },
  { id: "scout", label: "Scout", emoji: "Scope", description: "Gathers intel and spots enemies", color: "#22c55e", display_order: 5 },
  { id: "medic", label: "Medic", emoji: "Medic", description: "Heals and supports team members", color: "#ec4899", display_order: 6 },
  { id: "driver", label: "Driver/Pilot", emoji: "Pilot", description: "Operates vehicles for transport or combat", color: "#f59e0b", display_order: 7 },
  { id: "member", label: "Team Member", emoji: "Team", description: "General raid participant", color: "#64748b", display_order: 8 },
];

const RAID_STORE_KEY = "raid_store_v1";

export function isMissingRaidTableError(error: unknown) {
  const maybe = error as { code?: string; message?: string } | null;
  const message = maybe?.message?.toLowerCase() || "";
  return maybe?.code === "PGRST205" || ["public.raids", "public.raid_participants", "public.raid_roles", "public.raid_activity_log"].some((table) => message.includes(table));
}

export async function loadFallbackRaidStore(sb: SupabaseClient): Promise<RaidStore> {
  const { data, error } = await sb
    .from("site_settings")
    .select("value")
    .eq("key", RAID_STORE_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(`Raid fallback store read failed: ${error.message}`);
  }

  const store = data?.value as Partial<RaidStore> | null;
  return {
    raids: Array.isArray(store?.raids) ? store.raids as RaidRecord[] : [],
  };
}

export async function saveFallbackRaidStore(sb: SupabaseClient, store: RaidStore) {
  const { error } = await sb
    .from("site_settings")
    .upsert({
      key: RAID_STORE_KEY,
      value: store,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });

  if (error) {
    throw new Error(`Raid fallback store save failed: ${error.message}`);
  }
}

export async function listFallbackRaids(sb: SupabaseClient) {
  const store = await loadFallbackRaidStore(sb);
  const now = Date.now();
  let changed = false;
  const raids = store.raids.map((raid) => {
    if ((raid.status === "pending" || raid.status === "active") && new Date(raid.expires_at).getTime() < now) {
      changed = true;
      return { ...raid, status: "expired", updated_at: new Date().toISOString() };
    }
    return raid;
  });
  if (changed) await saveFallbackRaidStore(sb, { raids });
  return raids
    .filter((raid) => raid.status === "pending" || raid.status === "active")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function createFallbackRaid(sb: SupabaseClient, opts: {
  user: { discord_id: string; username: string; avatar_url?: string | null };
  targetLocation: string;
  raidType: string;
  enemyCount?: number | null;
  description?: string | null;
  teamSize: number;
  startTime?: string | null;
  expiresInMinutes: number;
  role?: string;
}) {
  const store = await loadFallbackRaidStore(sb);
  const now = new Date().toISOString();
  const raid: RaidRecord = {
    id: crypto.randomUUID(),
    created_by: opts.user.discord_id,
    creator_username: opts.user.username,
    creator_avatar_url: opts.user.avatar_url ?? null,
    target_location: opts.targetLocation.trim(),
    raid_type: opts.raidType,
    enemy_count: opts.enemyCount ?? null,
    description: opts.description?.trim() || null,
    status: "pending",
    start_time: opts.startTime || null,
    expires_at: new Date(Date.now() + opts.expiresInMinutes * 60000).toISOString(),
    team_size: opts.teamSize,
    discord_notified: false,
    created_at: now,
    updated_at: now,
    raid_participants: [{
      id: crypto.randomUUID(),
      raid_id: "",
      discord_id: opts.user.discord_id,
      username: opts.user.username,
      avatar_url: opts.user.avatar_url ?? null,
      role: opts.role || "leader",
      status: "confirmed",
      joined_at: now,
    }],
  };
  raid.raid_participants[0].raid_id = raid.id;
  store.raids = [raid, ...store.raids].slice(0, 100);
  await saveFallbackRaidStore(sb, store);
  return raid;
}

export async function updateFallbackRaid(sb: SupabaseClient, raidId: string, updater: (raid: RaidRecord) => RaidRecord | null) {
  const store = await loadFallbackRaidStore(sb);
  const index = store.raids.findIndex((raid) => raid.id === raidId);
  if (index < 0) return null;
  const next = updater(store.raids[index]);
  if (!next) return null;
  store.raids[index] = { ...next, updated_at: new Date().toISOString() };
  await saveFallbackRaidStore(sb, store);
  return store.raids[index];
}

export async function getFallbackRaid(sb: SupabaseClient, raidId: string) {
  const store = await loadFallbackRaidStore(sb);
  return store.raids.find((raid) => raid.id === raidId) ?? null;
}
