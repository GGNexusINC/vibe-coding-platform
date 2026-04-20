import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity-log";
import { createTicketChannel, sendTicketMessage, sendTicketToWebhook } from "@/lib/discord-bot";
import { env } from "@/lib/env";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const now = new Date().toISOString();
  const forwardedFor = req.headers.get("x-forwarded-for") ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";
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

    // Try to create private Discord channel for this ticket
    let ticketChannelId: string | undefined;
    let ticketCreated = false;

    const botToken = env.discordBotToken();
    console.log("[ticket] Bot token present:", botToken ? "YES" : "NO");

    if (botToken) {
      console.log("[ticket] Creating ticket channel for:", user?.username ?? "guest");
      const channel = await createTicketChannel(user?.username ?? "guest", subject);
      console.log("[ticket] Channel created:", channel ? "YES" : "NO", channel?.id);
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
          message
        );
        console.log("[ticket] Message sent:", ticketCreated);
      }
    }

    // Generate ticket ID for chat (even if DB fails)
    const ticketId = randomUUID();
    
    // Save ticket to database
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      sbKey,
      { auth: { persistSession: false } }
    );

    const { error: dbError } = await supabase
      .from("tickets")
      .insert({
        id: ticketId,
        user_id: (user as any)?.id ?? null,
        guest_username: (user as any)?.username ?? "Guest",
        subject,
        message,
        discord_channel_id: ticketChannelId ?? null,
        status: "open",
      });

    if (dbError) {
      console.error("[ticket] Failed to save ticket:", JSON.stringify(dbError));
    } else {
      console.log("[ticket] Saved to DB:", ticketId);
    }

    // Also send to logs webhook as backup
    const webhookUrl = env.discordWebhookUrlForPage("support");
    if (webhookUrl) {
      await sendTicketToWebhook(
        webhookUrl,
        {
          username: (user as any)?.username ?? "Guest",
          discord_id: (user as any)?.discord_id,
          avatar_url: (user as any)?.avatar_url ?? undefined,
        },
        subject,
        message,
        ticketChannelId
      );
    }

    return NextResponse.json({ 
      ok: true, 
      ticketId,
      ticketCreated,
      channelId: ticketChannelId,
      message: ticketCreated 
        ? "Ticket created! A private channel has been created. Use the chat below to talk with staff." 
        : "Ticket submitted. Staff will review it shortly."
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

