import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/growth/PageShell";
import { PrintButton } from "@/components/growth/PrintButton";
import { DropletLogo } from "@/components/icons";
import { GITHUB_ISSUES_URL, GITHUB_REPO_URL } from "@/lib/links";
import { datasetStats } from "@/lib/stats";

export const metadata: Metadata = {
  title: "Press kit",
  description: "The story, the numbers, and the assets behind PissMap NOLA.",
};

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-night-600 bg-night-900 px-4 py-3 text-center">
      <div className="font-display text-3xl font-black text-gold-300">{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-500">{label}</div>
    </div>
  );
}

export default function PressPage() {
  const stats = datasetStats();

  return (
    <PageShell>
      <div className="mb-5 mt-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DropletLogo className="h-9 w-9 text-gold-400" />
          <div className="leading-tight">
            <div className="font-display text-xl font-black italic">
              PissMap <span className="text-gold-400">NOLA</span>
            </div>
            <div className="text-xs text-ink-500">Press kit</div>
          </div>
        </div>
        <PrintButton />
      </div>

      <h1 className="font-display text-3xl font-black leading-tight">
        The map for when you gotta geaux.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-300">
        New Orleans hands you a drink for the street, then offers you nowhere to put it. PissMap
        NOLA is the fix: an interactive, no-login map of{" "}
        <strong className="text-ink-100">{stats.total} field-vetted places to pee</strong> across
        the whole city — free public restrooms, buy-a-coffee spots, and hotel lobbies for the bold —
        with live open/closed status, distance sorting, and a panic button.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={String(stats.total)} label="Vetted spots" />
        <Stat value={String(stats.neighborhoods)} label="Neighborhoods" />
        <Stat value={String(stats.open247)} label="Open 24/7" />
        <Stat value={String(stats.wheelchair)} label="Accessible" />
      </div>

      <h2 className="mt-8 font-display text-lg font-bold text-gold-300">The data-honesty angle</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-300">
        The dataset was compiled from OpenStreetMap and hard-won local knowledge, then expanded by a{" "}
        <strong className="text-ink-100">50-agent research fleet</strong> that swept every
        neighborhood — and each candidate was <em>adversarially fact-checked</em> against live
        sources before earning a pin. Closed venues, wrong addresses, coin-operated toilets posing
        as free, and invented accessibility claims got cut. Where hours drift — and in New Orleans
        they always do — the app flags it out loud instead of pretending, so you always know which
        times to sanity-check before you sprint.
      </p>

      <h2 className="mt-8 font-display text-lg font-bold text-gold-300">The legal bit</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-300">
        Public urination is a citable municipal offense in New Orleans, and police write those
        tickets — especially around Bourbon Street and during Carnival. PissMap exists so nobody
        has to test it. It&apos;s a harm-reduction map dressed up as a joke, and it stays free for
        users forever.
      </p>

      <h2 className="mt-8 font-display text-lg font-bold text-gold-300">Boilerplate</h2>
      <blockquote className="mt-2 rounded-xl border-l-2 border-gold-600 bg-night-900 px-4 py-3 text-sm italic leading-relaxed text-ink-300">
        &ldquo;PissMap NOLA is a free, no-login map of {stats.total} field-vetted places to pee
        across New Orleans, with live open-now hours, walking directions, and a one-tap panic
        button — built to keep the city&apos;s go-cup culture out of trouble.&rdquo;
      </blockquote>

      <h2 className="mt-8 font-display text-lg font-bold text-gold-300">Assets & contact</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href="/icon.svg"
          download="pissmap-logo.svg"
          className="rounded-full border border-night-600 px-4 py-1.5 text-sm font-medium text-ink-300 transition-colors hover:border-gold-600 hover:text-gold-300"
        >
          Download logo (SVG)
        </a>
        <Link
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-night-600 px-4 py-1.5 text-sm font-medium text-ink-300 transition-colors hover:border-gold-600 hover:text-gold-300"
        >
          Source on GitHub
        </Link>
        <Link
          href={GITHUB_ISSUES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-gold-400 px-4 py-1.5 text-sm font-bold text-night-950 transition-colors hover:bg-gold-300"
        >
          Contact / press → GitHub issues
        </Link>
      </div>

      <p className="mt-8 text-xs text-ink-500">
        Map data © OpenStreetMap contributors · basemap © CARTO · built with MapLibre GL and
        Next.js. Not affiliated with the City of New Orleans, obviously.
      </p>
    </PageShell>
  );
}
