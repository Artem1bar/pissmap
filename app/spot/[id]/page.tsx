import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import { CATEGORY_META } from "@/lib/categories";
import { placeJsonLd } from "@/lib/jsonld";
import { spotPath, spotUrl } from "@/lib/site";
import { getSpotById, SPOTS } from "@/lib/spots";

// One shareable, statically-generated page per curated spot. Unknown ids 404
// (dynamicParams = false) rather than rendering an empty shell.
export const dynamicParams = false;

export function generateStaticParams() {
  return SPOTS.map((spot) => ({ id: spot.id }));
}

function describe(id: string): string | null {
  const spot = getSpotById(id);
  if (!spot) return null;
  return `${CATEGORY_META[spot.category].label} in ${spot.neighborhood}. ${spot.tip}`.slice(0, 200);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const spot = getSpotById(id);
  if (!spot) return {};
  const description = describe(id) ?? undefined;
  return {
    title: spot.name,
    description,
    alternates: { canonical: spotPath(id) },
    openGraph: {
      title: `${spot.name} · PissMap NOLA`,
      description,
      url: spotPath(id),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${spot.name} · PissMap NOLA`,
      description,
    },
  };
}

export default async function SpotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const spot = getSpotById(id);
  if (!spot) notFound();
  // schema.org Place data, baked into the static HTML for rich search results.
  const jsonLd = placeJsonLd(spot, spotUrl(spot.id));
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AppShell initialSpotId={id} />
    </>
  );
}
