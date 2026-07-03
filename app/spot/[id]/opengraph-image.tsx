import { ImageResponse } from "next/og";
import { CATEGORY_META } from "@/lib/categories";
import { getSpotById } from "@/lib/spots";

export const alt = "A spot on PissMap NOLA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Per-spot share card in the app's dark/gold style. Generated on demand and
// CDN-cached, so a 412-page build stays fast.
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const spot = getSpotById(id);
  const category = spot ? CATEGORY_META[spot.category] : null;
  const name = spot?.name ?? "PissMap NOLA";
  const neighborhood = spot?.neighborhood ?? "New Orleans";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0c0f",
          backgroundImage:
            "radial-gradient(circle at 84% 14%, rgba(247,201,72,0.16), transparent 46%), radial-gradient(circle at 10% 90%, rgba(167,139,250,0.12), transparent 42%)",
          padding: "72px 84px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <svg width="64" height="64" viewBox="0 0 64 64" style={{ marginRight: 22 }}>
            <path d="M32 4C32 4 13 27 13 40a19 19 0 0 0 38 0C51 27 32 4 32 4Z" fill="#f7c948" />
          </svg>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#b9bdca" }}>
            PissMap&nbsp;<span style={{ color: "#f7c948" }}>NOLA</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: name.length > 26 ? 68 : 84,
              fontWeight: 800,
              color: "#f2f3f7",
              lineHeight: 1.05,
              maxWidth: 1000,
            }}
          >
            {name}
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 26, fontSize: 30 }}>
            {category ? (
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: category.color,
                  marginRight: 14,
                }}
              />
            ) : null}
            <span style={{ color: "#b9bdca" }}>
              {category ? `${category.label} · ` : ""}
              {neighborhood}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 26, color: "#838a9c", fontStyle: "italic" }}>
          when you gotta geaux ⚜
        </div>
      </div>
    ),
    size,
  );
}
