import { env } from "@/lib/env";

export type DiscordWebhookPayload = {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: Array<Record<string, unknown>>;
};

export const NEWHOPE_DISCORD_NAME = "NewHopeGGN Logs";
export const NEWHOPE_LOGO_URL = "https://newhopeggn.vercel.app/raidzone-bg.png";
export const NEWHOPE_FOOTER_TEXT = "NewHopeGGN Official Server Log";

export function brandDiscordEmbed(
  embed: Record<string, unknown>,
  footerText = NEWHOPE_FOOTER_TEXT,
): Record<string, unknown> {
  const author =
    embed.author && typeof embed.author === "object" && !Array.isArray(embed.author)
      ? {
          ...(embed.author as Record<string, unknown>),
          icon_url: NEWHOPE_LOGO_URL,
        }
      : {
          name: "NewHopeGGN Official",
          icon_url: NEWHOPE_LOGO_URL,
        };
  const footer =
    embed.footer && typeof embed.footer === "object" && !Array.isArray(embed.footer)
      ? {
          ...(embed.footer as Record<string, unknown>),
          icon_url: NEWHOPE_LOGO_URL,
        }
      : {
          text: footerText,
          icon_url: NEWHOPE_LOGO_URL,
        };

  return {
    ...embed,
    author,
    thumbnail: embed.thumbnail ?? { url: NEWHOPE_LOGO_URL },
    footer,
    timestamp: embed.timestamp ?? new Date().toISOString(),
  };
}

export function brandDiscordWebhookPayload(
  payload: DiscordWebhookPayload,
  options?: { username?: string; footerText?: string },
): DiscordWebhookPayload {
  return {
    ...payload,
    username: options?.username ?? payload.username ?? NEWHOPE_DISCORD_NAME,
    avatar_url: NEWHOPE_LOGO_URL,
    embeds: payload.embeds?.map((embed) =>
      brandDiscordEmbed(embed, options?.footerText),
    ),
  };
}

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
    body: JSON.stringify(brandDiscordWebhookPayload(payload)),
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

