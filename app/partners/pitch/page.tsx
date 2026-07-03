import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/growth/PageShell";
import { PrintButton } from "@/components/growth/PrintButton";
import { DropletLogo } from "@/components/icons";
import { GITHUB_ISSUES_URL } from "@/lib/links";
import { datasetStats } from "@/lib/stats";

export const metadata: Metadata = {
  title: "Partner pitch",
  description: "The one-page pitch for New Orleans venues joining PissMap NOLA.",
};

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-night-600 bg-night-900 px-4 py-3 text-center">
      <div className="font-display text-2xl font-black text-gold-300">{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-500">{label}</div>
    </div>
  );
}

function Perk({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1 text-gold-400" aria-hidden="true">
        ⚜
      </span>
      <span className="text-sm leading-relaxed text-ink-300">
        <strong className="text-ink-100">{title}.</strong> {children}
      </span>
    </li>
  );
}

export default function PitchPage() {
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
            <div className="text-xs text-ink-500">Partner one-pager · when you gotta geaux ⚜</div>
          </div>
        </div>
        <PrintButton />
      </div>

      <h1 className="font-display text-3xl font-black leading-tight">
        Become the bathroom people <span className="text-gold-400">choose</span>.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-300">
        PissMap NOLA is a free, no-login map of{" "}
        <strong className="text-ink-100">{stats.total} field-vetted places to pee</strong> across
        New Orleans — the app service-industry folks and tourists actually open at 1 a.m. When
        someone nearby is desperate, the map sends them to a door. Partnering makes that door
        yours.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={String(stats.total)} label="Vetted spots" />
        <Stat value={String(stats.neighborhoods)} label="Neighborhoods" />
        <Stat value={String(stats.open247)} label="Open 24/7" />
        <Stat value="$0" label="To join" />
      </div>

      <h2 className="mt-8 font-display text-lg font-bold text-gold-300">What partners get</h2>
      <ul className="mt-3 space-y-2.5">
        <Perk title="A gold PARTNER ribbon">
          Your pin and detail card wear a gold badge — instant trust for someone deciding where to
          walk in.
        </Perk>
        <Perk title="A deal line">
          A single line you choose, e.g. &ldquo;show this app for $1 off.&rdquo; A friendly reason
          to buy something while they&apos;re here.
        </Perk>
        <Perk title="Your own QR sticker">
          A print-ready sticker for the window or door. A scan drops the passer-by straight onto
          your pin — and quietly logs the scan so you can see it working.
        </Perk>
        <Perk title="A shareable permalink">
          Your spot gets its own page and share card — post it, print it, hand it out.
        </Perk>
      </ul>

      <h2 className="mt-8 font-display text-lg font-bold text-gold-300">What it costs</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-300">
        <strong className="text-ink-100">Launch special: free.</strong> No contracts, no payments,
        no dashboards to learn. We&apos;re not going to promise you a number of customers — that
        would be dishonest, and honesty is the whole brand. We&apos;ll put you on the map, hand you
        a sticker, and let the 1 a.m. crowd do the rest.
      </p>

      <h2 className="mt-8 font-display text-lg font-bold text-gold-300">The data, honestly</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-300">
        Every spot was compiled from OpenStreetMap and local knowledge, then swept by a
        50-agent research fleet and <em>adversarially fact-checked</em> against live sources —
        closed venues and invented claims got cut. Where hours drift, we say so out loud. You&apos;re
        joining a map people trust.
      </p>

      <div className="mt-8 rounded-2xl border border-gold-600/50 bg-gold-400/[0.06] p-5">
        <p className="font-display text-lg font-bold text-ink-100">Want in?</p>
        <p className="mt-1 text-sm text-ink-300">
          Open an issue on the project — tell us your venue and your deal line, and we&apos;ll get
          you a gold pin and a sticker.
        </p>
        <Link
          href={GITHUB_ISSUES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex rounded-full bg-gold-400 px-4 py-2 text-sm font-bold text-night-950 transition-colors hover:bg-gold-300"
        >
          Claim your gold pin →
        </Link>
      </div>

      <p className="mt-6 text-xs text-ink-500">
        PissMap NOLA is an independent project, not affiliated with the City of New Orleans. Free
        for users, forever.
      </p>
    </PageShell>
  );
}
