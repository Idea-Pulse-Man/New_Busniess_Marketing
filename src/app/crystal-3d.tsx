"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const GOLD = 0xe8b23a;
const TEAL = 0x2dd4bf;

// Gold-framed glass crystal on a glowing pedestal: a real WebGL model of the brand mark.
// Spins slowly on its own; drag (mouse or touch) to turn it.
export function Crystal3D({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.style.touchAction = "pan-y";
    renderer.domElement.style.cursor = "grab";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envMap;
    scene.environmentIntensity = 0.8;

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0.25, 7.4);
    camera.lookAt(0, -0.25, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(3, 5, 4);
    scene.add(key);
    const core = new THREE.PointLight(TEAL, 18, 6);
    scene.add(core);

    // Everything we create, so cleanup can dispose it.
    const disposables: { dispose: () => void }[] = [envMap, pmrem];
    const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

    const goldMat = track(new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.28 }));
    const glassMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xa7f3e6,
        emissive: TEAL,
        emissiveIntensity: 0.3,
        metalness: 0,
        roughness: 0.05,
        transparent: true,
        opacity: 0.24,
        clearcoat: 1,
        side: THREE.DoubleSide,
        depthWrite: false,
        flatShading: true,
      }),
    );

    // Crystal: faceted glass shell + gold rods along every edge + gold nodes at every vertex.
    const crystal = new THREE.Group();
    const RADIUS = 1.35;
    const shellGeo = track(new THREE.IcosahedronGeometry(RADIUS, 1));
    crystal.add(new THREE.Mesh(shellGeo, glassMat));

    const edges = track(new THREE.EdgesGeometry(shellGeo)).getAttribute("position");
    const rodGeo = track(new THREE.CylinderGeometry(0.035, 0.035, 1, 8, 1));
    const nodeGeo = track(new THREE.SphereGeometry(0.06, 12, 8));
    const up = new THREE.Vector3(0, 1, 0);
    const seen = new Set<string>();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    for (let i = 0; i < edges.count; i += 2) {
      a.fromBufferAttribute(edges, i);
      b.fromBufferAttribute(edges, i + 1);
      const rod = new THREE.Mesh(rodGeo, goldMat);
      rod.position.copy(a).add(b).multiplyScalar(0.5);
      rod.scale.y = a.distanceTo(b);
      rod.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
      crystal.add(rod);
      for (const v of [a, b]) {
        const k = v.toArray().map((n) => n.toFixed(3)).join();
        if (seen.has(k)) continue;
        seen.add(k);
        const node = new THREE.Mesh(nodeGeo, goldMat);
        node.position.copy(v);
        crystal.add(node);
      }
    }

    // Glowing heart inside the glass.
    const glowMat = track(
      new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    const glowGeo = track(new THREE.SphereGeometry(0.75, 24, 16));
    crystal.add(new THREE.Mesh(glowGeo, glowMat));

    // Pedestal: gold slab over a glowing teal band.
    const pedestal = new THREE.Group();
    const slabGeo = track(new THREE.BoxGeometry(2.2, 0.18, 2.2));
    const slab = new THREE.Mesh(slabGeo, goldMat);
    slab.position.y = -1.7;
    const bandMat = track(new THREE.MeshBasicMaterial({ color: 0x5eead4, toneMapped: false }));
    const bandGeo = track(new THREE.BoxGeometry(2.26, 0.1, 2.26));
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.y = -1.84;
    const baseGeo = track(new THREE.BoxGeometry(2.2, 0.1, 2.2));
    const base = new THREE.Mesh(baseGeo, goldMat);
    base.position.y = -1.94;
    pedestal.add(slab, band, base);
    const underGlow = new THREE.PointLight(TEAL, 6, 3);
    underGlow.position.y = -1.6;
    pedestal.add(underGlow);

    const model = new THREE.Group();
    model.add(crystal, pedestal);
    model.rotation.x = 0.12;
    scene.add(model);

    // Drag to rotate; the spin eases back to the idle speed after release.
    const IDLE_SPEED = reduceMotion ? 0 : 0.25;
    let spin = IDLE_SPEED;
    let tiltTarget = 0.12;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const el = renderer.domElement;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      model.rotation.y += dx * 0.01;
      spin = dx * 0.6;
      tiltTarget = THREE.MathUtils.clamp(tiltTarget + dy * 0.005, -0.35, 0.5);
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      el.style.cursor = "grab";
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    // Only animate while the hero is on screen.
    let visible = true;
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(mount);

    const clock = new THREE.Clock();
    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!visible) return;
      const t = clock.elapsedTime;
      if (!dragging) {
        spin += (IDLE_SPEED - spin) * Math.min(dt * 2, 1);
        model.rotation.y += spin * dt;
      }
      model.rotation.x += (tiltTarget - model.rotation.x) * Math.min(dt * 6, 1);
      if (!reduceMotion) {
        crystal.position.y = Math.sin(t * 1.2) * 0.08;
        crystal.rotation.x = Math.sin(t * 0.5) * 0.08;
        const pulse = 0.5 + 0.5 * Math.sin(t * 2);
        glowMat.opacity = 0.25 + pulse * 0.2;
        core.intensity = 14 + pulse * 8;
      }
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      el.remove();
    };
  }, []);

  return (
    <div className={`crystal-3d ${className}`} role="img" aria-label="Rotating 3D crystal">
      <div className="crystal-3d__glow" />
      <div ref={mountRef} className="crystal-3d__canvas" />
    </div>
  );
}
