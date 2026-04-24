import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type BotPlanId = "locked" | "free" | "starter" | "pro_voice" | "server_ops" | "internal";
export type BotFeatureId = "textTranslate" | "liveVoice" | "spokenVoice" | "staffLogs" | "reliability";

export type BotPremiumSettings = {
  enabled: boolean;
  plan: BotPlanId;
  features: Record<BotFeatureId, boolean>;
  priceMonthlyUsd: number;
  approvedBy?: string;
  approvedAt?: string;
  expiresAt?: string | null;
  notes?: string;
};

export const BOT_PLAN_PRICES: Record<BotPlanId, number> = {
  locked: 0,
  free: 0,
  starter: 19,
  pro_voice: 59,
  server_ops: 149,
  internal: 0,
};

export const BOT_PLAN_LABELS: Record<BotPlanId, string> = {
  locked: "Locked",
  free: "Free",
  starter: "Starter",
  pro_voice: "Pro Voice",
  server_ops: "Server Ops",
  internal: "NewHope Internal",
};

const PLAN_FEATURES: Record<BotPlanId, Record<BotFeatureId, boolean>> = {
  locked: {
    textTranslate: false,
    liveVoice: false,
    spokenVoice: false,
    staffLogs: false,
    reliability: false,
  },
  free: {
    textTranslate: true,
    liveVoice: false,
    spokenVoice: false,
    staffLogs: false,
    reliability: false,
  },
  starter: {
    textTranslate: true,
    liveVoice: false,
    spokenVoice: false,
    staffLogs: false,
    reliability: false,
  },
  pro_voice: {
    textTranslate: true,
    liveVoice: true,
    spokenVoice: true,
    staffLogs: false,
    reliability: true,
  },
  server_ops: {
    textTranslate: true,
    liveVoice: true,
    spokenVoice: true,
    staffLogs: true,
    reliability: true,
  },
  internal: {
    textTranslate: true,
    liveVoice: true,
    spokenVoice: true,
    staffLogs: true,
    reliability: true,
  },
};

const MAIN_GUILD_ID = process.env.GUILD_ID || process.env.DISCORD_GUILD_ID || "1419522458075005023";
const ENV_PREMIUM_GUILD_IDS = new Set(
  String(process.env.PREMIUM_GUILD_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);

export function defaultBotPremium(plan: BotPlanId = "free"): BotPremiumSettings {
  return {
    enabled: plan !== "locked",
    plan,
    features: { ...PLAN_FEATURES[plan] },
    priceMonthlyUsd: BOT_PLAN_PRICES[plan],
    expiresAt: null,
  };
}

export function normalizeBotPremium(input: unknown, fallbackPlan: BotPlanId = "free"): BotPremiumSettings {
  const raw = input && typeof input === "object" ? (input as Partial<BotPremiumSettings>) : {};
  const plan = raw.plan && raw.plan in BOT_PLAN_PRICES ? raw.plan : fallbackPlan;
  const base = defaultBotPremium(plan);
  const enabled = typeof raw.enabled === "boolean" ? raw.enabled : base.enabled;

  return {
    ...base,
    ...raw,
    enabled,
    plan,
    features: {
      ...base.features,
      ...(raw.features && typeof raw.features === "object" ? raw.features : {}),
    },
    priceMonthlyUsd:
      typeof raw.priceMonthlyUsd === "number" && raw.priceMonthlyUsd >= 0
        ? raw.priceMonthlyUsd
        : BOT_PLAN_PRICES[plan],
    expiresAt: raw.expiresAt ?? null,
  };
}

export async function getBotPremiumForGuild(guildId?: string | null): Promise<BotPremiumSettings> {
  if (!guildId) return defaultBotPremium("free");

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("bot_settings")
      .select("settings")
      .eq("guild_id", guildId)
      .maybeSingle();

    if (error) {
      console.error("[bot-premium] failed to read entitlement:", error.message);
      return defaultBotPremium("free");
    }

    const settings = data?.settings && typeof data.settings === "object" ? data.settings as Record<string, unknown> : {};
    if (settings.premium) {
      return normalizeBotPremium(settings.premium);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown premium access error";
    console.error("[bot-premium] admin entitlement check unavailable:", message);
    return defaultBotPremium("free");
  }

  if (guildId === MAIN_GUILD_ID) {
    return {
      ...defaultBotPremium("internal"),
      enabled: true,
      notes: "Main NewHopeGGN server receives full internal access until manually overridden.",
    };
  }

  if (ENV_PREMIUM_GUILD_IDS.has(guildId)) {
    return {
      ...defaultBotPremium("server_ops"),
      enabled: true,
      notes: "Enabled from PREMIUM_GUILD_IDS environment fallback until manually overridden.",
    };
  }

  return defaultBotPremium("free");
}

export async function canUseBotFeature(guildId: string | undefined, feature: BotFeatureId): Promise<boolean> {
  const premium = await getBotPremiumForGuild(guildId);
  if (!premium.enabled && feature !== "textTranslate") return false;

  if (premium.expiresAt && Date.now() > Date.parse(premium.expiresAt)) {
    return false;
  }

  return Boolean(premium.features[feature]);
}
