import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | NewHopeGGN",
  description: "Learn about NewHopeGGN — a dedicated Once Human private server community with wipe packs, VIP perks, fair play rules, and active staff.",
  keywords: ["about", "Once Human", "private server", "community", "NewHopeGGN", "staff"],
  openGraph: {
    title: "About | NewHopeGGN",
    description: "Learn about NewHopeGGN — a dedicated Once Human private server community.",
    type: "website",
    images: [{ url: "https://newhopeggn.vercel.app/opengraph-image", width: 1200, height: 630 }],
  },
};

const gameScreenshots = [
  {
    src: "/GANGGGPCITURE.png",
    label: "Where It All Started",
    desc: "The OG crew hanging at base — Buzzworthy, the gang, and good vibes. This is how NewHopeGGN was born.",
    wide: true,
  },
  {
    src: "/GANG.png",
    label: "Building Together",
    desc: "The team out building bases side by side — every wipe starts here.",
    wide: false,
  },
  {
    src: "/THANOO.png",
    label: "More Than a Game",
    desc: "Chilling with Thanos at the compound — it’s about spending time with friends and building real friendships.",
    wide: false,
  },
  {
    src: "/CORTEZ.png",
    label: "Cortez Hours",
    desc: "Late night storage runs with the squad. Every wipe has moments like this.",
    wide: false,
  },
  {
    src: "/bro.png",
    label: "GG Nexus Crew",
    desc: "The GG Nexus crew rolling out together — the people behind NewHopeGGN.",
    wide: false,
  },
];

const ownerStyles: Record<string, { border: string; bg: string; glow: string; text: string; badge: string }> = {
  Kilo:      { border: "rgba(250,204,21,0.5)",  bg: "rgba(250,204,21,0.1)",  glow: "rgba(250,204,21,0.25)",  text: "#fde047", badge: "👑 Owner" },
  Buzzworthy:{ border: "rgba(34,211,238,0.5)",  bg: "rgba(34,211,238,0.1)",  glow: "rgba(34,211,238,0.25)",  text: "#67e8f9", badge: "⚡ Owner" },
  Zeus:      { border: "rgba(99,102,241,0.5)",  bg: "rgba(99,102,241,0.1)",  glow: "rgba(99,102,241,0.25)",  text: "#a5b4fc", badge: "🌩️ Owner" },
  Hope:      { border: "rgba(244,114,182,0.5)", bg: "rgba(244,114,182,0.1)", glow: "rgba(244,114,182,0.25)", text: "#f9a8d4", badge: "💗 Owner" },
  Jon:       { border: "rgba(74,222,128,0.5)",  bg: "rgba(74,222,128,0.1)",  glow: "rgba(74,222,128,0.25)",  text: "#86efac", badge: "🛡️ Owner" },
  Cortez:    { border: "rgba(251,146,60,0.5)",  bg: "rgba(251,146,60,0.1)",  glow: "rgba(251,146,60,0.25)",  text: "#fdba74", badge: "🔥 Admin" },
};

export default function AboutPage() {
  const admins = ["Kilo", "Buzzworthy", "Zeus", "Hope", "Encriptado", "Jon", "Cortez"];

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-orange-950/20 via-black/60 to-lime-950/10" />
      <div className="rz-parallax-galaxy pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.12),transparent_38%),radial-gradient(circle_at_80%_24%,rgba(132,204,22,0.09),transparent_40%),radial-gradient(circle_at_40%_80%,rgba(251,191,36,0.07),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-0 rz-grid opacity-15" />
      <div className="pointer-events-none absolute left-1/4 top-8 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl rz-pulse" />
      <div className="pointer-events-none absolute right-1/4 bottom-8 h-72 w-72 rounded-full bg-lime-500/8 blur-3xl rz-pulse" />

      <section className="relative mx-auto w-full max-w-6xl px-4 py-12 space-y-8">

        {/* ── Hero banner ── */}
        <div className="rz-surface rz-panel-border rounded-3xl overflow-hidden">
          <div className="relative h-48 sm:h-64 w-full bg-gradient-to-br from-orange-950/80 via-stone-900 to-black">
            <img
              src="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2139460/header.jpg"
              alt="Once Human"
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 sm:p-8">
              <div className="rz-chip mb-3">🎮 Once Human Community</div>
              <h1 className="text-3xl font-black text-white sm:text-4xl leading-tight">
                Welcome to <span className="text-orange-400">NewHopeGGN</span>
              </h1>
              <p className="mt-2 max-w-2xl text-stone-300 text-sm leading-relaxed">
                A dedicated Once Human private server community — fair play, rapid support, wipe packs, and a squad of real players ready to survive together.
              </p>
            </div>
          </div>
        </div>

        {/* ── Community photos ── */}
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500 mb-4">📸 The Community — Real Moments</div>
          {/* Wide hero shot */}
          <div className="rz-surface rz-panel-border rounded-2xl overflow-hidden group mb-4">
            <div className="relative h-56 sm:h-72 bg-stone-900">
              <img
                src={gameScreenshots[0].src}
                alt={gameScreenshots[0].label}
                className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-3 left-4">
                <div className="text-sm font-bold text-orange-300">{gameScreenshots[0].label}</div>
                <div className="text-xs text-stone-400 mt-0.5">{gameScreenshots[0].desc}</div>
              </div>
            </div>
          </div>
          {/* 2x2 grid of remaining 4 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {gameScreenshots.slice(1).map((shot) => (
              <div key={shot.label} className="rz-surface rz-panel-border rounded-2xl overflow-hidden group">
                <div className="relative h-40 bg-stone-900">
                  <img
                    src={shot.src}
                    alt={shot.label}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                  <div className="absolute bottom-2 left-3 text-xs font-bold text-orange-300">{shot.label}</div>
                </div>
                <div className="p-3 text-xs text-stone-400 leading-relaxed">{shot.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── What we provide + team ── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rz-surface rz-panel-border rounded-2xl p-6">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400 mb-4">⚡ What We Provide</div>
            <ul className="space-y-3">
              {[
                { icon: "🛒", text: "Wipe packs each season with resources and VIP perks" },
                { icon: "🎫", text: "Fast Discord-based support tickets answered by real staff" },
                { icon: "📋", text: "Clear server rules for fair play — including No Meteor Truck" },
                { icon: "💬", text: "Live Discord feed visible directly on the community page" },
                { icon: "🎰", text: "Server events, lottery, and Whack-a-Mole mini-games" },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-3 text-sm text-stone-300">
                  <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>

          <div className="rz-surface rz-panel-border rounded-2xl p-6">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-lime-400 mb-4">👥 Staff & Admin Team</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {admins.map((admin) => {
                if (admin === "Encriptado") return (
                  <div key={admin} className="relative rounded-xl px-3 py-3 text-center text-sm font-bold transition hover:-translate-y-0.5"
                    style={{ background: "linear-gradient(135deg,rgba(239,68,68,0.12),rgba(168,85,247,0.12))", boxShadow: "0 0 0 1px rgba(168,85,247,0.35), 0 0 12px rgba(168,85,247,0.12)" }}>
                    <span style={{ background: "linear-gradient(90deg,#ef4444,#f97316,#eab308,#22c55e,#3b82f6,#a855f7,#ef4444)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 3s linear infinite" }}>{admin}</span>
                    <div className="mt-1 text-[9px] font-semibold tracking-widest text-purple-300 uppercase opacity-80">✨ Coming Back Soon</div>
                  </div>
                );
                const s = ownerStyles[admin];
                if (s) return (
                  <div key={admin} className="relative rounded-xl px-3 py-3 text-center text-sm font-bold transition hover:-translate-y-1"
                    style={{ background: s.bg, boxShadow: `0 0 0 1px ${s.border}, 0 0 14px ${s.glow}` }}>
                    <div style={{ color: s.text }}>{admin}</div>
                    <div className="mt-1 text-[9px] font-semibold tracking-widest opacity-70" style={{ color: s.text }}>{s.badge}</div>
                  </div>
                );
                return (
                  <div key={admin} className="rounded-xl border border-orange-400/15 bg-orange-400/5 px-3 py-3 text-center text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-orange-400/35 hover:bg-orange-400/10">
                    {admin}
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-stone-500 leading-relaxed">
              Our staff team keeps the server running, tickets answered, and the community positive. Need help? Use the <a href="/support" className="text-orange-400 hover:underline">Support page</a> to open a ticket and chat with staff directly.
            </p>
          </div>
        </div>

      </section>
    </div>
  );
}

