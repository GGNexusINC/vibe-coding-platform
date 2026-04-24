import { createClient } from "@supabase/supabase-js";
import { appendActivityEntry, readActivityEntries } from "@/lib/activity-store";

const TABLE = "site_settings";
const KEY = "bot_system_status";
const EVENTS_KEY = "bot_ops_events";

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

export type BotConnectionStatus = {
  guildId: string;
  guildName: string | null;
  voiceChannelId: string | null;
  voiceChannelName: string | null;
  connectionState: string;
  listenerCount: number;
  deepgramState: "open" | "closed" | "unknown";
  requesterId: string | null;
  targetLang: string | null;
  startedAt: string | null;
};

export type BotSystemStatus = {
  service: "discord-bot";
  status: "starting" | "online" | "degraded" | "offline";
  botId: string | null;
  botTag: string | null;
  ready: boolean;
  uptimeMs: number;
  heartbeatAt: string;
  discord: {
    guilds: number;
    voiceConnections: number;
  };
  deepgram: {
    configured: boolean;
    activeSessions: number;
  };
  stt?: {
    mode: "deepgram" | "local" | "hybrid";
    localWorkerConfigured: boolean;
    localWorkerUrl?: string | null;
  };
  voice: {
    activeListeners: number;
    connections: BotConnectionStatus[];
  };
  notes?: string[];
  lastError?: string | null;
};

export type BotOpsEvent = {
  id: string;
  kind: "status" | "voice" | "restart" | "error" | "info";
  title: string;
  detail: string;
  createdAt: string;
  meta?: Record<string, unknown>;
};

export async function readBotSystemStatus(): Promise<{ updatedAt: string; snapshot: BotSystemStatus } | null> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from(TABLE)
      .select("value, updated_at")
      .eq("key", KEY)
      .maybeSingle();

    if (!error && data?.value) {
      return {
        updatedAt: String(data.updated_at ?? ""),
        snapshot: data.value as BotSystemStatus,
      };
    }
  }

  const fallback = (await readActivityEntries(80)).find((entry) => {
    return entry.type === "bot_status" && entry.metadata?.snapshot && typeof entry.metadata.snapshot === "object";
  });

  if (!fallback?.metadata?.snapshot) return null;
  return {
    updatedAt: fallback.createdAt,
    snapshot: fallback.metadata.snapshot as BotSystemStatus,
  };
}

export async function writeBotSystemStatus(snapshot: BotSystemStatus) {
  const sb = getSupabase();
  if (!sb) {
    await writeBotStatusFallback(snapshot);
    return true;
  }

  const { error } = await sb.from(TABLE).upsert(
    {
      key: KEY,
      value: snapshot,
    },
    { onConflict: "key" },
  );

  if (error) {
    console.warn("[bot-status] site_settings write failed, using activity fallback:", error.message);
    await writeBotStatusFallback(snapshot);
    return true;
  }

  return true;
}

async function writeBotStatusFallback(snapshot: BotSystemStatus) {
  await appendActivityEntry(
    {
      id: `bot-status-${Date.now()}`,
      type: "bot_status",
      createdAt: new Date().toISOString(),
      username: snapshot.botTag ?? "NEWHOPEGGN",
      discordId: snapshot.botId ?? undefined,
      details: `${snapshot.botTag ?? "Discord bot"} heartbeat: ${snapshot.status}`,
      metadata: {
        service: snapshot.service,
        status: snapshot.status,
        heartbeatAt: snapshot.heartbeatAt,
        snapshot: snapshot as unknown as Record<string, unknown>,
      },
    },
    300,
  );
}

export async function readBotOpsEvents(): Promise<BotOpsEvent[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from(TABLE)
    .select("value")
    .eq("key", EVENTS_KEY)
    .maybeSingle();

  if (error || !data?.value) return [];
  const raw = Array.isArray(data.value) ? data.value : [];
  return raw.filter(Boolean) as BotOpsEvent[];
}

export async function appendBotOpsEvent(event: Omit<BotOpsEvent, "id" | "createdAt">) {
  const sb = getSupabase();
  if (!sb) return false;

  const existing = await readBotOpsEvents();
  const next = [
    {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...event,
    },
    ...existing,
  ].slice(0, 20);

  const { error } = await sb.from(TABLE).upsert(
    {
      key: EVENTS_KEY,
      value: next,
    },
    { onConflict: "key" },
  );

  if (error) {
    throw error;
  }

  return true;
}
