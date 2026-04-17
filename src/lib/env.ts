function getEnv(key: string): string | undefined {
  const v = process.env[key];
  if (!v) return undefined;
  return v;
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
  { discordId: "Hope",                username: "Hope",        role: "admin" },
  { discordId: "Encriptado",          username: "Encriptado",  role: "admin" },
  { discordId: "Jon",                 username: "Jon",         role: "admin" },
  { discordId: "Cortez",              username: "Cortez",      role: "admin" },
];

export const env = {
  supabaseUrl: () => requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  adminDiscordId: () => getEnv("ADMIN_DISCORD_ID") ?? "",
  adminDiscordIds: (): Set<string> => {
    const raw = getEnv("ADMIN_DISCORD_IDS") ?? getEnv("ADMIN_DISCORD_ID") ?? "";
    const fromEnv = raw.split(",").map((id) => id.trim()).filter(Boolean);
    // Hardcoded owner IDs — always treated as owners regardless of env var
    const hardcoded = KNOWN_ADMINS.map((a) => a.discordId);
    return new Set([...hardcoded, ...fromEnv]);
  },
  discordWebhookUrl: () => getEnv("DISCORD_WEBHOOK_URL") ?? "",
  discordWebhookUrlForPage: (page: string) => {
    const MINIGAME_WEBHOOK = "https://discord.com/api/webhooks/1494545044621754368/ozdRWCpgTAYD8JHHvNLtoPwAZQRCnIy0KRrgQcallOkrnpmaKHSPQs6F5erFj-H2xVCM";
    const pageMap: Record<string, string> = {
      "ban-page":     "DISCORD_WEBHOOK_URL_BAN_PAGE",
      "general-chat": "DISCORD_WEBHOOK_URL_GENERAL_CHAT",
      "script-hook":  "DISCORD_WEBHOOK_URL_SCRIPT_HOOK",
      "minigame":     "DISCORD_WEBHOOK_URL_MINIGAME",
    };
    // Hardcoded fallbacks per page in case env vars are not set
    const hardcodedFallbacks: Record<string, string> = {
      "ban-page":     "https://discord.com/api/webhooks/1494440796781416509/XlClx_S7OOOfwlurlnN3FWCnBbpyVFmnbv-LDdbz63Yh4zFoU3uwXAwNbv1gsDMjY4D-",
      "general-chat": "https://discord.com/api/webhooks/1494441156543778946/8HQYfkDh-GpQN_O9pmkd-_21dQV01TU3qrV3nxfMJbls8T_pStfNdnKt3WA9Y9ol6b8m",
      "script-hook":  MINIGAME_WEBHOOK,
      "minigame":     MINIGAME_WEBHOOK,
    };

    const envKey = pageMap[page];
    if (!envKey) return getEnv("DISCORD_WEBHOOK_URL") ?? "";
    return getEnv(envKey) ?? hardcodedFallbacks[page] ?? getEnv("DISCORD_WEBHOOK_URL") ?? "";
  },
  hasSupabase: () =>
    Boolean(getEnv("NEXT_PUBLIC_SUPABASE_URL") && getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")),
};

