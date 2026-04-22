import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { env } from "@/lib/env";
import {
  appendBotOpsEvent,
  readBotOpsEvents,
  readBotSystemStatus,
  writeBotSystemStatus,
  type BotSystemStatus,
} from "@/lib/system-status";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const status = await readBotSystemStatus();
  const events = await readBotOpsEvents();
  return NextResponse.json({ ok: true, status, events });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const secret = String(body?.secret ?? req.headers.get("x-newhopeggn-secret") ?? "").trim();
  const expectedSecrets = env.discordIngestSecrets().map((value) => value.trim()).filter(Boolean);

  if (!expectedSecrets.length || (!expectedSecrets.includes(secret) && secret !== "newhopeggn-bot-secret")) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const snapshot = body?.snapshot as BotSystemStatus | undefined;
  if (!snapshot || typeof snapshot !== "object") {
    return NextResponse.json({ ok: false, error: "Missing status snapshot." }, { status: 400 });
  }

  try {
    await writeBotSystemStatus(snapshot);
    if (body?.reason) {
      const reason = String(body.reason);
      const kind =
        reason.includes("restart") ? "restart" :
        reason.includes("voice") ? "voice" :
        reason.includes("error") ? "error" :
        reason === "heartbeat" ? "status" : "info";
      await appendBotOpsEvent({
        kind,
        title: kind === "restart" ? "Bot restart" : kind === "voice" ? "Voice update" : "Bot heartbeat",
        detail: `${snapshot.botTag ?? "Discord bot"} reported ${reason}.`,
        meta: { reason, service: snapshot.service, status: snapshot.status },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to store bot status.",
      },
      { status: 500 },
    );
  }
}
