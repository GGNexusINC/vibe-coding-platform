import { getSession } from "@/lib/session";
import Link from "next/link";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const sp = searchParams ?? {};
  const user = await getSession();
  const msgParam = sp.msg;
  const msg = typeof msgParam === "string" ? msgParam : undefined;

  const quickLinks = [
    { href: "/store",     emoji: "🛒", label: "Wipe Store",    desc: "Buy packs for the current wipe",      color: "border-orange-400/25 bg-orange-400/8 hover:bg-orange-400/12" },
    { href: "/support",   emoji: "🎫", label: "Open Ticket",   desc: "Get help from staff via Discord",      color: "border-blue-400/25 bg-blue-400/8 hover:bg-blue-400/12" },
    { href: "/rules",     emoji: "📋", label: "Server Rules",  desc: "Read the Once Human server rules",     color: "border-lime-400/25 bg-lime-400/8 hover:bg-lime-400/12" },
    { href: "/community", emoji: "💬", label: "Community",     desc: "Live Discord feed & voice channels",   color: "border-purple-400/25 bg-purple-400/8 hover:bg-purple-400/12" },
    { href: "/lottery",   emoji: "🎰", label: "Lottery",       desc: "Try your luck on the server lottery",  color: "border-yellow-400/25 bg-yellow-400/8 hover:bg-yellow-400/12" },
    { href: "/minigame",  emoji: "🐹", label: "Whack-a-Mole",  desc: "Play for a chance to win prizes",      color: "border-pink-400/25 bg-pink-400/8 hover:bg-pink-400/12" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 py-10">
      {/* Futuristic HUD background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(249,115,22,0.10),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(132,204,22,0.07),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 rz-grid opacity-20" />
      <div className="pointer-events-none absolute inset-0" style={{backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px)",backgroundSize:"100% 4px"}} />
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime-500/40 to-transparent" />

      <div className="relative">
        {/* ── Header ── */}
        <div className="rz-chip mb-4">⚡ Player Dashboard</div>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white leading-tight">
              {user ? (
                <>Welcome back, <span className="text-orange-400">{user.username ?? "Survivor"}</span></>
              ) : (
                <>Your <span className="text-orange-400">Once Human</span> Dashboard</>
              )}
            </h1>
            <p className="mt-1 text-stone-400 text-sm">
              {user ? "Manage your account, UID, and server access." : "Sign in with Discord to unlock all features."}
            </p>
          </div>
          {!user && (
            <a
              href="/auth/discord/start?next=/dashboard"
              className="inline-flex h-11 items-center gap-2.5 rounded-2xl bg-[#5865F2] px-6 text-sm font-bold text-white hover:bg-[#4752c4] transition-all shadow-[0_0_24px_rgba(88,101,242,0.35)]"
            >
              <svg width="18" height="18" viewBox="0 0 71 55" fill="currentColor"><path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.4a.2.2 0 0 0-.2.1 40.7 40.7 0 0 0-1.8 3.7 54 54 0 0 0-16.2 0A37.4 37.4 0 0 0 25.4.5a.2.2 0 0 0-.2-.1A58.4 58.4 0 0 0 10.6 4.9a.2.2 0 0 0-.1.1C1.6 18.1-.9 31 .3 43.7a.2.2 0 0 0 .1.2 58.8 58.8 0 0 0 17.7 9 .2.2 0 0 0 .2-.1 42 42 0 0 0 3.6-5.9.2.2 0 0 0-.1-.3 38.7 38.7 0 0 1-5.5-2.6.2.2 0 0 1 0-.4c.4-.3.7-.6 1.1-.9a.2.2 0 0 1 .2 0c11.5 5.3 24 5.3 35.4 0a.2.2 0 0 1 .2 0l1.1.9a.2.2 0 0 1 0 .4 36.2 36.2 0 0 1-5.5 2.6.2.2 0 0 0-.1.3 47.1 47.1 0 0 0 3.6 5.9.2.2 0 0 0 .2.1 58.7 58.7 0 0 0 17.7-9 .2.2 0 0 0 .1-.2c1.5-14.9-2.5-27.8-10.5-39.2a.2.2 0 0 0-.1 0ZM23.7 36.2c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2Zm23.7 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2Z" /></svg>
              Sign in with Discord
            </a>
          )}
        </div>

        {/* ── Auth alerts ── */}
        {sp.auth === "required" && (
          <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-100 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            Please sign in with Discord to continue.
          </div>
        )}
        {sp.auth === "discord_not_configured" && (
          <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
            <span className="font-semibold">Discord login not configured.</span> Add <code className="font-mono text-xs bg-black/30 px-1 py-0.5 rounded">DISCORD_CLIENT_ID</code> and <code className="font-mono text-xs bg-black/30 px-1 py-0.5 rounded">DISCORD_CLIENT_SECRET</code> to your environment.
            {msg && <div className="mt-2 text-xs text-amber-200/80">{msg}</div>}
          </div>
        )}
        {sp.auth === "error" && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-100 flex items-center gap-3">
            <span className="text-xl">❌</span>
            Login failed. {msg && <span className="text-xs opacity-80">{msg}</span>}
          </div>
        )}

        {/* ── Stats row (signed in) ── */}
        {user && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: "SYS STATUS",  value: "ONLINE",     color: "text-emerald-400", glow: "shadow-[0_0_16px_rgba(52,211,153,0.2)]",  border: "border-emerald-500/30", dot: "bg-emerald-400" },
              { label: "SERVER",      value: "ONCE HUMAN", color: "text-orange-300",  glow: "shadow-[0_0_16px_rgba(249,115,22,0.2)]",  border: "border-orange-500/30",  dot: "bg-orange-400" },
              { label: "ACCOUNT",     value: "LINKED",     color: "text-sky-300",    glow: "shadow-[0_0_16px_rgba(56,189,248,0.2)]",  border: "border-sky-500/30",     dot: "bg-sky-400" },
              { label: "WIPE ACCESS", value: "OPEN",       color: "text-lime-300",   glow: "shadow-[0_0_16px_rgba(163,230,53,0.2)]",  border: "border-lime-500/30",    dot: "bg-lime-400" },
            ].map((stat) => (
              <div key={stat.label} className={`relative rounded-2xl border ${stat.border} bg-black/40 backdrop-blur px-4 py-4 flex flex-col gap-2 ${stat.glow} overflow-hidden`}>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${stat.dot} animate-pulse`} />
                  <div className="text-[9px] font-mono font-bold text-stone-500 uppercase tracking-[0.2em]">{stat.label}</div>
                </div>
                <div className={`text-base font-black font-mono tracking-wider ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Account + UID ── */}
        <div className="grid gap-4 lg:grid-cols-2 mb-8">
          {/* Account card */}
          <div className="relative rz-surface rounded-2xl p-6 border border-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.06)] overflow-hidden">
            <div className="pointer-events-none absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-orange-400/50 rounded-tl-2xl" />
            <div className="pointer-events-none absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-orange-400/50 rounded-tr-2xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-orange-400/30 rounded-bl-2xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-orange-400/30 rounded-br-2xl" />
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-[#5865F2]/20 flex items-center justify-center text-lg">👤</div>
              <div>
                <div className="text-sm font-bold text-white">Discord Account</div>
                <div className="text-xs text-stone-500">{user ? `@${user.username ?? "unknown"}` : "Not signed in"}</div>
              </div>
              <div className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${user ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "bg-red-500/15 text-red-400 border border-red-500/25"}`}>
                {user ? "Connected" : "Offline"}
              </div>
            </div>
            {user ? (
              <form action="/auth/sign-out" method="post">
                <button className="h-9 w-full rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-stone-300 hover:bg-white/10 hover:text-white transition">
                  Sign out
                </button>
              </form>
            ) : (
              <a
                href="/auth/discord/start?next=/dashboard"
                className="flex h-9 w-full items-center justify-center rounded-xl bg-[#5865F2] text-sm font-bold text-white hover:bg-[#4752c4] transition"
              >
                Sign in with Discord
              </a>
            )}
          </div>

          {/* UID card */}
          <div className="relative rz-surface rounded-2xl p-6 border border-lime-500/20 shadow-[0_0_30px_rgba(132,204,22,0.05)] overflow-hidden">
            <div className="pointer-events-none absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-lime-400/50 rounded-tl-2xl" />
            <div className="pointer-events-none absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-lime-400/50 rounded-tr-2xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-lime-400/30 rounded-bl-2xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-lime-400/30 rounded-br-2xl" />
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-orange-400/20 flex items-center justify-center text-lg">🆔</div>
              <div>
                <div className="text-sm font-bold text-white">In-Game UID</div>
                <div className="text-xs text-stone-500">Required before purchasing any pack</div>
              </div>
              <div className="ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-400 border border-amber-500/25">
                Required
              </div>
            </div>
            <div className="flex gap-2">
              <input
                className="h-9 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-stone-600 focus:border-orange-400/40 transition"
                placeholder="Enter your Once Human UID"
                disabled={!user}
              />
              <button
                className={`h-9 shrink-0 rounded-xl px-4 text-sm font-bold transition ${user ? "bg-orange-500 text-stone-950 hover:bg-orange-400" : "bg-stone-700 text-stone-500 cursor-not-allowed"}`}
                disabled={!user}
              >
                Save
              </button>
            </div>
            {!user && <p className="mt-2 text-xs text-stone-600">Sign in first to save your UID.</p>}
          </div>
        </div>

        {/* ── Quick access ── */}
        <div className="relative rz-surface rounded-2xl p-6 border border-white/8 overflow-hidden">
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
          <div className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-stone-500 mb-4">▶ SYS::QUICK_ACCESS</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group rounded-xl border p-4 transition-all ${item.color}`}
              >
                <div className="text-2xl mb-2">{item.emoji}</div>
                <div className="text-sm font-bold text-white group-hover:text-orange-100 transition">{item.label}</div>
                <div className="text-xs text-stone-500 mt-0.5 leading-relaxed">{item.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

