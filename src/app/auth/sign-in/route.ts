import { NextResponse } from "next/server";

// Alias route kept for backwards-compat: now uses direct Discord OAuth.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") ?? "/dashboard";
  return NextResponse.redirect(
    `${url.origin}/auth/discord/start?next=${encodeURIComponent(next)}`,
  );
}

