export default function AboutPage() {
  const admins = ["Kilo", "Buzzworthy", "Zeus", "Hope", "Encriptado", "Jon", "Cortez"];
  const stars = [
    { top: "8%", left: "10%", delay: "0.1s" },
    { top: "14%", left: "32%", delay: "0.8s" },
    { top: "10%", left: "58%", delay: "1.2s" },
    { top: "22%", left: "82%", delay: "0.4s" },
    { top: "36%", left: "18%", delay: "1.6s" },
    { top: "44%", left: "46%", delay: "0.3s" },
    { top: "52%", left: "72%", delay: "1.4s" },
    { top: "68%", left: "14%", delay: "0.6s" },
    { top: "74%", left: "54%", delay: "1.1s" },
    { top: "84%", left: "86%", delay: "1.9s" },
  ];

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-950/35 via-black/60 to-cyan-950/30" />
      <div className="rz-parallax-galaxy pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,0.18),transparent_38%),radial-gradient(circle_at_80%_24%,rgba(34,211,238,0.16),transparent_40%),radial-gradient(circle_at_40%_80%,rgba(217,70,239,0.12),transparent_36%)]" />
      <div className="rz-starfield pointer-events-none">
        {stars.map((star, idx) => (
          <span
            key={`about-star-${idx}`}
            className="rz-star"
            style={{ top: star.top, left: star.left, animationDelay: star.delay }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 rz-grid opacity-20" />
      <div className="pointer-events-none absolute left-1/4 top-8 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl rz-pulse" />
      <div className="pointer-events-none absolute right-1/4 bottom-8 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl rz-pulse" />

      <section className="relative mx-auto w-full max-w-6xl px-4 py-12">
        <div className="rz-lux-panel rounded-3xl p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            About NewHopeGGN
          </div>
          <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
            Support for the &quot;Once Human&quot; game server
          </h1>
          <p className="mt-3 max-w-3xl text-zinc-300">
            NewHopeGGN is focused on fair play, rapid support, and a premium player
            experience. Our team monitors support tickets and purchase flow events
            so players get fast answers and reliable delivery.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rz-lux-panel rounded-2xl p-5">
            <div className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
              What We Provide
            </div>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              <li>- Discord-based login and account flow.</li>
              <li>- Support tickets directly to staff Discord channels.</li>
              <li>- Verified pack purchase process and VIP perks.</li>
              <li>- Modern futuristic dashboard and store UI.</li>
            </ul>
          </div>

          <div className="rz-lux-panel rounded-2xl p-5">
            <div className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
              Server Admin and Support Team
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {admins.map((admin) => (
                <div
                  key={admin}
                  className="rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-center text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-emerald-300/40"
                >
                  {admin}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

