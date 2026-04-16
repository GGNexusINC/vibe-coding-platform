const rules = [
  {
    id: "01",
    title: "Respect Everyone",
    copy: "No toxicity, hate speech, or harassment. Keep it clean, keep it classy.",
  },
  {
    id: "02",
    title: "No Spam or Ads",
    copy: "No flooding, random links, or self-promo without approval.",
  },
  {
    id: "03",
    title: "Use Channels Properly",
    copy: "Stay on topic. Each channel has its purpose, so use it right.",
  },
  {
    id: "04",
    title: "Keep It Safe",
    copy: "No NSFW content. This is a mixed community, so keep it appropriate.",
  },
  {
    id: "05",
    title: "No Drama",
    copy: "Discussions are okay. Starting fights is not.",
  },
  {
    id: "06",
    title: "Fair Play Only",
    copy: "No cheating, hacking, exploiting, or unfair advantages in any game.",
  },
  {
    id: "07",
    title: "Respect Staff Decisions",
    copy: "Moderators and admins have the final say on enforcement and conflict resolution.",
  },
  {
    id: "08",
    title: "Positive Vibes Only",
    copy: "Bring teamwork, energy, and community-first behavior.",
  },
];

export default function RulesPage() {
  return (
    <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:py-14">
      <section className="rz-surface rz-panel-border rounded-[2rem] p-7 sm:p-9">
        <div className="rz-chip">Discord Rules</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Gaming server rules built for a serious but positive community.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
          Welcome to the server where legends are made. Respect the space, respect the players,
          and help us keep the community sharp, safe, and competitive.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="rounded-[1.5rem] border border-white/8 bg-slate-950/55 p-5"
            >
              <div className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">
                {rule.id}
              </div>
              <div className="mt-2 text-lg font-semibold text-white">{rule.title}</div>
              <div className="mt-2 text-sm leading-7 text-slate-400">{rule.copy}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-amber-300/20 bg-amber-400/10 p-5">
            <div className="text-sm font-semibold text-amber-100">Enforcement System</div>
            <div className="mt-2 text-sm text-amber-50">Warning | Mute | Kick | Ban</div>
          </div>
          <div className="rounded-[1.5rem] border border-white/8 bg-slate-950/55 p-5 text-sm text-slate-300">
            Break rules, face consequences. Follow rules, become legend.
          </div>
        </div>
      </section>
    </div>
  );
}
