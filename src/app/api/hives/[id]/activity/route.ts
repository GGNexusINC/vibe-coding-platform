import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";
import { applyHiveXp, updateHive } from "@/lib/hive-store";

const XP_BY_ACTION: Record<string, { xp: number; label: string; status?: "active" | "quiet" | "under_attack"; cooldownMs: number }> = {
  checkin: { xp: 15, label: "daily activity check-in", status: "active", cooldownMs: 20 * 60 * 60 * 1000 },
  defense: { xp: 40, label: "launched a hive defense alert", status: "under_attack", cooldownMs: 10 * 60 * 1000 },
  raid: { xp: 30, label: "launched a raid alert", status: "active", cooldownMs: 10 * 60 * 1000 },
  support: { xp: 25, label: "helped another hive", status: "active", cooldownMs: 60 * 60 * 1000 },
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "checkin");
    const config = XP_BY_ACTION[action] || XP_BY_ACTION.checkin;
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();
    let cooldownUntil: string | null = null;

    const hive = await updateHive(getSupabase(), id, (current) => {
      const lastAction = current.activity_log.find((log) =>
        log.actor_id === user.discord_id &&
        log.action === config.label
      );
      if (lastAction) {
        const nextAllowed = new Date(lastAction.created_at).getTime() + config.cooldownMs;
        if (Number.isFinite(nextAllowed) && nextAllowed > nowMs) {
          cooldownUntil = new Date(nextAllowed).toISOString();
          return null;
        }
      }

      const hasMember = current.members.some((member) => member.discord_id === user.discord_id);
      const withMember = hasMember ? current : {
        ...current,
        members: [...current.members, {
          discord_id: user.discord_id,
          username: user.username,
          avatar_url: user.avatar_url ?? null,
          role: "member" as const,
          joined_at: now,
        }],
      };
      const withXp = applyHiveXp(withMember, config.xp);
      return {
        ...withXp,
        status: config.status || withXp.status,
        activity_log: [{
          id: crypto.randomUUID(),
          actor_id: user.discord_id,
          actor_username: user.username,
          action: config.label,
          xp: config.xp,
          created_at: now,
        }, ...withXp.activity_log].slice(0, 30),
      };
    });

    if (cooldownUntil) {
      return NextResponse.json({
        ok: false,
        error: action === "checkin"
          ? "You already marked active for this hive. Come back when the cooldown is done."
          : "That hive command is cooling down. Try again shortly.",
        cooldownUntil,
      }, { status: 429 });
    }

    if (!hive) {
      return NextResponse.json({ ok: false, error: "Hive not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, hive, xpAwarded: config.xp });
  } catch (e) {
    console.error("[hives/activity] POST error:", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed to update hive" }, { status: 500 });
  }
}
