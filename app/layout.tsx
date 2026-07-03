import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { siteUrl } from "@/lib/site";
import { SPOTS } from "@/lib/spots";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const DESCRIPTION = `${SPOTS.length} field-vetted places to take a leak in New Orleans — public restrooms, buy-a-coffee spots, and hotel lobbies. Open-now hours, walking directions, zero judgment.`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "PissMap NOLA — where to pee in New Orleans",
    template: "%s · PissMap NOLA",
  },
  description: DESCRIPTION,
  applicationName: "PissMap NOLA",
  keywords: [
    "New Orleans",
    "public restrooms",
    "bathrooms",
    "French Quarter",
    "toilets",
    "map",
    "Bourbon Street",
    "Mardi Gras",
  ],
  openGraph: {
    title: "PissMap NOLA — when you gotta geaux",
    description: DESCRIPTION,
    type: "website",
    siteName: "PissMap NOLA",
  },
  twitter: {
    card: "summary_large_image",
    title: "PissMap NOLA — when you gotta geaux",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0c0f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
