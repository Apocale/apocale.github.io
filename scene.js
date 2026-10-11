// The 3D layer of Isma Plugins (base version): the Khanjar dagger floats in the upper half of its side.
// Each direction (worktrees A, B, C) rewrites this file to draw its own meeting of the two worlds.
import * as THREE from 'three';
import { makeDagger, studioEnv } from './shared/dagger.js';

const canvas = document.getElementById('gl');
const stage = document.getElementById('stage');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
catch (e) { canvas.remove(); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.environment = studioEnv(THREE, renderer);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
camera.position.set(0, 0, 9);
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 4, 6); scene.add(key);
const rim = new THREE.PointLight(0xff4d2e, 60, 20, 1.6); rim.position.set(-3, 1.5, -2.5); scene.add(rim);
const rim2 = new THREE.PointLight(0xbfd2ff, 25, 20, 1.6); rim2.position.set(4, -2, -1); scene.add(rim2);

const { pivot } = makeDagger(THREE);
scene.add(pivot);

// a point on screen (px in the stage) to the plane z = 0
const VH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
let W = 1, H = 1, phone = false;
function toWorld(px, py) { const vw = VH * W / H; return new THREE.Vector3((px / W - .5) * vw, (.5 - py / H) * VH, 0); }
function resize() {
  W = stage.clientWidth; H = stage.clientHeight; phone = W <= 760;
  renderer.setSize(W, H, false);
  camera.aspect = W / H; camera.updateProjectionMatrix();
  // the dagger: in the upper part of Khanjar's half on a computer, of its screen on a phone
  const at = phone ? toWorld(W * .5, H * .15) : toWorld(W * .25, H * .27);
  pivot.position.copy(at);
  const px = phone ? W * .58 : W * .22;                // the dagger's length on screen
  pivot.scale.setScalar(px / W * (VH * W / H) / 4.5);
}
resize();
addEventListener('resize', resize);

const ptr = { x: 0, y: 0 }, tilt = { x: 0, y: 0 };
addEventListener('pointermove', e => { ptr.x = e.clientX / innerWidth - .5; ptr.y = e.clientY / innerHeight - .5; }, { passive: true });

let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) requestAnimationFrame(tick); }).observe(stage);
const t0 = performance.now();
function tick(now) {
  if (!visible || document.hidden) return;
  const t = (now - t0) / 1000;
  tilt.x += (ptr.x - tilt.x) * .05; tilt.y += (ptr.y - tilt.y) * .05;
  pivot.rotation.set(-.25 + tilt.y * .3, reduce ? -.35 : Math.sin(t * .4) * .35 - .3 + tilt.x * .5, .38 + (reduce ? 0 : Math.sin(t * .7) * .04));
  renderer.render(scene, camera);
  if (!reduce) requestAnimationFrame(tick);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) requestAnimationFrame(tick); });
requestAnimationFrame(tick);
