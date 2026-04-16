import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "nh_session";
const ADMIN_COOKIE_NAME = "nh_admin_session";
type MiddlewareSessionPayload = { discord_id?: string };
type MiddlewareAdminPayload = { role?: string };

async function getSessionFromRequest(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    return payload as MiddlewareSessionPayload;
  } catch {
    return null;
  }
}

async function getAdminSessionFromRequest(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PANEL_PASSWORD;
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    return payload as MiddlewareAdminPayload;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const session = await getSessionFromRequest(req);
  const adminSession = await getAdminSessionFromRequest(req);
  const isAuthed = !!session?.discord_id;
  const isAdminAuthed = adminSession?.role === "admin";

  // Dashboard must remain accessible so users can log in (otherwise redirect loops).
  // Keep /store accessible (viewable), but gate admin strictly.
  // We'll enforce login/UID at checkout (not at page view) to avoid UX dead-ends.
  const protectedPaths: string[] = [];
  const isProtected = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isProtected && !isAuthed) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.set("auth", "required");
    return NextResponse.redirect(url);
  }

  if (
    (pathname === "/admin" || pathname.startsWith("/api/admin")) &&
    pathname !== "/api/admin/login" &&
    !isAdminAuthed
  ) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

