import type { Metadata } from "next";
import { hasRealDomain, siteUrl } from "@/lib/site";
import StickerStudio from "./StickerStudio";

export const metadata: Metadata = {
  title: "Sticker studio",
  description: "Generate print-ready QR stickers for PissMap NOLA spots.",
  robots: { index: false, follow: false },
};

export default function StickersPage() {
  // The base URL is resolved on the server (the browser can't see Vercel's
  // production URL), then handed to the client studio for QR generation.
  return <StickerStudio baseUrl={siteUrl()} realDomain={hasRealDomain()} />;
}
