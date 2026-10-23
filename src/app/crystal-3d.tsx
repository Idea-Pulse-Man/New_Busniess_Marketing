"use client";

import { useEffect, useRef, useState } from "react";

// Hero crystal. The glow shows immediately; the WebGL scene (three.js, ~125 kB) is fetched only
// once the browser is idle after load, so it never delays the text, buttons or form.
export function Crystal3D({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const start = () =>
      import("./crystal-scene").then(({ mountCrystal }) => {
        if (!cancelled) cleanup = mountCrystal(mount, () => setReady(true));
      });
    // Safari has no requestIdleCallback; a short timeout does the same job there.
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 1500 })
      : window.setTimeout(start, 200);

    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      cleanup?.();
    };
  }, []);

  return (
    <div className={`crystal-3d ${className}`} role="img" aria-label="Rotating 3D crystal">
      <div className="crystal-3d__glow" />
      <div ref={mountRef} className={`crystal-3d__canvas ${ready ? "is-ready" : ""}`} />
    </div>
  );
}
