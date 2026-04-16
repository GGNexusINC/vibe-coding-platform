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

export const env = {
  supabaseUrl: () => requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  adminDiscordId: () => getEnv("ADMIN_DISCORD_ID") ?? "",
  adminDiscordIds: (): Set<string> => {
    const raw = getEnv("ADMIN_DISCORD_IDS") ?? getEnv("ADMIN_DISCORD_ID") ?? "";
    return new Set(
      raw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    );
  },
  discordWebhookUrl: () => getEnv("DISCORD_WEBHOOK_URL") ?? "",
  discordWebhookUrlForPage: (page: string) => {
    const pageMap: Record<string, string> = {
      "ban-page": "DISCORD_WEBHOOK_URL_BAN_PAGE",
      "general-chat": "DISCORD_WEBHOOK_URL_GENERAL_CHAT",
    };

    const envKey = pageMap[page];
    if (!envKey) return getEnv("DISCORD_WEBHOOK_URL") ?? "";
    return getEnv(envKey) ?? getEnv("DISCORD_WEBHOOK_URL") ?? "";
  },
  hasSupabase: () =>
    Boolean(getEnv("NEXT_PUBLIC_SUPABASE_URL") && getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")),
};

