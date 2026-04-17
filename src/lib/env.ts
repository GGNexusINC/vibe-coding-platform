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
    const fromEnv = raw.split(",").map((id) => id.trim()).filter(Boolean);
    // Hardcoded owner IDs — always treated as owners regardless of env var
    const hardcoded = ["940804710267486249", "1310794181190352997", "145278391166173185"];
    return new Set([...hardcoded, ...fromEnv]);
  },
  discordWebhookUrl: () => getEnv("DISCORD_WEBHOOK_URL") ?? "",
  discordWebhookUrlForPage: (page: string) => {
    const pageMap: Record<string, string> = {
      "ban-page": "DISCORD_WEBHOOK_URL_BAN_PAGE",
      "general-chat": "DISCORD_WEBHOOK_URL_GENERAL_CHAT",
      "script-hook": "DISCORD_WEBHOOK_URL_SCRIPT_HOOK",
    };
    // Hardcoded fallbacks per page in case env vars are not set
    const hardcodedFallbacks: Record<string, string> = {
      "ban-page": "https://discord.com/api/webhooks/1494440796781416509/XlClx_S7OOOfwlurlnN3FWCnBbpyVFmnbv-LDdbz63Yh4zFoU3uwXAwNbv1gsDMjY4D-",
      "script-hook": "https://discord.com/api/webhooks/1494538229439926432/xYF_wqhCXTbIUDLplUuh7NRUJ9m0Xh-8d8hMlTbkvvbROTXjB8iipzOmk51Jgg21QX2_is",
    };

    const envKey = pageMap[page];
    if (!envKey) return getEnv("DISCORD_WEBHOOK_URL") ?? "";
    return getEnv(envKey) ?? hardcodedFallbacks[page] ?? getEnv("DISCORD_WEBHOOK_URL") ?? "";
  },
  hasSupabase: () =>
    Boolean(getEnv("NEXT_PUBLIC_SUPABASE_URL") && getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")),
};

