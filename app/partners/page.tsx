import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/growth/PageShell";
import { spotPath } from "@/lib/site";
import { SPOTS } from "@/lib/spots";

export const metadata: Metadata = {
  title: "Partners",
  description:
    "Bars and cafés partner with PissMap NOLA: a gold pin badge, a deal line, and their own QR sticker. Launch special: free.",
};

export default function PartnersPage() {
  const partners = SPOTS.filter((s) => s.partner);

  return (
    <PageShell>
      <h1 className="mt-5 font-display text-4xl font-black italic">
        Partner <span className="text-gold-400">venues</span>
      </h1>
      <p className="mt-2 max-w-xl text-ink-300">
        PissMap sends thirsty, desperate people to a bathroom. Partners turn that walk-in into a
        regular. A gold pin, a deal line, and a QR sticker for your window — that&apos;s it.
      </p>

      {partners.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-night-600 bg-night-900 p-6">
          <p className="font-display text-lg font-bold text-gold-300">
            No partners yet — the door&apos;s wide open.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-300">
            Be the first venue on the map with a gold PARTNER ribbon. Offer &ldquo;show this app for
            $1 off&rdquo; and become the bathroom people <em>choose</em>, then stick around to buy a
            drink. New Orleans runs on go-cups and good will; this is both.
          </p>
          <Link
            href="/partners/pitch"
            className="mt-4 inline-flex rounded-full bg-gold-400 px-4 py-2 text-sm font-bold text-night-950 transition-colors hover:bg-gold-300"
          >
            Read the one-page pitch →
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {partners.map((spot) => (
            <li key={spot.id}>
              <Link
                href={spotPath(spot.id)}
                className="flex items-center justify-between gap-3 rounded-2xl border border-gold-600/60 bg-gold-400/[0.06] px-4 py-3 transition-colors hover:bg-gold-400/10"
              >
                <span>
                  <span className="block font-semibold text-ink-100">{spot.name}</span>
                  <span className="block text-sm text-gold-300">{spot.partner?.deal}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-500">{spot.neighborhood} →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 border-t border-night-700 pt-5 text-sm text-ink-500">
        Are you a venue?{" "}
        <Link href="/partners/pitch" className="font-medium text-gold-300 hover:text-gold-400">
          See what partners get →
        </Link>
      </div>
    </PageShell>
  );
}
