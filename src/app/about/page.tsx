"use client";

const gameScreenshots = [
  {
    src: "https://cdn.akamai.steamstatic.com/steam/apps/2139460/ss_1.jpg",
    fallback: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2139460/header.jpg",
    label: "Open World Survival",
    desc: "Explore a vast contaminated open world with dynamic weather and day/night cycles.",
  },
  {
    src: "https://cdn.akamai.steamstatic.com/steam/apps/2139460/ss_2.jpg",
    fallback: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2139460/header.jpg",
    label: "Base Building",
    desc: "Construct and fortify your base to survive contamination waves and enemy raids.",
  },
  {
    src: "https://cdn.akamai.steamstatic.com/steam/apps/2139460/ss_3.jpg",
    fallback: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2139460/header.jpg",
    label: "Co-op & PvP",
    desc: "Team up with allies or face other survivors in intense PvPvE encounters.",
  },
];

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
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
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

        {/* ── Game screenshots ── */}
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500 mb-4">📸 Once Human — The Game</div>
          <div className="grid gap-4 sm:grid-cols-3">
            {gameScreenshots.map((shot) => (
              <div key={shot.label} className="rz-surface rz-panel-border rounded-2xl overflow-hidden group">
                <div className="relative h-36 bg-stone-900">
                  <img
                    src={shot.src}
                    alt={shot.label}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (img.src !== shot.fallback) img.src = shot.fallback;
                      else img.style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
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
              {admins.map((admin) => (
                <div
                  key={admin}
                  className="rounded-xl border border-orange-400/15 bg-orange-400/5 px-3 py-3 text-center text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-orange-400/35 hover:bg-orange-400/10"
                >
                  {admin}
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-stone-500 leading-relaxed">
              Our staff team keeps the server running, tickets answered, and the community positive. Reach them anytime through Discord.
            </p>
          </div>
        </div>

      </section>
    </div>
  );
}

