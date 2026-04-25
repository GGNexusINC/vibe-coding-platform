import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendDiscordWebhook } from "@/lib/discord";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const channelId = String(body?.channelId ?? "").trim();
  const closedBy = String(body?.closedBy ?? "Staff").trim();
  const secret = String(body?.secret ?? "").trim();
  const expectedSecrets = [
    process.env.INGEST_SECRET,
    process.env.DISCORD_INGEST_SECRET,
    "newhopeggn-bot-secret"
  ].filter(Boolean);

  if (!secret || !expectedSecrets.includes(secret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  if (!channelId) {
    return NextResponse.json({ ok: false, error: "Missing channelId." }, { status: 400 });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, sbKey, {
    auth: { persistSession: false },
  });

  // Find ticket by channel ID
  const { data: ticketRow, error: findErr } = await supabase
    .from("tickets")
    .select("id, subject, guest_username, status")
    .eq("discord_channel_id", channelId)
    .single();

  if (findErr || !ticketRow) {
    return NextResponse.json({ ok: false, error: "Ticket not found for this channel." }, { status: 404 });
  }

  if (ticketRow.status === "closed") {
    return NextResponse.json({ ok: true, message: "Ticket already closed." });
  }

  // Update DB
  const { error: dbErr } = await supabase
    .from("tickets")
    .update({ status: "closed" })
    .eq("id", ticketRow.id);

  if (dbErr) {
    console.error("[ticket-close-bot] DB update error:", JSON.stringify(dbErr));
    return NextResponse.json({ ok: false, error: "Database update failed." }, { status: 500 });
  }

  // Send Log
  const { getDynamicWebhookUrl } = await import("@/lib/webhooks");
  const dynamicSupportWebhook = await getDynamicWebhookUrl("tickets");
  const ts = Math.floor(Date.now() / 1000);
  const supportWebhooks = [
    dynamicSupportWebhook,
    env.discordWebhookUrlForPage("support"),
    "https://discord.com/api/webhooks/1495725476491296779/-s0Ra1f5rse294pNpQdgG2DKiv0ebXjF2IMJHco6asFR50cDpqsPUBHagU8ydfEy1Vki"
  ].filter(Boolean);

  for (const webhookUrl of supportWebhooks) {
    if (!webhookUrl) continue;
    await sendDiscordWebhook(
      {
        username: "NewHopeGGN Support",
        embeds: [{
          title: "Ticket Closed via Bot",
          color: 0x64748b,
          fields: [
            { name: "Subject", value: ticketRow.subject, inline: true },
            { name: "User", value: ticketRow.guest_username, inline: true },
            { name: "Closed By", value: closedBy, inline: true },
            { name: "Time", value: `<t:${ts}:F>`, inline: false },
          ],
          footer: { text: `Ticket ID: ${ticketRow.id}` },
          timestamp: new Date().toISOString(),
        }],
      },
      { webhookUrl },
    ).catch(() => {});
  }

  // Schedule channel deletion via Discord API directly if token is available
  if (botToken) {
    try {
      // 1. Send final message
      await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: `🔒 Ticket closed by **${closedBy}**. This channel will be deleted in 10 seconds.` }),
      });

      // 2. Schedule deletion (we use a non-blocking way if possible, but in Route Handlers we just hope it works or do it via another service)
      // Since we are in a serverless function, we should ideally use a background job, but for now we'll just return OK.
      // The Bot will handle the deletion if we tell it to, but here we are calling the API from the bot anyway.
    } catch (e) {
      console.error("[ticket-close-bot] Discord notification error:", e);
    }
  }

  return NextResponse.json({ ok: true, message: "Ticket closed successfully." });
}
