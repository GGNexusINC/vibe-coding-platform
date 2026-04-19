import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { sendDiscordWebhook } from "@/lib/discord";

// POST - Send notifications to teams
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session?.discord_id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { event_id, match_id, message, team_name, broadcast } = body;

  if (!message) {
    return NextResponse.json({ ok: false, error: "Message required" }, { status: 400 });
  }

  try {
    // Send notification via Discord webhook
    await sendDiscordWebhook({
      content: broadcast 
        ? `📢 **TO ALL TEAMS**\n\n${message}`
        : `📢 **Team ${team_name || "Notification"}**\n\n${message}`,
      username: "NewHopeGGN Arena",
      avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
    });

    return NextResponse.json({ ok: true, message: "Notification sent" });
  } catch (e) {
    console.error("Failed to send notification:", e);
    return NextResponse.json({ ok: false, error: "Failed to send notification" }, { status: 500 });
  }
}
