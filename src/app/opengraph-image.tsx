import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Zenpho — MVP Development Agency";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#050c20",
          color: "#f4f0e4",
          padding: 72,
          fontFamily: "Georgia",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 28,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              border: "1px solid rgba(244,240,228,.65)",
              borderRadius: "50%",
            }}
          />
          Zenpho
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 28,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "#e6cb85",
            }}
          >
            MVP Development Agency
          </div>
          <div
            style={{
              maxWidth: 900,
              fontSize: 92,
              lineHeight: 0.98,
              letterSpacing: "-0.04em",
            }}
          >
            Build launch-ready software in as little as two weeks.
          </div>
        </div>
        <div
          style={{
            fontSize: 26,
            color: "rgba(244,240,228,.72)",
            letterSpacing: "0.08em",
          }}
        >
          Miami · United States · Worldwide
        </div>
      </div>
    ),
    size,
  );
}
