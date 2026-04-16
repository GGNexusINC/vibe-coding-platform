import { env } from "@/lib/env";

type DiscordWebhookPayload = {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: Array<Record<string, unknown>>;
};

function redactWebhookUrl(input: string) {
  try {
    const u = new URL(input);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return "[invalid url]";
  }
}

export async function sendDiscordWebhook(
  payload: DiscordWebhookPayload,
  options?: { webhookUrl?: string; required?: boolean },
) {
  const url = options?.webhookUrl || env.discordWebhookUrl();
  if (!url) {
    if (options?.required) {
      console.error(
        "Discord webhook missing: DISCORD_WEBHOOK_URL (or page-specific) is not set.",
      );
      throw new Error(
        "Discord webhook URL is not configured on the server. Set DISCORD_WEBHOOK_URL (and/or page-specific webhook env vars).",
      );
    }
    return;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("Discord webhook failed", {
      url: redactWebhookUrl(url),
      status: res.status,
      body: txt.slice(0, 500),
    });
    throw new Error(`Discord webhook failed: ${res.status} ${txt}`);
  }
}

