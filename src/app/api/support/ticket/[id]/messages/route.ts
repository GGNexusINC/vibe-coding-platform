import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";

// Get messages for a ticket (fetch directly from Discord)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ticketId } = await params;
  const url = new URL(req.url);
  const channelId = url.searchParams.get("channelId");

  if (!channelId) {
    return NextResponse.json({ ok: false, error: "channelId required" }, { status: 400 });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ ok: false, error: "Bot not configured" }, { status: 500 });
  }

  try {
    // Fetch messages directly from Discord
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=50`, {
      headers: {
        "Authorization": `Bot ${botToken}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "Failed to fetch messages" }, { status: 500 });
    }

    const discordMessages = await res.json();
    
    // Transform to our format
    const messages = discordMessages.map((msg: any) => ({
      id: msg.id,
      author_id: msg.author.id,
      author_username: msg.author.username,
      author_avatar: msg.author.avatar 
        ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`
        : undefined,
      content: msg.content,
      created_at: msg.timestamp,
    })).reverse(); // Oldest first

    return NextResponse.json({
      ok: true,
      ticket: {
        id: ticketId,
        channelId: channelId,
      },
      messages,
    });
  } catch (e) {
    console.error("[ticket-messages] Error fetching:", e);
    return NextResponse.json({ ok: false, error: "Failed to fetch" }, { status: 500 });
  }
}

// Send message to Discord
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ticketId } = await params;
  const body = await req.json().catch(() => ({}));
  const content = String(body?.message ?? "").trim();
  const channelId = String(body?.channelId ?? "").trim();

  if (!content) {
    return NextResponse.json({ ok: false, error: "Message is required" }, { status: 400 });
  }

  if (!channelId) {
    return NextResponse.json({ ok: false, error: "Channel ID required" }, { status: 400 });
  }

  const user = await getSession();

  // Send to Discord
  const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ ok: false, error: "Bot not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: `**${user?.username || "Guest"}:** ${content}`,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("[ticket-chat] Failed to send to Discord:", error);
      return NextResponse.json({ ok: false, error: "Failed to send message" }, { status: 500 });
    }

    const message = await res.json();

    // Store in database (optional - ignore errors)
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await supabase.from("discord_messages").insert({
        id: message.id,
        channel_id: channelId,
        channel_name: "ticket-channel",
        author_id: user?.discord_id || "guest",
        author_username: user?.username || "Guest",
        author_avatar: user?.avatar_url,
        content,
      });
    } catch {
      // Ignore DB errors
    }

    return NextResponse.json({ ok: true, messageId: message.id });
  } catch (e) {
    console.error("[ticket-chat] Error:", e);
    return NextResponse.json({ ok: false, error: "Failed to send" }, { status: 500 });
  }
}
