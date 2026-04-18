import { NextResponse } from "next/server";

// Discord interactions endpoint for button clicks
export async function GET() {
  // Discord sometimes checks with GET first
  return NextResponse.json({ message: "Discord interactions endpoint ready" });
}

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  
  console.log("[discord-interactions] Received:", body.type, body);
  
  // PING verification (type 1) - Discord sends this to verify the endpoint
  if (body.type === 1) {
    console.log("[discord-interactions] Sending PONG");
    return NextResponse.json({ type: 1 }); // PONG
  }
  
  // Check if it's a button interaction (type 3)
  if (body.type !== 3 || !body.data?.custom_id?.startsWith("close_ticket_")) {
    return NextResponse.json({ type: 1 });
  }

  const channelId = body.data.custom_id.replace("close_ticket_", "");
  const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
  
  if (!botToken) {
    return NextResponse.json({ 
      type: 4, // Channel message with source
      data: { content: "❌ Bot not configured", flags: 64 }
    });
  }

  try {
    // Acknowledge immediately (Discord requires response within 3 seconds)
    const responsePromise = NextResponse.json({
      type: 4,
      data: { 
        content: "✅ Closing ticket... Channel will be deleted in 5 seconds.",
        flags: 64 // Ephemeral (only visible to clicker)
      }
    });

    // Fire and forget: send closing message then delete channel
    (async () => {
      try {
        await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: "🔒 **Ticket Closed by Staff** - This channel will be deleted in 5 seconds.",
          }),
        });

        await new Promise(r => setTimeout(r, 5000));
        
        await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bot ${botToken}` },
        });
      } catch (e) {
        console.error("[discord-interactions] Error closing:", e);
      }
    })();

    return responsePromise;
  } catch (e) {
    console.error("[discord-interactions] Error:", e);
    return NextResponse.json({
      type: 4,
      data: { content: "❌ Failed to close ticket", flags: 64 }
    });
  }
}
