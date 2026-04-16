import { NextResponse } from "next/server";

// Legacy callback route kept for old links.
// New callback is /auth/discord/callback.
export async function GET(req: Request) {
  const url = new URL(req.url);
  return NextResponse.redirect(`${url.origin}/dashboard?auth=use_discord_callback`);
}

