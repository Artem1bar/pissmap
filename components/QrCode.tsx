"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Generates an SVG QR code for `value` in the browser (empty until ready). */
export function useQrSvg(value: string): string {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let active = true;
    QRCode.toString(value, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#0b0c0f", light: "#ffffff" },
    })
      .then((result) => {
        if (active) setSvg(result);
      })
      .catch(() => {
        if (active) setSvg("");
      });
    return () => {
      active = false;
    };
  }, [value]);

  return svg;
}
