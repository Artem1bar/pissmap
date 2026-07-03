import { DropletLogo } from "@/components/icons";

interface StickerProps {
  /** Pre-generated QR SVG markup (generate once, reuse across a sheet). */
  qrSvg: string;
  subtitle: string;
  /** Physical edge length in inches. */
  sizeIn: number;
}

/**
 * A square, print-ready PissMap sticker. Everything sizes in container-query
 * units (cqw), so the single component renders crisply at any physical size —
 * a 3" hero or a 2.4" cell in a cut-out sheet.
 */
export function Sticker({ qrSvg, subtitle, sizeIn }: StickerProps) {
  return (
    <div
      className="flex flex-col items-center justify-between overflow-hidden bg-night-950 text-center text-ink-100"
      style={{
        width: `${sizeIn}in`,
        height: `${sizeIn}in`,
        containerType: "size",
        padding: "7cqw",
        borderRadius: "9%",
        border: "0.9cqw solid #b8922e",
      }}
    >
      <div className="flex items-center" style={{ gap: "2cqw" }}>
        <span style={{ width: "10cqw", height: "10cqw" }}>
          <DropletLogo className="h-full w-full text-gold-400" />
        </span>
        <span className="font-display font-black italic" style={{ fontSize: "7cqw" }}>
          PissMap <span className="text-gold-400">NOLA</span>
        </span>
      </div>

      <p
        className="font-display font-bold leading-[1.05] text-gold-300"
        style={{ fontSize: "10.5cqw" }}
      >
        When you
        <br />
        gotta geaux <span aria-hidden="true">⚜</span>
      </p>

      <div style={{ background: "#ffffff", padding: "3.5cqw", borderRadius: "5%" }}>
        <div
          className="[&_svg]:block [&_svg]:h-full [&_svg]:w-full"
          style={{ width: "38cqw", height: "38cqw" }}
          aria-label="QR code linking to this spot on PissMap"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      </div>

      <p className="text-ink-300" style={{ fontSize: "4.6cqw" }}>
        {subtitle}
      </p>
    </div>
  );
}
