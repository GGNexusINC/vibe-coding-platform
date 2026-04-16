import { requireEnv } from "@/lib/env";

const DISCORD_API = "https://discord.com/api";
const PROD_FALLBACK_REDIRECT_URI =
  "https://newhopeggn.vercel.app/auth/discord/callback";

function getDiscordRedirectUri(origin: string, adminCallback = false) {
  const isLocal =
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:");

  if (adminCallback) {
    return `${origin}/auth/admin/callback`;
  }

  const configured = process.env.DISCORD_REDIRECT_URI?.trim();

  // Local dev should always use the local callback.
  if (isLocal) {
    return `${origin}/auth/discord/callback`;
  }

  // In production, prefer a pinned redirect URI.
  if (configured) {
    return configured;
  }

  // Final safety fallback for production.
  return PROD_FALLBACK_REDIRECT_URI;
}

export type DiscordUser = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  discriminator?: string;
  banner?: string | null;
  banner_color?: string | null;
  accent_color?: number | null;
  locale?: string;
  verified?: boolean;
  public_flags?: number;
  flags?: number;
};

export function getDiscordAuthorizeUrl(params: {
  origin: string;
  next: string;
  state: string;
}) {
  const clientId = requireEnv("DISCORD_CLIENT_ID");
  const redirectUri = getDiscordRedirectUri(params.origin);

  const url = new URL(`${DISCORD_API}/oauth2/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "identify");
  url.searchParams.set("state", `${params.state}:${encodeURIComponent(params.next)}`);
  return url.toString();
}

export async function exchangeDiscordCodeForToken(params: {
  origin: string;
  code: string;
  adminCallback?: boolean;
}) {
  const clientId = requireEnv("DISCORD_CLIENT_ID");
  const clientSecret = requireEnv("DISCORD_CLIENT_SECRET");
  const redirectUri = getDiscordRedirectUri(params.origin, params.adminCallback);

  const body = new URLSearchParams();
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("grant_type", "authorization_code");
  body.set("code", params.code);
  body.set("redirect_uri", redirectUri);

  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Discord token exchange failed: ${res.status} ${txt}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    scope: string;
  };

  return json;
}

export async function fetchDiscordUser(accessToken: string) {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Discord user fetch failed: ${res.status} ${txt}`);
  }

  return (await res.json()) as DiscordUser;
}

export function getDiscordAvatarUrl(u: DiscordUser) {
  if (!u.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128`;
}

