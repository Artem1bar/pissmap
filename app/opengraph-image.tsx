import { ImageResponse } from "next/og";
import { CATEGORIES, CATEGORY_META } from "@/lib/categories";
import { SPOTS } from "@/lib/spots";

export const alt = "PissMap NOLA — where to pee in New Orleans, when you gotta geaux";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "#0b0c0f",
          backgroundImage:
            "radial-gradient(circle at 82% 18%, rgba(247,201,72,0.14), transparent 46%), radial-gradient(circle at 12% 88%, rgba(167,139,250,0.12), transparent 42%)",
          padding: "72px 84px",
          fontFamily: "sans-serif",
        }}
      >
        <svg width="230" height="230" viewBox="0 0 64 64" style={{ marginRight: 64 }}>
          <path
            d="M32 4C32 4 13 27 13 40a19 19 0 0 0 38 0C51 27 32 4 32 4Z"
            fill="#f7c948"
          />
          <circle cx="24.5" cy="39" r="5.5" fill="#0b0c0f" opacity="0.22" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 800, color: "#f2f3f7" }}>
            PissMap&nbsp;<span style={{ color: "#f7c948" }}>NOLA</span>
          </div>
          <div style={{ display: "flex", fontSize: 38, color: "#b9bdca", fontStyle: "italic" }}>
            when you gotta geaux ⚜
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 34,
              fontSize: 27,
              color: "#838a9c",
              maxWidth: 660,
            }}
          >
            {SPOTS.length} field-vetted places to pee in New Orleans — open-now hours, walking
            directions, zero judgment.
          </div>
          <div style={{ display: "flex", marginTop: 40, gap: 34 }}>
            {CATEGORIES.map((category) => (
              <div
                key={category}
                style={{ display: "flex", alignItems: "center", fontSize: 24, color: "#b9bdca" }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    background: CATEGORY_META[category].color,
                    marginRight: 12,
                  }}
                />
                {CATEGORY_META[category].label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
