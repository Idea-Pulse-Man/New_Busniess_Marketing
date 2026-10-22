"use client";

import { useEffect } from "react";

type PJSInstance = { pJS: { fn: { vendors: { destroypJS: () => void } } } };
type PJSWindow = Window & {
  particlesJS?: (id: string, config: object) => void;
  pJSDom?: PJSInstance[];
};

// animation-line: white pentagon particles drifting and linked by thin lines.
const config = {
  particles: {
    number: { value: 30, density: { enable: true, value_area: 800 } },
    color: { value: "#ffffff" },
    shape: {
      type: "polygon",
      stroke: { width: 0, color: "#000000" },
      polygon: { nb_sides: 5 },
    },
    opacity: { value: 0.5, random: false, anim: { enable: false } },
    size: { value: 3, random: true, anim: { enable: false } },
    line_linked: {
      enable: true,
      distance: 150,
      color: "#ffffff",
      opacity: 0.4,
      width: 1,
    },
    move: {
      enable: true,
      speed: 4,
      direction: "none",
      random: true,
      straight: false,
      out_mode: "out",
      bounce: false,
      attract: { enable: false, rotateX: 600, rotateY: 1200 },
    },
  },
  interactivity: {
    detect_on: "canvas",
    events: {
      onhover: { enable: false, mode: "grab" },
      onclick: { enable: true, mode: "push" },
      resize: true,
    },
    modes: {
      grab: { distance: 400, line_linked: { opacity: 1 } },
      push: { particles_nb: 4 },
    },
  },
  retina_detect: true,
};

const ID = "animation-line";

// Full-width blue gradient section with the particle canvas behind `children`.
export function AnimationLine({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  useEffect(() => {
    const w = window as PJSWindow;
    let cancelled = false;
    // particles.js touches `window` at load time, so import it only in the browser.
    import("particles.js").then(() => {
      if (!cancelled) w.particlesJS?.(ID, config);
    });
    return () => {
      cancelled = true;
      w.pJSDom?.forEach((p) => p.pJS.fn.vendors.destroypJS());
      w.pJSDom = [];
    };
  }, []);

  return (
    <section id={ID} className={className}>
      <div className="animation-line__content">{children}</div>
    </section>
  );
}
