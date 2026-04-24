import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "VoxBridge — Once Human Community";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #050810 0%, #0c1220 40%, #050810 100%)",
          position: "relative",
          overflow: "hidden",
          fontFamily: "sans-serif",
        }}
      >
        {/* Radial glow top-left */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            left: "-80px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)",
          }}
        />
        {/* Radial glow bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            right: "-60px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Subtle grid lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Top badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(99,102,241,0.12)",
            border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: "100px",
            padding: "6px 18px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#6366f1",
            }}
          />
          <span style={{ color: "#a5b4fc", fontSize: "16px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            VoxBridge Community Platform
          </span>
        </div>

        {/* Main title */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "0px",
            marginBottom: "16px",
          }}
        >
          <span
            style={{
              fontSize: "110px",
              fontWeight: 900,
              color: "#fff",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            Vox
          </span>
          <span
            style={{
              fontSize: "110px",
              fontWeight: 900,
              color: "#6366f1",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            Bridge
          </span>
        </div>

        {/* Divider line */}
        <div
          style={{
            width: "160px",
            height: "4px",
            background: "linear-gradient(90deg, transparent, #6366f1, transparent)",
            marginBottom: "24px",
            borderRadius: "2px",
          }}
        />

        {/* Description */}
        <div
          style={{
            fontSize: "24px",
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: "750px",
            lineHeight: 1.5,
            marginBottom: "36px",
          }}
        >
          Translation · VIP Perks · Live Feed · Community Tools
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: "12px" }}>
          {[
            { label: "🛒  Wipe Store",     color: "#6366f1" },
            { label: "🎫  Support",         color: "#22d3ee" },
            { label: "💬  Community",       color: "#10b981" },
            { label: "🎰  Lottery",         color: "#f59e0b" },
          ].map(({ label, color }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                background: `${color}18`,
                border: `1px solid ${color}40`,
                borderRadius: "100px",
                padding: "8px 24px",
                fontSize: "16px",
                fontWeight: 700,
                color: "#f8fafc",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: "28px",
            fontSize: "15px",
            color: "#475569",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          voxbridge.app
        </div>
      </div>
    ),
    { ...size }
  );
}
