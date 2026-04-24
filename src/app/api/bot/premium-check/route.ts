import { NextResponse } from "next/server";
import { canUseBotFeature, type BotFeatureId } from "@/lib/bot-premium";
import { env } from "@/lib/env";

const ALLOWED_FEATURES = new Set<BotFeatureId>([
  "textTranslate",
  "liveVoice",
  "spokenVoice",
  "staffLogs",
  "reliability",
]);

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const secret = String(body?.secret ?? "");
  const guildId = String(body?.guildId ?? "").trim();
  const feature = String(body?.feature ?? "") as BotFeatureId;

  const expectedSecrets = env.discordIngestSecrets();
  if (!expectedSecrets.includes(secret)) {
    console.error(`[bot-premium] Unauthorized. Received secret starting with: ${secret.slice(0, 4)}***. Expected one of: ${expectedSecrets.map(s => s.slice(0, 4) + '***').join(', ')}`);
    return NextResponse.json({ ok: false, allowed: false, error: "Unauthorized." }, { status: 401 });
  }

  if (!guildId || !ALLOWED_FEATURES.has(feature)) {
    return NextResponse.json({ ok: false, allowed: false, error: "Invalid premium check." }, { status: 400 });
  }

  try {
    const allowed = await canUseBotFeature(guildId, feature);
    return NextResponse.json({ ok: true, allowed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Premium check failed.";
    console.error("[bot-premium] premium check failed:", message);
    return NextResponse.json({ ok: false, allowed: false, error: "Premium check unavailable." }, { status: 503 });
  }
}
