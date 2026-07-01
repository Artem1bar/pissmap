import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PissMap NOLA",
    short_name: "PissMap",
    description:
      "Field-vetted places to pee in New Orleans — public restrooms, buy-a-coffee spots, and hotel lobbies, with open-now hours and walking directions.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0c0f",
    theme_color: "#0b0c0f",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
