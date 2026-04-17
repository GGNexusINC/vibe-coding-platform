import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const ADMIN_COOKIE_NAME = "nh_admin_session";
const ADMIN_PASSWORD_FALLBACK = "Hopeggnx762738";
const ACTIVE_WINDOW_MINUTES = 15;

type AdminSessionPayload = {
  role: "admin";
  discord_id?: string;
  username?: string;
};

function getAdminSecret() {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PANEL_PASSWORD;
  if (!secret) {
    throw new Error("Missing SESSION_SECRET or ADMIN_PANEL_PASSWORD for admin auth.");
  }
  return new TextEncoder().encode(secret);
}

export function getAdminPassword() {
  return process.env.ADMIN_PANEL_PASSWORD?.trim() || ADMIN_PASSWORD_FALLBACK;
}

export function isAdminDiscordId(discordId: string): boolean {
  const ids = env.adminDiscordIds();
  return ids.size > 0 && ids.has(discordId);
}

export async function setAdminSession(opts?: { discord_id?: string; username?: string }) {
  const payload: AdminSessionPayload = { role: "admin", ...opts };
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getAdminSecret());

  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function getAdminSession() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getAdminSecret());
    if (payload.role !== "admin") return null;
    return payload as unknown as AdminSessionPayload;
  } catch {
    return null;
  }
}

export function getActiveWindowMinutes() {
  return ACTIVE_WINDOW_MINUTES;
}
