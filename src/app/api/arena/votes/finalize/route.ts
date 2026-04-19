import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "@/lib/admin-auth";
import { sendDiscordWebhook } from "@/lib/discord";
import { env } from "@/lib/env";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST finalize voting and announce winner (admin only)
export async function POST(req: Request) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const { event_id, round_number } = body;

  if (!event_id) {
    return NextResponse.json({ ok: false, error: "Event ID required" }, { status: 400 });
  }

  // Get vote results
  const { data: results, error: resultsError } = await supabase
    .rpc("get_vote_results", { event_uuid: event_id });

  if (resultsError || !results || results.length === 0) {
    return NextResponse.json({ ok: false, error: "No votes found" }, { status: 400 });
  }

  // Find winner (highest vote count)
  const winner = results[0];
  
  if (winner.vote_count === 0) {
    return NextResponse.json({ ok: false, error: "No votes cast yet" }, { status: 400 });
  }

  // Get event info
  const { data: event } = await supabase
    .from("arena_events")
    .select("name, current_round")
    .eq("id", event_id)
    .single();

  const round = round_number || event?.current_round || 1;

  // Log the winning vote
  await supabase.from("arena_event_logs").insert({
    event_id,
    type: "vote_finalized",
    message: `Round ${round}: ${winner.option_name} won with ${winner.percentage}% of votes`,
    metadata: {
      round,
      winner_option_id: winner.option_id,
      winner_name: winner.option_name,
      vote_count: winner.vote_count,
      percentage: winner.percentage,
      all_results: results
    }
  });

  // Build results message for Discord
  const resultsText = results
    .filter((r: { vote_count: number }) => r.vote_count > 0)
    .map((r: { option_icon: string; option_name: string; vote_count: number; percentage: number }, i: number) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "📊";
      const bar = "█".repeat(Math.round(r.percentage / 5)) + "░".repeat(20 - Math.round(r.percentage / 5));
      return `${medal} ${r.option_icon} **${r.option_name}** — ${r.vote_count} votes (${r.percentage}%)\n${bar}`;
    })
    .join("\n\n");

  // Announce winner to Discord
  try {
    await sendDiscordWebhook({
      content: `🏆 **Round ${round} Loot Mode Selected!**\n\n${winner.option_icon} **${winner.option_name}** wins with **${winner.percentage}%** of the vote!\n\n📊 **Final Results:**\n${resultsText}\n\n🎮 All teams prepare for **${winner.option_name}** loadouts!`,
      username: "NewHopeGGN Arena",
    }, { webhookUrl: env.discordWebhookUrlForPage("arena") });
  } catch (e) {
    console.error("Discord webhook failed:", e);
  }

  return NextResponse.json({ 
    ok: true, 
    winner: {
      id: winner.option_id,
      name: winner.option_name,
      icon: winner.option_icon,
      votes: winner.vote_count,
      percentage: winner.percentage
    },
    results,
    round
  });
}
