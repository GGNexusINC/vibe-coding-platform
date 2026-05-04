import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSession();
  
  if (!user?.discord_id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, sbKey, {
      auth: { persistSession: false },
    });

    const { data: ticket, error } = await supabase
      .from("tickets")
      .select("id, subject, status, discord_channel_id, guest_email")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!ticket) return NextResponse.json({ ok: false, error: "Ticket not found" }, { status: 404 });

    // Security check: Make sure this ticket belongs to the user
    if (ticket.guest_email !== `discord:${user.discord_id}`) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ 
      ok: true, 
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        channelId: ticket.discord_channel_id
      } 
    });
  } catch (e) {
    console.error("[ticket-details] Error:", e);
    return NextResponse.json({ ok: false, error: "Failed to fetch ticket details" }, { status: 500 });
  }
}
