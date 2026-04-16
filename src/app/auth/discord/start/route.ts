import { NextResponse } from "next/server";
import { getDiscordAuthorizeUrl } from "@/lib/discord-oauth";

function randomState() {
  return crypto.randomUUID();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const next = url.searchParams.get("next") ?? "/dashboard";
  const debug = url.searchParams.get("debug") === "1";

  try {
    const state = randomState();
    const authUrl = getDiscordAuthorizeUrl({ origin, next, state });
    if (debug) {
      const auth = new URL(authUrl);
      return NextResponse.json({
        origin,
        redirect_uri: auth.searchParams.get("redirect_uri"),
        auth_url: authUrl,
      });
    }
    return NextResponse.redirect(authUrl);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "missing discord env";
    return NextResponse.redirect(
      `${origin}/dashboard?auth=discord_not_configured&msg=${encodeURIComponent(msg)}`,
    );
  }
}

