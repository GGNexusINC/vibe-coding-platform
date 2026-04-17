import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rules | NewHopeGGN",
  description: "Community rules and guidelines for NewHopeGGN Once Human server. Respect, safety, and fair play policies.",
  keywords: ["rules", "guidelines", "community", "Once Human", "NewHopeGGN", "conduct"],
  openGraph: {
    title: "Rules | NewHopeGGN",
    description: "Community rules and guidelines for NewHopeGGN Once Human server.",
    type: "website",
  },
};

const rules = [
  {
    id: "01",
    emoji: "🤝",
    title: "Respect Everyone",
    copy: "No toxicity, hate speech, or harassment toward other survivors. Keep it clean, keep it classy — we're all here to enjoy Once Human.",
  },
  {
    id: "02",
    emoji: "🚫",
    title: "No Spam or Ads",
    copy: "No flooding channels, posting random links, or self-promoting without staff approval.",
  },
  {
    id: "03",
    emoji: "📋",
    title: "Use Channels Properly",
    copy: "Stay on topic. #guides is for guides, #memes is for memes. Each channel has a purpose — use it right.",
  },
  {
    id: "04",
    emoji: "🛡️",
    title: "Keep It Safe",
    copy: "No NSFW content. This is a mixed-age community, so keep everything appropriate.",
  },
  {
    id: "05",
    emoji: "☮️",
    title: "No Drama",
    copy: "Healthy discussions are welcome. Starting fights, spreading rumors, or stirring conflict is not.",
  },
  {
    id: "06",
    emoji: "⚔️",
    title: "Fair Play Only",
    copy: "No cheating, hacking, exploiting game bugs, or using any unfair advantages in Once Human. Play clean.",
  },
  {
    id: "07",
    emoji: "🚛",
    title: "No Meteor Truck",
    copy: "Do NOT use the Meteor Truck. This is a server rule — using it ruins the experience for the entire server. Violations will result in immediate action.",
    highlight: true,
  },
  {
    id: "08",
    emoji: "👮",
    title: "Respect Staff Decisions",
    copy: "Moderators and admins have the final say on all enforcement. Arguing against staff rulings publicly is not allowed — use a support ticket instead.",
  },
  {
    id: "09",
    emoji: "🌟",
    title: "Positive Vibes Only",
    copy: "Help new players, share knowledge, and bring good energy. We're building a community — not just a server.",
  },
];

export default function RulesPage() {
  return (
    <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:py-14">
      <section className="rz-surface rz-panel-border rounded-[2rem] p-7 sm:p-9">
        <div className="rz-chip">⚠️ Server Rules</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          NewHopeGGN <span className="text-orange-400">Once Human</span> Server Rules
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-stone-300">
          Welcome to the contamination zone. Respect the space, respect your fellow survivors,
          and help us keep this community sharp, safe, and fun for everyone.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`rounded-[1.5rem] border p-5 transition-all ${
                rule.highlight
                  ? "border-red-500/40 bg-red-500/10 shadow-[0_0_24px_rgba(239,68,68,0.08)]"
                  : "border-white/8 bg-slate-950/55 hover:border-orange-400/20 hover:bg-orange-400/5"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{rule.emoji}</span>
                <div className={`text-xs uppercase tracking-[0.24em] font-bold ${rule.highlight ? "text-red-400" : "text-orange-400/70"}`}>
                  Rule {rule.id}
                </div>
              </div>
              <div className={`text-base font-semibold ${rule.highlight ? "text-red-200" : "text-white"}`}>{rule.title}</div>
              <div className="mt-2 text-sm leading-7 text-slate-400">{rule.copy}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-orange-400/25 bg-orange-400/10 p-5">
            <div className="text-sm font-semibold text-orange-100 mb-2">⚡ Enforcement System</div>
            <div className="flex flex-wrap gap-2">
              {["Warning", "Mute", "Kick", "Ban"].map((level, i) => (
                <span key={level} className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                  i === 0 ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-200" :
                  i === 1 ? "border-orange-400/30 bg-orange-400/10 text-orange-200" :
                  i === 2 ? "border-red-400/30 bg-red-400/10 text-red-200" :
                            "border-red-600/40 bg-red-600/15 text-red-300"
                }`}>{level}</span>
              ))}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/8 bg-slate-950/55 p-5 text-sm text-stone-300 flex items-center">
            <span className="text-2xl mr-3">🧬</span>
            <span>The contamination spreads when rules are broken. Keep the zone clean — keep the community alive.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
