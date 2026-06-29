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
      return NextResponse.json({ ok: false, error: "Not in a hive" }, { status: 400 });
    }

    // Auto-generate supply drop based on level and status
    const isUnderAttack = userHive.status === "under_attack";
    
    let dropName = "Weekly Supply Drop";
    let dropItems = ["Basic Materials Box x5", "Canned Food x10", "Medkits x5"];
    
    if (userHive.level > 5) {
      dropName = "Advanced Supply Drop";
      dropItems = ["Tungsten Ingot x50", "Advanced Medkits x10", "Steel x500"];
    }
    
    if (isUnderAttack) {
      dropName = "Emergency Defense Drop";
      dropItems = ["Auto-Turret x2", "Concrete Walls x10", "First Aid Box"];
    }

    // Tie it to the current week
    const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const dropSlug = `hive-drop-${userHive.id}-${weekNum}`;

    return NextResponse.json({
      ok: true,
      drop: {
        slug: dropSlug,
        name: dropName,
        price: 4, // Discounted price for hive members
        items: dropItems,
      }
    });
  } catch (err: any) {
    console.error("[hive/supply-drop] Error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
