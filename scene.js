// The 3D layer of Isma Plugins, direction C, "nuit et jour": one landscape across the whole width.
// Left, Khanjar's night: stars, a crescent moon, black volcanic ridges with lava in the cracks, the dagger planted in a stone.
// Right, Isma Organizer's day: the blue sky, the sun and its flare, the clouds, glossy green hills, soap bubbles.
// They meet in a dusk band that follows the mouse: hover a side and its time of day spreads over the screen.
// On a phone the night is the Khanjar section, the day the Organizer section, and the dusk sits on the border between them.
import * as THREE from 'three';
import { makeSky } from './world/sky.js';
import { makeTerrain, CAM_Z } from './world/terrain.js';
import { makeProps, fireEnv } from './world/props.js';
import { makeEmbers, makeBubbles } from './world/particles.js';
import { makeFlare, makeDuskBand } from './world/flare.js';

const stage = document.getElementById('stage');
const canvas = document.getElementById('gl');
const khSide = document.querySelector('.side-kh'), khBlock = khSide.querySelector('.block');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const q = new URLSearchParams(location.search);
const hold = q.has('seam') && isFinite(+q.get('seam')) ? Math.min(.8, Math.max(.2, +q.get('seam'))) : null;   // ?seam=.36 holds the seam, to review a state
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const spring = (s, goal, dt, w) => { const a = w * w * (goal - s.x) - 2 * w * s.v; s.v += a * dt; s.x += s.v * dt; };

// ---- the seam, eased like a spring; the CSS reads it too (the content blocks, and the fallback worlds) ----
const SPAN = .14;                                              // hovering a side widens it to 64%
const seam = { x: hold ?? .5, v: 0 }, heat = { x: 0, v: 0, goal: 0 }, shine = { x: 0, v: 0, goal: 0 };
const ptr = { x: .5, y: .5, in: false };
let focusSide = 0;                                             // -1 / 1 while the keyboard is on Khanjar's / Organizer's links
function seamGoal() {
  if (hold !== null) return hold;
  if (innerWidth <= 760 || reduce) return .5;
  if (focusSide) return .5 - SPAN * focusSide;
  if (!ptr.in) return .5;
  const u = (ptr.x - .5) / .5;
  return .5 - SPAN * Math.sign(u) * sstep(.04, .5, Math.abs(u));
}
let lastK = '';
function writeCSS() {
  const k = ((seam.x - .5) / SPAN).toFixed(3);
  if (k === lastK) return;
  lastK = k;
  stage.style.setProperty('--k', k);
  const flat = (50 + +k * 5).toFixed(2) + '%';                  // the CSS worlds (fallback): a straight seam, a smaller swing
  stage.style.setProperty('--st', flat);
  stage.style.setProperty('--sb', flat);
}
let wake = () => {};
addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  ptr.x = e.clientX / innerWidth; ptr.y = e.clientY / innerHeight; ptr.in = true; if (!reduce) wake();
}, { passive: true });
document.documentElement.addEventListener('mouseleave', () => { ptr.in = false; if (!reduce) wake(); });
addEventListener('blur', () => { ptr.in = false; if (!reduce) wake(); });
const bind = (sel, s) => document.querySelectorAll(sel).forEach(a => {
  const on = () => { s.goal = 1; if (!reduce) wake(); }, off = () => { s.goal = 0; if (!reduce) wake(); };
  a.addEventListener('pointerenter', on); a.addEventListener('pointerleave', off);
  a.addEventListener('focus', on); a.addEventListener('blur', off);
});
bind('.side-kh .ctas a', heat);                                 // reaching for Khanjar: the lava wakes, the dagger rises
bind('.side-org .ctas a', shine);                               // reaching for Isma Organizer: the sun shines brighter
[['.side-kh', -1], ['.side-org', 1]].forEach(([sel, side]) => {   // the keyboard widens a world the way the mouse does
  const el = document.querySelector(sel);
  el.addEventListener('focusin', () => { focusSide = side; if (!reduce) wake(); });
  el.addEventListener('focusout', () => { focusSide = 0; if (!reduce) wake(); });
});

// ---- no WebGL: the CSS worlds stay, and their seam still follows the mouse ----
function cssOnly() {
  canvas.remove();
  if (reduce) return;
  let raf = 0, last = 0;
  const step = now => {
    const dt = Math.min((now - last) / 1000 || 0, 1 / 30); last = now;
    spring(seam, seamGoal(), dt, 4.2); writeCSS();
    raf = Math.abs(seam.v) > 1e-4 || Math.abs(seamGoal() - seam.x) > 1e-4 ? requestAnimationFrame(step) : 0;
  };
  wake = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } };
}

function start() {
  let renderer;
  const ctx = canvas.getContext('webgl2', { alpha: false, antialias: true, depth: true, stencil: false, powerPreference: 'high-performance' });
  if (!ctx) return false;                                        // no WebGL 2: the CSS worlds stay
  try { renderer = new THREE.WebGLRenderer({ canvas, context: ctx, antialias: true }); }
  catch (e) { return false; }
  renderer.setClearColor(0x0b0b0c, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  let dead = false;
  renderer.debug.onShaderError = () => { dead = true; stage.classList.remove('gl'); };   // a shader that fails: the CSS worlds come back

  const phoneAtStart = innerWidth <= 760;
  let still = reduce && phoneAtStart;                            // reduced motion on a phone: one still page, drawn once
  const scene = new THREE.Scene();
  scene.environment = fireEnv(THREE, renderer);
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 400);
  camera.rotation.order = 'YXZ';

  const shared = {
    uRes: { value: new THREE.Vector2(1, 1) }, uSeam: { value: new THREE.Vector4(.5, .5, .12, .07) },
    uMode: { value: 0 }, uTime: { value: 0 },
  };
  const sky = makeSky(THREE, shared);
  const ground = makeTerrain(THREE, shared, phoneAtStart ? { cols: 220, rows: 140 } : { cols: 360, rows: 200 });
  const props = makeProps(THREE);
  const embers = makeEmbers(THREE, shared, phoneAtStart ? 70 : 150, props.top);
  const BUB = 5, bubbles = makeBubbles(THREE, shared, BUB);
  const flare = makeFlare(THREE, shared), dusk = makeDuskBand(THREE, shared);
  scene.add(ground.mesh, sky.mesh, props.group, embers.points, bubbles.mesh, flare.mesh, dusk.mesh);
  ground.uniforms.uMoonDir.value.set(-.55, .62, .4).normalize();   // the moon's light on the facets, from the upper left
  sky.uniforms.uInvProj.value = camera.projectionMatrixInverse;
  sky.uniforms.uCamWorld.value = camera.matrixWorld;

  // ---- framing. Desktop: one camera on the whole landscape. Phone: a camera near the stone that turns,
  //      as you scroll, from the dagger (night) to the sun (day). Sky directions are chosen on screen, per layout. ----
  const deg = THREE.MathUtils.degToRad;
  const pitchFor = (vfov, horizonY) => Math.atan((horizonY - .5) * 2 * Math.tan(deg(vfov / 2)));
  const dirAt = (cam, fx, fy) => new THREE.Vector3(fx * 2 - 1, 1 - fy * 2, .5).unproject(cam).sub(cam.position).normalize();
  const azel = v => [Math.atan2(v.x, -v.z), Math.asin(v.y)];
  const tmpCam = new THREE.PerspectiveCamera(32, 1, .1, 400), tmpCam2 = tmpCam.clone(); tmpCam.rotation.order = tmpCam2.rotation.order = 'YXZ';
  const aim = (cam, fov, aspect, pos, yaw, pitch) => {
    cam.fov = fov; cam.aspect = aspect; cam.position.copy(pos); cam.rotation.set(pitch, yaw, 0);
    cam.updateProjectionMatrix(); cam.updateMatrixWorld(true); return cam;
  };
  const DESK = { pos: new THREE.Vector3(0, 2, CAM_Z), horizon: .62 };
  const PH = { pos: new THREE.Vector3(props.top.x + 2.3, 2.6, props.top.z + 12.8), fov: 50 };
  PH.yawN = Math.atan2(-(props.top.x - PH.pos.x), -(props.top.z - PH.pos.z)) - .015;
  PH.yawD = PH.yawN - .56;
  PH.pitchN = deg(3.2); PH.pitchD = deg(12.5);
  // the dagger's top (pommel) and the stone's foot, to keep them clear of the Khanjar words
  const pommel = new THREE.Vector3(), foot = props.top.clone().add(new THREE.Vector3(0, -.55, 0));
  { const box = new THREE.Box3().setFromObject(props.holder); pommel.set(props.top.x, box.max.y, props.top.z); }
  const pv2 = new THREE.Vector3();
  const screenY = (cam, v) => (1 - pv2.copy(v).project(cam).y) / 2;
  // look a little lower (the scene rises) until the stone clears the block; if the pommel runs out of room, widen the view
  function fit(cam, aspect, pos, yaw, pitch, fov0, horizonY, blockTop, minTop) {
    let f = fov0, p = horizonY == null ? pitch : pitchFor(f, horizonY);
    for (let i = 0; i < 16; i++) {
      aim(cam, f, aspect, pos, yaw, p);
      const over = screenY(cam, foot) - (blockTop - .02);
      if (over <= .003) break;
      if (screenY(cam, pommel) - over < minTop && f < fov0 + 16) { f += 2; if (horizonY != null) p = pitchFor(f, horizonY); continue; }
      p -= Math.atan(over * 2 * Math.tan(deg(f / 2)));
    }
    return [f, p];
  }

  let W = 1, H = 1, dpr = 1, quality = 1, phone = phoneAtStart, basePitch = 0, fov = 32;
  const bubbleBase = [];                                        // [position, radius, bob amplitude] per bubble
  const sunDir = new THREE.Vector3(), moonDir = new THREE.Vector3();
  let khRect = [0, 0, 0, 0], khBottom = 0, stageY = 0;

  function layoutSky(dayCam, nightCam, sun, moon, clouds, bubs, moonR, viewH = H) {
    sunDir.copy(dirAt(dayCam, ...sun));
    const [saz, sel] = azel(sunDir); sky.uniforms.uSun.value.set(saz, sel, 0);
    moonDir.copy(dirAt(nightCam, ...moon));
    const [maz, mel] = azel(moonDir); sky.uniforms.uMoon.value.set(maz, mel, moonR);
    const hfov = 2 * Math.atan(Math.tan(deg(dayCam.fov / 2)) * dayCam.aspect);
    clouds.forEach((c, i) => { const [az, el] = azel(dirAt(dayCam, c[0], c[1])); sky.uniforms.uClouds.value[i].set(az, el, c[2] * hfov, c[3]); });
    const pxPerRad = (viewH / 2) / Math.tan(deg(dayCam.fov / 2));
    bubbleBase.length = 0;
    bubs.forEach(([fx, fy, dpx, depth]) => {
      const p = dayCam.position.clone().add(dirAt(dayCam, fx, fy).multiplyScalar(depth));
      const unit = pxPerRad / depth;                            // CSS px per world unit at that depth
      bubbleBase.push([p, dpx / 2 / unit * (W / (phone ? 390 : 1440)), 22 / unit]);
    });
    ground.uniforms.uSunDir.value.copy(sunDir).setY(Math.max(sunDir.y, .35)).normalize();
    bubbles.uniforms.uSunDir.value.copy(sunDir);
  }

  function resize() {
    phone = innerWidth <= 760;
    still = reduce && phone;
    stage.classList.toggle('still', still);                     // before measuring: it decides where the canvas sits
    W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight;
    dpr = Math.min(devicePixelRatio || 1, phone ? 1.5 : 2) * quality;
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    const buf = renderer.getDrawingBufferSize(new THREE.Vector2());
    shared.uRes.value.copy(buf);
    shared.uSeam.value.set(.5, .5, .12, .095);
    ground.uniforms.uVp.value.set(0, 0, buf.x, buf.y);
    embers.uniforms.uDpr.value = dpr;
    shared.uMode.value = phone ? 1 : 0;
    const aspect = W / H;
    if (!phone) {
      fov = aspect >= 1.6 ? 32 : Math.min(52, 2 * THREE.MathUtils.radToDeg(Math.atan(Math.tan(deg(25.6)) / aspect)));
      const bt = (khBlock.getBoundingClientRect().top - stage.getBoundingClientRect().top) / H;
      [fov, basePitch] = fit(tmpCam, aspect, DESK.pos, 0, 0, fov, DESK.horizon, bt, .05);
      const c = aim(tmpCam, fov, aspect, DESK.pos, 0, basePitch);
      layoutSky(c, c, [.86, .15], [.105, .17],
        [[.84, .31, .25, 0], [.655, .44, .15, 1], [.71, .1, .085, 2], [.5, .29, .12, 1]],
        [[.895, .25, 116, 11], [.665, .14, 50, 13], [.775, .45, 30, 9], [.548, .38, 62, 12], [.975, .56, 42, 10]], .0155);
      sky.uniforms.uSkyTop.value = basePitch + deg(fov / 2); sky.uniforms.uHorizon.value = deg(1.2);
    } else {
      const st0 = stage.getBoundingClientRect().top, kb = khSide.getBoundingClientRect().bottom - st0;
      const hN = still ? kb : H, hD = still ? H - kb : H;           // the heights the night and the day are drawn in
      const bt = (khBlock.getBoundingClientRect().top - st0) / hN;
      [fov, PH.pitch] = fit(tmpCam2, W / hN, PH.pos, PH.yawN, PH.pitchN, PH.fov, null, bt, .15);
      const n = aim(tmpCam2, fov, W / hN, PH.pos, PH.yawN, PH.pitch);
      const d = aim(tmpCam, fov, W / hD, PH.pos, PH.yawD, PH.pitchD);
      layoutSky(d, n, [.8, .14], [.2, .25],
        [[.6, .3, .62, 0], [.18, .1, .34, 2], [-.1, .2, .5, 1], [1.2, .4, .5, 1]],
        [[.84, .33, 96, 7], [.15, .38, 44, 8], [.6, .21, 26, 7], [.36, .06, 34, 9], [.95, .09, 30, 8]], .028, hD);
      sky.uniforms.uSkyTop.value = PH.pitchD + deg(fov / 2) - deg(4); sky.uniforms.uHorizon.value = deg(2);
    }
    ground.uniforms.uSkyTop.value = sky.uniforms.uSkyTop.value; ground.uniforms.uHorizon.value = sky.uniforms.uHorizon.value;
    sky.uniforms.uPx.value = ((still ? H / 2 : H) / 2) / Math.tan(deg(fov / 2));
    flare.uniforms.uView.value.set(0, 0, buf.x, buf.y);
    dusk.mesh.visible = still;
    dusk.uniforms.uBandPx.value = 70 * dpr;
    const r = khBlock.getBoundingClientRect(), s = stage.getBoundingClientRect();
    khRect = [r.left, r.top - s.top, r.right, r.bottom - s.top];
    khBottom = khSide.getBoundingClientRect().bottom - s.top;
    stageY = s.top + scrollY;
    still ? drawStill() : draw();
  }

  // ---- one frame ----
  const par = { x: 0, y: 0 }, m = new THREE.Matrix4(), qI = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
  let t = 0, camP = { x: 0, v: 0 };
  function update(dt) {
    t += dt;
    shared.uTime.value = t;
    spring(seam, seamGoal(), dt, 4.2); writeCSS();
    heat.x += (heat.goal - heat.x) * (1 - Math.exp(-dt * 4)); shine.x += (shine.goal - shine.x) * (1 - Math.exp(-dt * 4));
    const U = shared.uSeam.value;
    const stageTop = stageY - scrollY;
    if (!phone) {
      U.set(seam.x, .5 + (seam.x - .5) * .3, .12, .095);
      const gx = ptr.in && !reduce ? (ptr.x - .5) * 2 : 0, gy = ptr.in && !reduce ? (ptr.y - .5) * 2 : 0;
      par.x += (gx - par.x) * (1 - Math.exp(-dt * 2.5)); par.y += (gy - par.y) * (1 - Math.exp(-dt * 2.5));
      aim(camera, fov, W / H, sv.set(DESK.pos.x + par.x * .35, DESK.pos.y - par.y * .08, DESK.pos.z), -par.x * .018, basePitch - par.y * .01);
    } else {
      const b = (khBottom + stageTop) / H + (reduce ? 0 : Math.sin(t * .4) * .012);
      U.set(b, 0, .1, 0);
      // the camera's path as the border rises (k: 0 at the top of the page, 1 when the day fills the screen): it turns
      // towards the sun, first dipping so the dagger rises with the words as it slides away, then lifting to the sky
      spring(camP, Math.min(1, Math.max(0, 1 - (khBottom + stageTop) / H)), dt, 7);
      const k = Math.min(1, Math.max(0, camP.x)), sway = Math.sin(t * .23) * .012;
      const yaw = PH.yawN + (PH.yawD - PH.yawN) * sstep(0, .6, k) + sway;
      const pitch = PH.pitch + (PH.pitchD - PH.pitch) * sstep(.3, .85, k) - deg(11) * Math.sin(Math.PI * Math.min(k / .5, 1));
      aim(camera, fov, W / H, PH.pos, yaw, pitch);
    }
    // the Khanjar block keeps the lava calm behind its words (device px, origin bottom-left)
    const top = khRect[1] + stageTop, bot = khRect[3] + stageTop;
    ground.uniforms.uScrim.value.set(khRect[0] * dpr, (H - bot) * dpr, khRect[2] * dpr, (H - top) * dpr);
    ground.uniforms.uCam.value.copy(camera.position);
    ground.uniforms.uHeat.value = embers.uniforms.uHeat.value = heat.x;
    ground.uniforms.uShine.value = sky.uniforms.uShine.value = flare.uniforms.uShine.value = shine.x;
    props.place(heat.x * .3);
    props.lava.intensity = props.base.lava * (1 + heat.x * .9); props.lava2.intensity = props.base.lava2 * (1 + heat.x * .9);
    props.slot.material.color.setRGB(2.2, .78, .3).multiplyScalar(1 + heat.x * .8);
    // the bubbles bob; the sun's flare follows the sun on screen
    bubbleBase.forEach(([p, r, amp], i) => {
      const w = t * (6.2832 / (10 + i * 1.3)) + i * 2.1;
      pv.set(p.x + Math.sin(w * .5) * amp * .3, p.y + (Math.sin(w) * .5 + .5) * amp, p.z);
      m.compose(pv, qI, sv.setScalar(r)); bubbles.mesh.setMatrixAt(i, m);
    });
    for (let i = bubbleBase.length; i < BUB; i++) { m.makeScale(0, 0, 0); bubbles.mesh.setMatrixAt(i, m); }
    bubbles.mesh.instanceMatrix.needsUpdate = true;
    pv.copy(camera.position).addScaledVector(sunDir, 200).project(camera);
    const vis = pv.z < 1 ? sstep(1.6, 1.05, Math.max(Math.abs(pv.x), Math.abs(pv.y))) : 0;
    flare.uniforms.uSunPx.value.set((pv.x * .5 + .5) * shared.uRes.value.x, (pv.y * .5 + .5) * shared.uRes.value.y, vis);
  }
  function draw() { update(0); renderer.render(scene, camera); }
  // the still page: the night in the Khanjar section (top), the day in the Organizer section (bottom), the dusk between
  function drawStill() {
    update(0);
    const kb = khBottom, hD = H - kb;
    shared.uSeam.value.set(kb / H, 0, .045, 0);
    renderer.setScissorTest(true);
    for (const [y, h, yaw, pitch] of [[hD, kb, PH.yawN, PH.pitch], [0, hD, PH.yawD, PH.pitchD]]) {
      renderer.setViewport(0, y, W, h); renderer.setScissor(0, y, W, h);
      ground.uniforms.uVp.value.set(0, y * dpr, W * dpr, h * dpr);
      flare.uniforms.uView.value.set(0, y * dpr, W * dpr, h * dpr);
      aim(camera, fov, W / h, PH.pos, yaw, pitch);
      ground.uniforms.uCam.value.copy(camera.position);
      pv.copy(camera.position).addScaledVector(sunDir, 200).project(camera);
      flare.uniforms.uSunPx.value.set((pv.x * .5 + .5) * W * dpr, (y + (pv.y * .5 + .5) * h) * dpr, pv.z < 1 ? 1 : 0);
      const top = khRect[1], bot = khRect[3];
      ground.uniforms.uScrim.value.set(khRect[0] * dpr, (H - bot) * dpr, khRect[2] * dpr, (H - top) * dpr);
      renderer.render(scene, camera);
    }
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, W, H);
  }

  // ---- the loop: only while the page is seen; reduced motion draws still frames ----
  let raf = 0, last = 0, onScreen = true, slow = 0;
  const loop = now => {
    raf = 0;
    if (dead || document.hidden || !onScreen) return;
    const dt = Math.min((now - last) / 1000, 1 / 20); last = now;
    if (dt > .026) { if (++slow > 50 && quality > .55) { quality -= .2; slow = 0; resize(); } } else slow = Math.max(0, slow - 2);
    update(dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  wake = () => {
    if (dead) return;
    if (reduce) { requestAnimationFrame(still ? drawStill : draw); return; }
    if (!raf && !document.hidden && onScreen) { last = performance.now(); raf = requestAnimationFrame(loop); }
  };
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; wake(); }).observe(stage);
  document.addEventListener('visibilitychange', wake);
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 60); });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); stage.classList.remove('gl'); cancelAnimationFrame(raf); raf = 0; onScreen = false; });

  stage.classList.add('gl');                                   // first: on a phone this makes the canvas fixed, then measure
  resize();
  wake();
  return true;
}

if (!start()) cssOnly();
