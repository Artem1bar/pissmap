import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0c0f",
        }}
      >
        <svg width="128" height="128" viewBox="0 0 64 64">
          <path
            d="M32 7C32 7 15 27.5 15 39a17 17 0 0 0 34 0C49 27.5 32 7 32 7Z"
            fill="#f7c948"
          />
          <circle cx="25.5" cy="38" r="5" fill="#0b0c0f" opacity="0.22" />
        </svg>
      </div>
    ),
    size,
  );
}
