import { getSession } from "@/lib/session";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const sp = searchParams ?? {};
  const user = await getSession();
  const stars = [
    { top: "10%", left: "10%", delay: "0s" },
    { top: "16%", left: "34%", delay: "0.6s" },
    { top: "12%", left: "60%", delay: "1.2s" },
    { top: "22%", left: "84%", delay: "0.4s" },
    { top: "38%", left: "18%", delay: "1.5s" },
    { top: "50%", left: "48%", delay: "0.8s" },
    { top: "66%", left: "76%", delay: "1.7s" },
    { top: "78%", left: "22%", delay: "0.3s" },
  ];

  const msgParam = sp.msg;
  const msg = typeof msgParam === "string" ? msgParam : undefined;

  return (
    <div className="relative mx-auto w-full max-w-6xl overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-900/20 via-transparent to-cyan-900/20" />
      <div className="rz-parallax-galaxy pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,0.16),transparent_38%),radial-gradient(circle_at_84%_30%,rgba(34,211,238,0.14),transparent_42%),radial-gradient(circle_at_48%_84%,rgba(217,70,239,0.1),transparent_38%)]" />
      <div className="rz-starfield pointer-events-none">
        {stars.map((star, idx) => (
          <span
            key={`dashboard-star-${idx}`}
            className="rz-star"
            style={{ top: star.top, left: star.left, animationDelay: star.delay }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 rz-grid opacity-20" />
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      <p className="mt-2 text-zinc-300">
        Manage your account and link your in-game UID.
      </p>

      {sp.auth === "required" ? (
        <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          Please login with Discord to continue.
        </div>
      ) : null}
      {sp.auth === "discord_not_configured" ? (
        <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          Discord login is not configured yet. Add <span className="font-semibold">DISCORD_CLIENT_ID</span> and{" "}
          <span className="font-semibold">DISCORD_CLIENT_SECRET</span> to <span className="font-mono">.env.local</span>,
          then restart the dev server.
          {msg ? <div className="mt-2 text-xs text-amber-200/80">{msg}</div> : null}
        </div>
      ) : null}
      {sp.auth === "error" ? (
        <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
          Login failed. {msg ? <span className="text-xs opacity-80">{msg}</span> : null}
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rz-lux-panel rounded-2xl p-5">
          <div className="text-sm font-semibold text-white">Account</div>
          <div className="mt-2 text-sm text-zinc-400">
            {user
              ? "You’re signed in."
              : "Sign in with Discord to unlock the store."}
          </div>
          {user ? (
            <form action="/auth/sign-out" method="post">
              <button className="mt-4 h-10 rounded-md border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10">
                Sign out
              </button>
            </form>
          ) : (
            <a
              className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-emerald-500 px-4 text-sm font-semibold text-black hover:bg-emerald-400"
              href="/auth/discord/start?next=/dashboard"
            >
              Sign in with Discord
            </a>
          )}
        </div>

        <div className="rz-lux-panel rounded-2xl p-5">
          <div className="text-sm font-semibold text-white">
            In-game UID (required before purchase)
          </div>
          <div className="mt-2 text-sm text-zinc-400">
            You won’t be able to checkout until this is set.
          </div>
          <div className="mt-4 flex gap-2">
            <input
              className="h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-600"
              placeholder="Enter your Once Human UID"
              disabled={!user}
            />
            <button
              className="h-10 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-black opacity-60"
              disabled
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

