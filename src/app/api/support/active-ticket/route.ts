import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const user = await getSession();
  if (!user?.discord_id) {
    return NextResponse.json({ ok: true, ticket: null });
  }

  try {
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, sbKey, {
      auth: { persistSession: false },
    });

    // Find the most recent open ticket for this user
    const { data: ticket, error } = await supabase
      .from("tickets")
      .select("id, subject, status, created_at")
      .eq("guest_email", `discord:${user.discord_id}`)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ 
      ok: true, 
      ticket: ticket ? {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        createdAt: ticket.created_at
      } : null 
    });
  } catch (e) {
    console.error("[active-ticket] Error:", e);
    return NextResponse.json({ ok: false, error: "Failed to fetch active ticket" }, { status: 500 });
  }
}
