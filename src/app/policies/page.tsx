import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Policies | NewHopeGGN",
  description: "Refund policy, fair service terms, account responsibility, and enforcement guidelines for NewHopeGGN.",
  keywords: ["policies", "refund", "terms", "conditions", "Once Human", "NewHopeGGN"],
  openGraph: {
    title: "Policies | NewHopeGGN",
    description: "Refund policy, fair service terms, and enforcement guidelines.",
    type: "website",
    images: [{ url: "https://newhopeggn-ggnexusteam.vercel.app/opengraph-image", width: 1200, height: 630 }],
  },
};

const policyCards = [
  {
    title: "No Refund Policy",
    copy:
      "All purchases are final once delivery work begins, VIP access is granted, or pack handling has started. Chargebacks and refund abuse may lead to permanent removal from the community.",
  },
  {
    title: "Fair Service Policy",
    copy:
      "We only process purchases and support actions through verified channels. Impersonation, false claims, and manipulated payment evidence are treated as fraud.",
  },
  {
    title: "Account Responsibility",
    copy:
      "Players are responsible for providing the correct Discord account and in-game UID before delivery. Incorrect information can delay or void fulfillment.",
  },
];

const enforcement = [
  "No building in cities. All structures must stay outside designated urban areas.",
  "No cheating accusations without clear video proof. Repeated false accusations can lead to warnings or more serious action.",
  "No hacks, exploits, injected tools, infections, or script-based unfair advantages.",
  "Violations may result in immediate punishment depending on severity.",
];

export default function PoliciesPage() {
  return (
    <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:py-14">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rz-surface rz-panel-border rounded-[2rem] p-7 sm:p-9">
          <div className="rz-chip">Site Policies</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Professional policies for purchases, community trust, and enforcement.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
            These policies help protect staff, players, and the overall service experience.
            They are written to keep the community clear, fair, and consistent.
          </p>

          <div className="mt-8 grid gap-4">
            {policyCards.map((policy) => (
              <div
                key={policy.title}
                className="rounded-[1.5rem] border border-white/8 bg-slate-950/55 p-5"
              >
                <div className="text-lg font-semibold text-white">{policy.title}</div>
                <div className="mt-2 text-sm leading-7 text-slate-400">{policy.copy}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rz-surface rz-panel-border rounded-[2rem] p-7 sm:p-9">
          <div className="rz-chip">Enforcement</div>
          <h2 className="mt-4 text-3xl font-semibold text-white">Zero confusion. Clear consequences.</h2>
          <div className="mt-6 grid gap-3">
            {enforcement.map((rule) => (
              <div
                key={rule}
                className="rounded-[1.35rem] border border-white/8 bg-slate-950/55 px-4 py-4 text-sm text-slate-300"
              >
                {rule}
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">
            Immediate punishment may be applied for confirmed hacking, exploit abuse, or malicious disruption.
          </div>
        </div>
      </section>
    </div>
  );
}
