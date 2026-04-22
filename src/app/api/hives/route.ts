import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";
import { createHive, listHives } from "@/lib/hive-store";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const hives = await listHives(getSupabase());
    return NextResponse.json({ ok: true, hives });
  } catch (e) {
    console.error("[hives] GET error:", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed to load hives" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: "Hive name is required" }, { status: 400 });
    }

    const hive = await createHive(getSupabase(), {
      user,
      name,
      description: body.description || null,
      mapLabel: String(body.mapLabel || "Marked Territory"),
      mapX: Number.isFinite(Number(body.mapX)) ? Number(body.mapX) : 50,
      mapY: Number.isFinite(Number(body.mapY)) ? Number(body.mapY) : 50,
    });

    return NextResponse.json({ ok: true, hive });
  } catch (e) {
    console.error("[hives] POST error:", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed to create hive" }, { status: 500 });
  }
}
