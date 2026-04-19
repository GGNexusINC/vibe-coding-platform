import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getAdminSession } from "@/lib/admin-auth";

export async function GET() {
  // Try regular session first
  const userSession = await getSession();
  if (userSession?.discord_id) {
    return NextResponse.json({
      ok: true,
      user: {
        discord_id: userSession.discord_id,
        username: userSession.username,
        avatar_url: userSession.avatar_url,
        global_name: userSession.global_name,
      }
    });
  }

  // Try admin session
  const adminSession = await getAdminSession();
  if (adminSession?.discord_id) {
    return NextResponse.json({
      ok: true,
      user: {
        discord_id: adminSession.discord_id,
        username: adminSession.username,
        isAdmin: true,
      }
    });
  }

  // No session found
  return NextResponse.json({ ok: false, user: null });
}
