import { AdminLoader } from "./admin-loader";
import { getAdminSession } from "@/lib/admin-auth";

export default async function AdminPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  let session = null;

  try {
    session = await getAdminSession();
  } catch {
    session = null;
  }

  const auth = Array.isArray(searchParams.auth) ? searchParams.auth[0] : searchParams.auth;
  const rawMsg = Array.isArray(searchParams.msg) ? searchParams.msg[0] : searchParams.msg;
  const authMessage =
    rawMsg ||
    (auth === "unauthorized"
      ? "Your Discord account is not authorized as an admin."
      : auth === "pending"
        ? "Your request is pending approval by an existing admin."
        : auth === "error"
          ? "Discord sign in failed. Try again."
          : auth === "missing_code"
            ? "Discord did not return an authorization code. Try again."
            : auth === "discord_not_configured"
              ? "Discord login is not configured yet."
              : "");

  return (
    <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:py-14">
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.12),transparent_38%),radial-gradient(circle_at_80%_20%,rgba(34,197,94,0.12),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(245,158,11,0.08),transparent_40%)]" />
      <section className="relative">
        <div className="max-w-3xl">
          <div className="rz-chip">Admin Command Center</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Run broadcasts, track members, and manage Discord-facing activity in one place.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Use presets, live stats, raw Discord profile details, and targeted webhook posting without leaving the dashboard.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#bot-status"
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/15"
            >
              Status Console
            </a>
            <span className="text-xs text-slate-500">
              Live bot health, voice connections, and emergency controls
            </span>
          </div>
        </div>

        <div className="mt-10">
          {session ? (
            <AdminLoader />
          ) : (
            <div className="flex min-h-[42vh] items-center justify-center px-2">
              <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl shadow-black/60">
                <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500" />
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 text-2xl shadow-inner">
                    NH
                  </div>
                  <h2 className="mt-5 text-xl font-bold tracking-tight text-white">Admin Access</h2>
                  <p className="mt-1.5 text-sm text-slate-400">
                    Sign in with your approved Discord account to continue.
                  </p>
                  <a
                    href="/auth/admin/start"
                    className="mt-6 flex h-12 items-center justify-center gap-3 rounded-2xl bg-[#5865F2] text-sm font-semibold text-white shadow-lg shadow-[#5865F2]/20 transition hover:scale-[1.02] hover:bg-[#4752c4]"
                  >
                    Continue with Discord
                  </a>
                  {authMessage ? (
                    <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                      {authMessage}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
