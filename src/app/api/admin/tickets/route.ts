import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const sb = getSupabase();
  const { data, error } = await sb
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[admin/tickets] Supabase error:", error);
    return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: 500 });
  }
  return NextResponse.json({ ok: true, tickets: data ?? [], count: data?.length ?? 0 });
}

// PATCH — update ticket status
export async function PATCH(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const { id, status } = await req.json().catch(() => ({}));
  if (!id || !["open", "closed", "resolved"].includes(status)) {
    return NextResponse.json({ ok: false, error: "Invalid id or status" }, { status: 400 });
  }

  const sb = getSupabase();
  const { error } = await sb.from("tickets").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
