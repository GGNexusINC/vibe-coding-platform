import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity-log";
import { createTicketChannel, sendTicketMessage, sendTicketToWebhook } from "@/lib/discord-bot";
import { env } from "@/lib/env";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const subject = String(body?.subject ?? "").trim();
  const message = String(body?.message ?? "").trim();

  if (!subject || !message) {
    return NextResponse.json(
      { ok: false, error: "Subject and message are required." },
      { status: 400 },
    );
  }

  if (subject.length > 100 || message.length > 2000) {
    return NextResponse.json(
      { ok: false, error: "Subject or message is too long." },
      { status: 400 },
    );
  }

  const user = await getSession();

  try {
    await logActivity({
      type: "support_ticket",
      username: user?.username,
      discordId: user?.discord_id,
      avatarUrl: user?.avatar_url ?? undefined,
      globalName: user?.global_name,
      discriminator: user?.discriminator,
      profile: user?.discord_profile,
      details: `Ticket submitted: ${subject}`,
    });

    let ticketChannelId: string | undefined;
    let ticketCreated = false;

    if (env.discordBotToken()) {
      const channel = await createTicketChannel(user?.username ?? "guest", subject);
      if (channel) {
        ticketChannelId = channel.id;
        ticketCreated = await sendTicketMessage(
          channel.id,
          {
            username: user?.username ?? "Guest",
            discord_id: user?.discord_id,
            avatar_url: user?.avatar_url ?? undefined,
          },
          subject,
          message,
        );
      }
    }

    const ticketId = randomUUID();
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, sbKey, {
      auth: { persistSession: false },
    });

    const { error: dbError } = await supabase.from("tickets").insert({
      id: ticketId,
      guest_username: user?.username ?? "Guest",
      guest_email: user?.discord_id ? `discord:${user.discord_id}` : null,
      subject,
      message,
      discord_channel_id: ticketChannelId ?? null,
      status: "open",
    });

    if (dbError) {
      console.error("[ticket] Failed to save ticket:", JSON.stringify(dbError));
    }

    const supportWebhookUrl = env.discordWebhookUrlForPage("support");
    if (supportWebhookUrl) {
      await sendTicketToWebhook(
        supportWebhookUrl,
        {
          username: user?.username ?? "Guest",
          discord_id: user?.discord_id,
          avatar_url: user?.avatar_url ?? undefined,
        },
        subject,
        message,
        ticketChannelId,
      );
    }

    return NextResponse.json({
      ok: true,
      ticketId,
      ticketCreated,
      channelId: ticketChannelId,
      message: ticketCreated
        ? "Ticket created! A private channel has been created. Use the chat below to talk with staff."
        : "Ticket submitted. Staff will review it shortly.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    console.error("[ticket] Error:", e);
    return NextResponse.json(
      { ok: false, error: `Failed to send ticket: ${msg}` },
      { status: 502 },
    );
  }
}
