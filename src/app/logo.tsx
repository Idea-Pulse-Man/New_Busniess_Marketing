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

// Full logo artwork floating in 3D (CSS only) for the landing page hero.
export function Logo3D({ className = "" }: { className?: string }) {
  return (
    <div className={`logo-3d ${className}`}>
      <div className="logo-3d__glow" />
      <img
        src="/logo-420.webp"
        srcSet="/logo-420.webp 420w, /logo-840.webp 840w"
        sizes="(min-width: 1024px) 420px, 240px"
        width={420}
        height={420}
        alt={`${site.name} logo`}
        fetchPriority="high"
        decoding="async"
        className="logo-3d__img"
      />
    </div>
  );
}
