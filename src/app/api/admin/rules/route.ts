import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createClient(env.supabaseUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY || env.supabaseAnonKey());
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "server_rules")
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

  if (!Array.isArray(rules)) {
    return NextResponse.json({ ok: false, error: "Rules must be an array." }, { status: 400 });
  }

  const supabase = createClient(env.supabaseUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY || env.supabaseAnonKey());
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from("site_settings")
    .upsert({
      key: "server_rules",
      value: { rules },
      updated_at: now
    });

  if (error) {
    console.error("[rules-api] Error saving rules:", error);
    return NextResponse.json({ ok: false, error: "Failed to save rules." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
