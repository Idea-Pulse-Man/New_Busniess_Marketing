/* eslint-disable @next/next/no-img-element -- pre-sized WebP files in /public, no optimizer round-trip needed */
import { site } from "@/lib/site";

// Square brand mark (cropped logo). `size` is the rendered size in px; the 2x file covers retina.
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo-64.webp"
      srcSet="/logo-64.webp 1x, /logo-128.webp 2x"
      width={size}
      height={size}
      alt={site.name}
      decoding="async"
      className={`shrink-0 rounded-lg object-cover shadow-sm ring-1 ring-black/10 ${className}`}
    />
  );
}
