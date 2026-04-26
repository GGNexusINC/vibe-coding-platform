function getEnv(key: string): string | undefined {
  const v = process.env[key];
  if (!v) return undefined;
  return v.trim();
}

export function requireEnv(key: string): string {
  const v = getEnv(key);
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

export type KnownAdmin = { discordId: string; username: string; role: "owner" | "admin" };

export const KNOWN_ADMINS: KnownAdmin[] = [
  { discordId: "940804710267486249",  username: "Kilo",        role: "owner" },
  { discordId: "1310794181190352997", username: "Buzzworthy",  role: "owner" },
  { discordId: "145278391166173185",  username: "Zeus",        role: "owner" },
  { discordId: "1142676239283396638", username: "JosNL32",     role: "owner" },
];

export const env = {
  supabaseUrl: () => requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  adminDiscordId: () => getEnv("ADMIN_DISCORD_ID") ?? "",
  discordIngestSecrets: (): string[] => {
    return [
      getEnv("DISCORD_INGEST_SECRET"),
      getEnv("INGEST_SECRET"),
      getEnv("BOT_STATUS_SECRET"),
      getEnv("DISCORD_BOT_STATUS_SECRET"),
      "newhopeggn-bot-secret",
    ]
      .map((value) => value?.trim())
      .filter(
        (value, index, arr): value is string => Boolean(value) && arr.indexOf(value) === index,
      );
  },
  discordIngestSecret: () =>
    getEnv("DISCORD_INGEST_SECRET") ?? getEnv("INGEST_SECRET") ?? "newhopeggn-bot-secret",
  ingestSecret: () =>
    getEnv("INGEST_SECRET") ?? getEnv("DISCORD_INGEST_SECRET") ?? "newhopeggn-bot-secret",
  discordLogChannelId: () => getEnv("LOG_CHANNEL_ID") ?? "",
  flyApiToken: () => getEnv("FLY_API_TOKEN") ?? getEnv("FLY_ACCESS_TOKEN") ?? "",
  flyBotAppName: () => getEnv("FLY_BOT_APP_NAME") ?? getEnv("FLY_APP_NAME") ?? "newhopeggn-discord-bot",
  adminDiscordIds: (): Set<string> => {
    const raw = getEnv("ADMIN_DISCORD_IDS") ?? getEnv("ADMIN_DISCORD_ID") ?? "";
    const fromEnv = raw.split(",").map((id) => id.trim()).filter(Boolean);
    // Hardcoded owner IDs — always treated as owners regardless of env var
    const hardcoded = KNOWN_ADMINS.map((a) => a.discordId);
    return new Set([...hardcoded, ...fromEnv]);
  },
  discordBotToken: () => {
    // Check multiple possible env var names
    const token = getEnv("DISCORD_BOT_TOKEN") || 
                  getEnv("BOT_TOKEN") || 
                  getEnv("DISCORD_TOKEN") ||
                  getEnv("TOKEN");
    if (!token) {
      console.log("[env] No bot token found. Checked: DISCORD_BOT_TOKEN, BOT_TOKEN, DISCORD_TOKEN, TOKEN");
    }
    return token ?? "";
  },
  discordGuildId: () => getEnv("DISCORD_GUILD_ID") ?? "1419522458075005023",
  discordTicketsCategory: () => getEnv("DISCORD_TICKETS_CATEGORY") ?? "",
  discordWebhookUrl: () => getEnv("DISCORD_WEBHOOK_URL") ?? "https://discord.com/api/webhooks/1497710664909586533/5YRpNfMVANF0bLlB2gi-oRG8_l0y-_brYW0wvvL36TwUlo00PajemYpdp8koDbhB0N-d",
  discordWebhookUrlForPage: (page: string) => {
    const pageMap: Record<string, string> = {
      "ban-page":     "DISCORD_WEBHOOK_URL_BAN_PAGE",
      "general-chat": "DISCORD_WEBHOOK_URL_GENERAL_CHAT",
      "staff-page":   "DISCORD_WEBHOOK_URL_STAFF_PAGE",
      "staff-audits": "DISCORD_WEBHOOK_URL_STAFF_AUDITS",
      "login-audits": "DISCORD_WEBHOOK_URL_LOGIN_AUDITS",
      "server-audit": "DISCORD_WEBHOOK_URL_SERVER_AUDIT",
      "support":      "DISCORD_WEBHOOK_URL_SUPPORT",
      "tickets":      "DISCORD_WEBHOOK_URL_TICKETS",
      "script-hook":  "DISCORD_WEBHOOK_URL_SCRIPT_HOOK",
      "minigame":     "DISCORD_WEBHOOK_URL_MINIGAME",
      "wipe":         "DISCORD_WEBHOOK_URL_WIPE",
      "arena":        "DISCORD_WEBHOOK_URL_ARENA",
      "arena-logos":   "DISCORD_WEBHOOK_URL_ARENA_LOGOS",
    };

    const envKey = pageMap[page];
    const userFallback = "https://discord.com/api/webhooks/1497710664909586533/5YRpNfMVANF0bLlB2gi-oRG8_l0y-_brYW0wvvL36TwUlo00PajemYpdp8koDbhB0N-d";
    const envFallback = getEnv("DISCORD_WEBHOOK_URL") ?? userFallback;
    
    return getEnv(envKey) ?? envFallback;
  },
  hasSupabase: () =>
    Boolean(getEnv("NEXT_PUBLIC_SUPABASE_URL") && getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")),
};

