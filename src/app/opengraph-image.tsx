import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "NewHopeGGN — Once Human Community";
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
          background: "linear-gradient(135deg, #0a0d06 0%, #0f1a10 40%, #0d110a 100%)",
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
            background: "radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%)",
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
            background: "radial-gradient(circle, rgba(132,204,22,0.12) 0%, transparent 70%)",
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
            background: "rgba(249,115,22,0.12)",
            border: "1px solid rgba(249,115,22,0.3)",
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
              background: "#4ade80",
            }}
          />
          <span style={{ color: "#fdba74", fontSize: "16px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Once Human Community Server
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
              fontSize: "96px",
              fontWeight: 900,
              color: "#fff1e6",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            NewHope
          </span>
          <span
            style={{
              fontSize: "96px",
              fontWeight: 900,
              color: "#a3e635",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            GGN
          </span>
        </div>

        {/* Divider line */}
        <div
          style={{
            width: "120px",
            height: "3px",
            background: "linear-gradient(90deg, transparent, #f97316, transparent)",
            marginBottom: "24px",
            borderRadius: "2px",
          }}
        />

        {/* Description */}
        <div
          style={{
            fontSize: "22px",
            color: "#a8a29e",
            textAlign: "center",
            maxWidth: "700px",
            lineHeight: 1.5,
            marginBottom: "36px",
          }}
        >
          Wipe packs · VIP perks · Live Discord feed · Support tickets
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: "12px" }}>
          {[
            { label: "🛒  Wipe Store",     color: "#f97316" },
            { label: "🎫  Support",         color: "#22d3ee" },
            { label: "💬  Community",       color: "#a78bfa" },
            { label: "🎰  Lottery",         color: "#fbbf24" },
          ].map(({ label, color }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                background: `${color}18`,
                border: `1px solid ${color}40`,
                borderRadius: "100px",
                padding: "8px 20px",
                fontSize: "15px",
                fontWeight: 600,
                color: "#e7e5e4",
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
            color: "#57534e",
            letterSpacing: "0.1em",
          }}
        >
          newhopeggn.com
        </div>
      </div>
    ),
    { ...size }
  );
}
