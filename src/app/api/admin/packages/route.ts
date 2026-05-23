import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
    .eq("key", "store_packages")
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: true, packages: [] });
  }

  return NextResponse.json({ ok: true, packages: data.value.packages || [] });
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const packages = body.packages;

  if (!Array.isArray(packages)) {
    return NextResponse.json({ ok: false, error: "Packages must be an array." }, { status: 400 });
  }

  const supabase = createClient(env.supabaseUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY || env.supabaseAnonKey());
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from("site_settings")
    .upsert({
      key: "store_packages",
      value: { packages },
      updated_at: now
    });

  if (error) {
    console.error("[packages-api] Error saving packages:", error);
    return NextResponse.json({ ok: false, error: "Failed to save packages." }, { status: 500 });
  }

  // Purge store cache so changes reflect instantly
  revalidatePath("/store");

  return NextResponse.json({ ok: true });
}
