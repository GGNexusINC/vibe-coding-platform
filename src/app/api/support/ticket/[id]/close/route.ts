import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "@/lib/admin-auth";

const TICKET_LOGS_WEBHOOK = "https://discord.com/api/webhooks/1495725476491296779/-s0Ra1f5rse294pNpQdgG2DKiv0ebXjF2IMJHco6asFR50cDpqsPUBHagU8ydfEy1Vki";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ticketId } = await params;
  const body = await req.json().catch(() => ({}));
  const channelId = String(body?.channelId ?? "").trim();
  const closedBy = body?.closedBy as string | undefined;

  const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, sbKey, { auth: { persistSession: false } });

  // Always update DB status first
  const { error: dbErr } = await supabase.from("tickets").update({ status: "closed" }).eq("id", ticketId);
  if (dbErr) console.error("[ticket-close] DB error:", dbErr.message);

  // Get ticket subject for the embed
  const { data: ticketRow } = await supabase.from("tickets").select("subject,guest_username").eq("id", ticketId).single();

  // Fire webhook embed
  const ts = Math.floor(Date.now() / 1000);
  fetch(TICKET_LOGS_WEBHOOK, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: "NewHopeGGN Support",
      embeds: [{
        title: "🔒 Ticket Closed",
        color: 0x64748b,
        fields: [
          { name: "Subject", value: ticketRow?.subject ?? "Unknown", inline: true },
          { name: "User", value: ticketRow?.guest_username ?? "Guest", inline: true },
          ...(closedBy ? [{ name: "Closed By", value: closedBy, inline: true }] : []),
          { name: "Time", value: `<t:${ts}:F>`, inline: false },
        ],
        footer: { text: `Ticket ID: ${ticketId}` },
        timestamp: new Date().toISOString(),
      }],
    }),
  }).catch(() => {});

  if (!channelId || !botToken) {
    return NextResponse.json({ ok: true, message: "Status updated" });
  }

  try {
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bot ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "🔒 **Ticket Closed** — This channel will be deleted in 10 seconds." }),
    });

    setTimeout(async () => {
      await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bot ${botToken}` },
      });
    }, 10000);

    return NextResponse.json({ ok: true, message: "Ticket closed" });
  } catch (e) {
    console.error("[ticket-close] Discord error:", e);
    return NextResponse.json({ ok: true, message: "Status updated, Discord failed" });
  }
}
