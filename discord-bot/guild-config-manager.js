const SITE_URL = process.env.SITE_URL || "https://newhopeggn.vercel.app";
const INGEST_SECRET =
  process.env.INGEST_SECRET ||
  process.env.DISCORD_INGEST_SECRET ||
  "";

const DEFAULT_CONFIG = {
  prefix: "/",
  language: "en",
  botNickname: "",
  logging: {
    enabled: Boolean(process.env.LOG_CHANNEL_ID),
    channelId: process.env.LOG_CHANNEL_ID || "",
    events: ["joins", "leaves", "bans", "commands", "voice", "errors"],
  },
  translation: {
    enabled: false,
    targetLang: process.env.VC_TARGET_LANG || "auto",
    channelIds: [],
    includeBotMessages: false,
  },
  ai: {
    enabled: false,
    tone: "default",
    frequency: "sometimes",
    bilingual: false,
    channelIds: [],
  },
  premium: {
    enabled: true,
    plan: "free",
    features: {
      textTranslate: true,
      liveVoice: false,
      spokenVoice: false,
      staffLogs: false,
      reliability: false,
    },
    priceMonthlyUsd: 0,
    expiresAt: null,
  },
};

const CACHE_TTL_MS = 30_000;
const configCache = new Map();
const configOverrides = new Map();

async function fetchGuildConfig(guildId) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${SITE_URL}/api/bot/guild-config`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: INGEST_SECRET, guildId }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok || !data?.settings) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }
    return {
      ...DEFAULT_CONFIG,
      ...data.settings,
      logging: { ...DEFAULT_CONFIG.logging, ...(data.settings.logging || {}) },
      translation: { ...DEFAULT_CONFIG.translation, ...(data.settings.translation || {}) },
      ai: { ...DEFAULT_CONFIG.ai, ...(data.settings.ai || {}) },
      premium: {
        ...DEFAULT_CONFIG.premium,
        ...(data.settings.premium || {}),
        features: {
          ...DEFAULT_CONFIG.premium.features,
          ...(data.settings.premium?.features || {}),
        },
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function getGuildConfig(guildId) {
  const now = Date.now();
  const override = configOverrides.get(guildId);
  if (override) {
    return override;
  }
  const cached = configCache.get(guildId);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  try {
    const value = guildId ? await fetchGuildConfig(guildId) : DEFAULT_CONFIG;
    configCache.set(guildId, { value, expiresAt: now + CACHE_TTL_MS });
    return value;
  } catch (error) {
    console.warn(`[bot] guild config fallback for ${guildId}: ${error?.message ?? error}`);
    const fallback = cached?.value || DEFAULT_CONFIG;
    configCache.set(guildId, { value: fallback, expiresAt: now + 10_000 });
    return fallback;
  }
}

function clearConfigCache(guildId) {
  if (guildId) {
    configOverrides.delete(guildId);
  } else {
    configOverrides.clear();
  }
  if (guildId) {
    configCache.delete(guildId);
    return;
  }
  configCache.clear();
}

function setGuildConfigOverride(guildId, patch) {
  if (!guildId || !patch || typeof patch !== "object") return null;
  const base =
    configOverrides.get(guildId) ||
    configCache.get(guildId)?.value ||
    DEFAULT_CONFIG;
  const next = {
    ...base,
    ...patch,
    logging: { ...base.logging, ...(patch.logging || {}) },
    translation: { ...base.translation, ...(patch.translation || {}) },
    ai: { ...base.ai, ...(patch.ai || {}) },
    premium: {
      ...base.premium,
      ...(patch.premium || {}),
      features: {
        ...base.premium.features,
        ...(patch.premium?.features || {}),
      },
    },
  };
  configOverrides.set(guildId, next);
  configCache.set(guildId, { value: next, expiresAt: Date.now() + CACHE_TTL_MS });
  return next;
}

module.exports = { getGuildConfig, clearConfigCache, setGuildConfigOverride };
