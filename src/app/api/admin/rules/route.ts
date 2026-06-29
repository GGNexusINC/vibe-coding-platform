import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "pvp";
  const key = type === "pve" ? "pve_server_rules" : "server_rules";

  const supabase = createClient(env.supabaseUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY || env.supabaseAnonKey());
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: true, rules: [] });
  }

  return NextResponse.json({ ok: true, rules: data.value.rules || [] });
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const rules = body.rules;
  const type = body.type || "pvp";
  const key = type === "pve" ? "pve_server_rules" : "server_rules";

  if (!Array.isArray(rules)) {
    return NextResponse.json({ ok: false, error: "Rules must be an array." }, { status: 400 });
  }

  const supabase = createClient(env.supabaseUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY || env.supabaseAnonKey());
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from("site_settings")
    .upsert({
      key,
      value: { rules },
      updated_at: now
    });

  if (error) {
    console.error("[rules-api] Error saving rules:", error);
    return NextResponse.json({ ok: false, error: "Failed to save rules." }, { status: 500 });
  }

  // Tell Next.js to purge the cache so changes are visible instantly
  revalidatePath("/rules");
  revalidatePath("/pve");

  return NextResponse.json({ ok: true });
}
