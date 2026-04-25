import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { sendDiscordWebhook } from "@/lib/discord";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: ticketId } = await params;
  const body = await req.json().catch(() => ({}));
  const channelId = String(body?.channelId ?? "").trim();
  const [user, admin] = await Promise.all([getSession(), getAdminSession()]);

  const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, sbKey, {
    auth: { persistSession: false },
  });

  const { data: ticketRow } = await supabase
    .from("tickets")
    .select("subject,guest_username,guest_email,discord_channel_id")
    .eq("id", ticketId)
    .single();

  const ownsTicket = user?.discord_id && ticketRow?.guest_email === `discord:${user.discord_id}`;
  const isAdmin = Boolean(admin?.discord_id);
  const channelMatches = !ticketRow?.discord_channel_id || !channelId || ticketRow.discord_channel_id === channelId;

  if ((!isAdmin && !ownsTicket) || !channelMatches) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { error: dbErr } = await supabase.from("tickets").update({ status: "closed" }).eq("id", ticketId);
  if (dbErr) console.error("[ticket-close] DB update error:", JSON.stringify(dbErr));

  const ts = Math.floor(Date.now() / 1000);
  const closedBy = isAdmin ? (admin?.username ?? "Admin") : (user?.username ?? "Ticket owner");
  const { getDynamicWebhookUrl } = await import("@/lib/webhooks");
  const dynamicSupportWebhook = await getDynamicWebhookUrl("tickets");
  const supportWebhooks = [
    dynamicSupportWebhook,
    env.discordWebhookUrlForPage("support"),
    ""
  ].filter(Boolean);

  for (const webhookUrl of supportWebhooks) {
    if (!webhookUrl) continue;
    await sendDiscordWebhook(
      {
        username: "NewHopeGGN Support",
        embeds: [{
          title: "Ticket Closed",
          color: 0x64748b,
          fields: [
            { name: "Subject", value: ticketRow?.subject ?? "Unknown", inline: true },
            { name: "User", value: ticketRow?.guest_username ?? "Guest", inline: true },
            { name: "Closed By", value: closedBy, inline: true },
            { name: "Time", value: `<t:${ts}:F>`, inline: false },
          ],
          footer: { text: `Ticket ID: ${ticketId}` },
          timestamp: new Date().toISOString(),
        }],
      },
      { webhookUrl },
    ).catch(() => {});
  }

  // Only admins can delete Discord channels
  if (!isAdmin || !channelId || !botToken) {
    return NextResponse.json({ ok: true, message: "Ticket closed" });
  }

  // Admin closing - notify Discord and schedule channel deletion
  try {
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Ticket closed by staff. This channel will be deleted in 10 seconds." }),
    });

    setTimeout(async () => {
      try {
        await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
          method: "DELETE",
          headers: { Authorization: `Bot ${botToken}` },
        });
      } catch (deleteErr) {
        console.error("[ticket-close] Channel delete failed:", deleteErr);
      }
    }, 10000);

    return NextResponse.json({ ok: true, message: "Ticket closed - channel will be deleted in 10s" });
  } catch (e) {
    console.error("[ticket-close] Discord error:", e);
    return NextResponse.json({ ok: true, message: "Ticket closed but Discord notification failed" });
  }
}
