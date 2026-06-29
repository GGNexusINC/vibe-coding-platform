import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listHives } from "@/lib/hive-store";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  }

  try {
    const sb = createSupabaseAdminClient();
    const hives = await listHives(sb);
    const userHive = hives.find(h => h.members.some(m => m.discord_id === user.discord_id));
    
    if (!userHive) {
      return NextResponse.json({ ok: true, hive: null });
    }

    return NextResponse.json({
      ok: true,
      hive: {
        id: userHive.id,
        name: userHive.name,
        level: userHive.level,
        memberCount: userHive.members.length,
        status: userHive.status,
      },
    });
  } catch (err: any) {
    console.error("[user/hive] Error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
