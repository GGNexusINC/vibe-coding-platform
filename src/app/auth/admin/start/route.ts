import { NextResponse } from "next/server";
import { requireEnv } from "@/lib/env";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;

  try {
    const clientId = requireEnv("DISCORD_CLIENT_ID");
    const redirectUri = `${origin}/auth/admin/callback`;

    const authUrl = new URL("https://discord.com/api/oauth2/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "identify");
    authUrl.searchParams.set("state", crypto.randomUUID());

    return NextResponse.redirect(authUrl.toString());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Discord not configured";
    return NextResponse.redirect(
      `${origin}/admin?auth=discord_not_configured&msg=${encodeURIComponent(msg)}`,
    );
  }
}
