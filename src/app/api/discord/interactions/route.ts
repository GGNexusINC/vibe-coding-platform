import { NextResponse } from "next/server";

// Discord interactions endpoint for button clicks
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  
  // Check if it's a button interaction
  if (body.type !== 3 || !body.data?.custom_id?.startsWith("close_ticket_")) {
    return NextResponse.json({ type: 1 }); // Pong for other interactions
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
    // Send closing message
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

    // Delete channel after 5 seconds
    setTimeout(async () => {
      await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bot ${botToken}` },
      });
    }, 5000);

    // Acknowledge the interaction
    return NextResponse.json({
      type: 4,
      data: { 
        content: "✅ Ticket closed! Channel will be deleted in 5 seconds.",
        flags: 64 // Ephemeral (only visible to clicker)
      }
    });
  } catch (e) {
    console.error("[discord-interactions] Error:", e);
    return NextResponse.json({
      type: 4,
      data: { content: "❌ Failed to close ticket", flags: 64 }
    });
  }
}
