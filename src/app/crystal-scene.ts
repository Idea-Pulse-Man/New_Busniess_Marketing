import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const GOLD = 0xe8b23a;

// Gold-framed glass crystal: a real WebGL model of the brand mark.
// Spins slowly on its own; drag (mouse or touch) to turn it. Loaded on demand by Crystal3D so
// three.js stays out of the page's initial bundle. Calls `onReady` after the first frame and
// returns a cleanup function.
export function mountCrystal(mount: HTMLElement, onReady: () => void) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  // 1.5x is visually indistinguishable here and renders ~45% fewer pixels than 2x on retina.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.style.touchAction = "pan-y";
  renderer.domElement.style.cursor = "grab";
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envMap = pmrem.fromScene(room, 0.04).texture;
  room.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  pmrem.dispose();
  scene.environment = envMap;
  scene.environmentIntensity = 0.8;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.25, 7.4);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 5, 4);
  scene.add(key);

  // Everything we create, so cleanup can dispose it.
  const disposables: { dispose: () => void }[] = [envMap];
  const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

  const goldMat = track(new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.28 }));
  const glassMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.05,
      transparent: true,
      opacity: 0.12,
      clearcoat: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
      flatShading: true,
    }),
  );

  // Crystal: faceted glass shell + gold rods along every edge + gold nodes at every vertex.
  // Rods and nodes are instanced: one draw call each instead of one per piece (~160).
  const crystal = new THREE.Group();
  const shellGeo = track(new THREE.IcosahedronGeometry(1.35, 1));
  crystal.add(new THREE.Mesh(shellGeo, glassMat));

  const edgesGeo = new THREE.EdgesGeometry(shellGeo);
  const edges = edgesGeo.getAttribute("position");
  const rodCount = edges.count / 2;
  const rods = new THREE.InstancedMesh(track(new THREE.CylinderGeometry(0.035, 0.035, 1, 8, 1)), goldMat, rodCount);
  const up = new THREE.Vector3(0, 1, 0);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const nodes = new Map<string, THREE.Vector3>();
  for (let i = 0; i < rodCount; i++) {
    a.fromBufferAttribute(edges, i * 2);
    b.fromBufferAttribute(edges, i * 2 + 1);
    q.setFromUnitVectors(up, dir.subVectors(b, a).normalize());
    s.set(1, a.distanceTo(b), 1);
    rods.setMatrixAt(i, m.compose(a.clone().add(b).multiplyScalar(0.5), q, s));
    for (const v of [a, b]) nodes.set(v.toArray().map((n) => n.toFixed(3)).join(), v.clone());
  }
  edgesGeo.dispose();
  const nodeMesh = new THREE.InstancedMesh(track(new THREE.SphereGeometry(0.06, 12, 8)), goldMat, nodes.size);
  [...nodes.values()].forEach((v, i) => nodeMesh.setMatrixAt(i, m.makeTranslation(v)));
  crystal.add(rods, nodeMesh);

  const model = new THREE.Group();
  model.add(crystal);
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
  let first = true;
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
    }
    renderer.render(scene, camera);
    if (first) {
      first = false;
      onReady();
    }
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
    rods.dispose();
    nodeMesh.dispose();
    disposables.forEach((d) => d.dispose());
    renderer.dispose();
    el.remove();
  };
}
