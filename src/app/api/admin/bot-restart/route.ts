import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { env } from "@/lib/env";
import { sendDiscordAdminLog } from "@/lib/discord-admin-log";
import { appendBotOpsEvent } from "@/lib/system-status";

async function restartFlyApp(appName: string) {
  const token = env.flyApiToken();
  if (!token) {
    return { ok: false, error: "FLY_API_TOKEN is not configured." };
  }

  const listRes = await fetch(`https://api.machines.dev/v1/apps/${appName}/machines`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!listRes.ok) {
    return { ok: false, error: `Failed to list Fly machines (${listRes.status}).` };
  }

  const machines = (await listRes.json().catch(() => [])) as { id: string; name?: string }[];
  const restarted: { id: string; name?: string }[] = [];
  const failures: string[] = [];

  await Promise.all(machines.map(async (machine) => {
    const res = await fetch(`https://api.machines.dev/v1/apps/${appName}/machines/${machine.id}/restart`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      restarted.push(machine);
    } else {
      failures.push(`${machine.name ?? machine.id} (${res.status})`);
    }
  }));

  return {
    ok: restarted.length > 0,
    restarted,
    failures,
    total: machines.length,
    error: restarted.length > 0 ? null : "No machines restarted.",
  };
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const target = String(body?.target ?? "discord-bot");
  const appName = env.flyBotAppName();
  const actor = admin.username ?? admin.discord_id ?? "admin";

  const alertSent = await sendDiscordAdminLog({
    title: "Emergency bot restart requested",
    description: `${actor} requested an emergency restart from the admin panel for **${target}**.`,
    color: 0xf59e0b,
    fields: [
      { name: "Target", value: target, inline: true },
      { name: "Fly app", value: appName, inline: true },
      { name: "Actor", value: actor, inline: true },
    ],
  }).catch(() => false);

  const result = await restartFlyApp(appName).catch((error): {
    ok: false;
    error: string;
    restarted: { id: string; name?: string }[];
    failures: string[];
    total: number;
  } => ({
    ok: false,
    error: error instanceof Error ? error.message : "Unknown Fly restart error.",
    restarted: [],
    failures: [],
    total: 0,
  }));

  const restarted = Array.isArray((result as { restarted?: { id: string; name?: string }[] }).restarted)
    ? (result as { restarted: { id: string; name?: string }[] }).restarted
    : [];
  const failures = Array.isArray((result as { failures?: string[] }).failures)
    ? (result as { failures: string[] }).failures
    : [];
  const errorText = typeof (result as { error?: string | null }).error === "string"
    ? (result as { error?: string | null }).error
    : null;
  const ok = Boolean(result.ok) && restarted.length > 0;

  await appendBotOpsEvent({
    kind: ok ? "restart" : "error",
    title: ok ? "Emergency restart completed" : "Emergency restart failed",
    detail: ok
      ? `${actor} restarted ${appName} from the admin panel.`
      : `${actor} attempted to restart ${appName} from the admin panel.`,
    meta: {
      actor,
      appName,
      target,
      restarted: restarted.length,
      failures: failures.length,
      status: ok ? "online" : "degraded",
    },
  }).catch(() => false);

  await sendDiscordAdminLog({
    title: ok ? "Emergency bot restart completed" : "Emergency bot restart failed",
    description: ok
      ? `Restart finished for **${appName}**.`
      : `Restart attempt for **${appName}** failed.`,
    color: ok ? 0x22c55e : 0xef4444,
    fields: [
      { name: "Alert sent", value: alertSent ? "yes" : "no", inline: true },
      { name: "Restarted", value: ok ? String(restarted.length) : "0", inline: true },
      { name: "Failures", value: failures.length ? failures.join(", ") : (errorText ?? "none"), inline: false },
    ],
  }).catch(() => false);

  return NextResponse.json({
    ok,
    alertSent,
    target,
    appName,
    restarted,
    failures,
    error: ok ? null : errorText ?? "Restart failed.",
  }, { status: ok ? 200 : 500 });
}
