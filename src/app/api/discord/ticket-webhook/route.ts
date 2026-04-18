import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Discord webhook for ticket channel messages
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  
  // Verify it's a message from a text channel
  if (body.type !== 0 || !body.channel_id || !body.content) {
    return NextResponse.json({ ok: true }); // Acknowledge but ignore
  }

  const channelId = body.channel_id;
  const messageId = body.id;
  const content = body.content;
  const author = body.author;

  // Skip bot messages
  if (author?.bot) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check if this is a ticket channel
  const { data: ticket } = await supabase
    .from("tickets")
    .select("*")
    .eq("discord_channel_id", channelId)
    .single();

  if (!ticket) {
    return NextResponse.json({ ok: true }); // Not a ticket channel
  }

  // Store the message
  await supabase.from("discord_messages").insert({
    id: messageId,
    channel_id: channelId,
    channel_name: "ticket-channel",
    author_id: author?.id,
    author_username: author?.username,
    author_avatar: author?.avatar_url,
    content,
  });

  console.log("[ticket-webhook] Stored admin reply:", messageId, "from", author?.username);

  return NextResponse.json({ ok: true });
}

// Verify webhook
export async function GET(req: Request) {
  return NextResponse.json({ ok: true, message: "Discord ticket webhook ready" });
}
