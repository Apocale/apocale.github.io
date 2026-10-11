// The ground, one piece across the whole width. Each vertex knows two heights: the night's (sharp volcanic ridges)
// and the day's (Frutiger Aero's rolling hills). Where it is night on the screen it takes the first, where it is day
// the second, and the dusk in between: when the dusk band moves, the rock softens into hills, and back.
// The curvature of each (crests and folds by day, valleys by night) is measured once, here, for the light:
// the Aero gloss sits on the crests, the lava pools in the valleys.
import { NOISE, TOD, SKY } from './glsl.js';

export const CAM_Z = 16;                         // the desktop camera stands at (0, 2, 16), looking down -z
export const ROCK = { x: -4.7, z: -4 };           // the summit where the dagger is planted

// ---- heights (CPU, once) ----
function makeNoise(seed) {
  const p = new Uint8Array(512), perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  let s = seed >>> 0; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const GX = [1, -1, 1, -1, 1, -1, 0, 0], GY = [1, 1, -1, -1, 0, 0, 1, -1];
  const F2 = .5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  return (x, y) => {
    const t0 = (x + y) * F2, i = Math.floor(x + t0), j = Math.floor(y + t0), t = (i + j) * G2;
    const x0 = x - i + t, y0 = y - j + t, i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n = 0, a, g;
    a = .5 - x0 * x0 - y0 * y0; if (a > 0) { g = p[ii + p[jj]] & 7; a *= a; n += a * a * (GX[g] * x0 + GY[g] * y0); }
    a = .5 - x1 * x1 - y1 * y1; if (a > 0) { g = p[ii + i1 + p[jj + j1]] & 7; a *= a; n += a * a * (GX[g] * x1 + GY[g] * y1); }
    a = .5 - x2 * x2 - y2 * y2; if (a > 0) { g = p[ii + 1 + p[jj + 1]] & 7; a *= a; n += a * a * (GX[g] * x2 + GY[g] * y2); }
    return 70 * n;
  };
}
const nA = makeNoise(7), nB = makeNoise(19), nC = makeNoise(31);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// where a point lies across the view, seen from just behind the desktop camera: < 0 on Khanjar's side, > 0 on Organizer's
const azOf = (x, z) => Math.atan2(x, CAM_Z + 4 - z);
const g2 = (x, z, cx, cz, sx, sz) => { const dx = (x - cx) / sx, dz = (z - cz) / sz; return Math.exp(-(dx * dx + dz * dz)); };

// the land both times of day share: soft rolls, a far range, and the summit where the dagger stands.
// Near the middle of the view the night and the day keep to it, so the dusk changes the light more than the shape.
function baseH(x, z) {
  const fz = (z + 52) / 13;
  return -.25 + .8 * (nC(x * .03, z * .045) * .5 + .5) + 1.2 * g2(x, z, 2, -12, 11, 7) + 1.6 * g2(x, z, -9, -24, 13, 8)
    + 3 * Math.exp(-fz * fz) * (.65 + .35 * nB(x * .035, 7.1)) + 2.5 * g2(x, z, ROCK.x, ROCK.z, 5.06, 4.08);
}

// the day: Frutiger Aero's rolling hills, growing towards the right, layered so their folds show
const HILLS = [   // x, z, height, spread x, spread z
  [1.5, -2, 1.5, 6, 4.5], [5.5, -8, 3.3, 7, 5], [13, -18, 4.2, 9, 6], [9, 1, 1.6, 6, 4],
  [6, -34, 4.4, 12, 7], [22, -30, 5, 12, 8], [38, -22, 4.4, 12, 8], [8, 7.5, .7, 10, 6],
];

// both heights at once: [0] the night (sharp volcanic ridges, growing towards the left), [1] the day
const H2 = [0, 0];
function heights(x, z) {
  const az = azOf(x, z), L = sstep(.02, -.24, az), R = sstep(-.02, .22, az), b = baseH(x, z);
  let h = 0, a = 1, f = .075;
  for (let o = 0; o < 4; o++) { const v = 1 - Math.abs(nA(x * f, z * f * 1.25)); h += a * v * v * v; a *= .42; f *= 2.05; }
  let night = b + (h - .5) * .2 * (1 - L);
  if (L > 0) {
    const far = sstep(11, 42, Math.hypot(x, z - CAM_Z));
    const ridges = (h - .4) * (.35 + 2.4 * far) + 1.8 * far * (nB(x * .02, z * .02) * .5 + .5) - .2;
    night += (ridges - b) * L;
  }
  const dx = (x - ROCK.x) / 6.8, dz = (z - ROCK.z) / 5.4, k = Math.max(0, 1 - Math.sqrt(dx * dx + dz * dz));
  if (k > 0) night = Math.max(night, 2.7 * Math.pow(k, 1.2) + (h - .55) * .45 * k);
  let day = b;
  if (R > 0) {
    let hh = -.25 + .45 * nC(x * .025, z * .035);
    for (let i = 0; i < HILLS.length; i++) { const c = HILLS[i]; hh += c[2] * g2(x, z, c[0], c[1], c[3], c[4]); }
    day = b + (hh - b) * R;
  }
  H2[0] = night; H2[1] = day;
  return H2;
}
export const rocksH = (x, z) => heights(x, z)[0];
export const hillsH = (x, z) => heights(x, z)[1];

// a coarse grid (1.25 units) of both heights, read back bilinearly: the far land comes from it (a unit there is a few
// pixels), and so does the night's curvature at a 2.5-unit scale (where the lava pools)
function coarse() {
  const S = 1.25, x0 = -104, z0 = -112, nx = 168, nz = 108, N = new Float32Array(nx * nz), Dy = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const h = heights(x0 + i * S, z0 + j * S), c = j * nx + i; N[c] = h[0]; Dy[c] = h[1]; }
  const L = new Float32Array(nx * nz);
  for (let j = 2; j < nz - 2; j++) for (let i = 2; i < nx - 2; i++) {
    const c = j * nx + i;
    L[c] = (N[c - 2] + N[c + 2] + N[c - 2 * nx] + N[c + 2 * nx] - 4 * N[c]) / (4 * S * S);
  }
  const read = (A, x, z) => {
    const fx = Math.min(nx - 1.001, Math.max(0, (x - x0) / S)), fz = Math.min(nz - 1.001, Math.max(0, (z - z0) / S));
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, c = j * nx + i;
    return (A[c] * (1 - u) + A[c + 1] * u) * (1 - v) + (A[c + nx] * (1 - u) + A[c + nx + 1] * u) * v;
  };
  return { night: (x, z) => read(N, x, z), day: (x, z) => read(Dy, x, z), lap: (x, z) => read(L, x, z) };
}

// ---- the shaders ----
const vertexShader = /* glsl */`
${TOD}
attribute vec2 aH;
attribute vec4 aNd;
attribute float aLn;
uniform vec4 uVp;
varying vec3 vW, vN;
varying vec2 vH, vL;
void main(){
  vec4 w = modelMatrix * vec4(position.x, (aH.x + aH.y) * .5, position.z, 1.);
  vec4 c = projectionMatrix * viewMatrix * w;
  vec2 fc = uVp.xy + (c.xy / max(c.w, 1e-3) * .5 + .5) * uVp.zw;
  w.y = mix(aH.x, aH.y, smoothstep(.12, .88, dayAt(fc)));
  vW = w.xyz; vN = aNd.xyz; vH = aH; vL = vec2(aNd.w, aLn);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const fragmentShader = /* glsl */`
${NOISE}
${TOD}
${SKY}
uniform vec3 uCam, uSunDir, uMoonDir, uRock;
uniform float uHeat, uShine, uSkyTop, uHorizon;
uniform vec4 uScrim;
varying vec3 vW, vN;
varying vec2 vH, vL;

// distance to the nearest cell border (the lava runs along the borders)
float cracks(vec2 x){
  vec2 n = floor(x), f = fract(x), mg, mr;
  float md = 8.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 g = vec2(i, j), r = g + hash22(n + g) - f;
    float d = dot(r, r);
    if (d < md){ md = d; mr = r; mg = g; }
  }
  md = 8.;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++){
    vec2 g = mg + vec2(i, j), r = g + hash22(n + g) - f;
    if (dot(mr - r, mr - r) > 1e-5) md = min(md, dot(.5 * (mr + r), normalize(r - mr)));
  }
  return md;
}

void main(){
  float d = dayAt(gl_FragCoord.xy);
  vec3 V = normalize(uCam - vW);
  float dist = length(uCam - vW);
  vec3 Nf = normalize(cross(dFdx(vW), dFdy(vW)));
  if (Nf.y < 0.) Nf = -Nf;
  float fwW = length(fwidth(vW.xz));                    // derivatives here, outside the branches below
  vec3 Ns = normalize(vN);
  vec3 N = normalize(mix(Nf, Ns, smoothstep(.25, .8, d)));
  vec2 sq = smoothstep(uScrim.xy - 110., uScrim.xy + 30., gl_FragCoord.xy) * (1. - smoothstep(uScrim.zw - 30., uScrim.zw + 110., gl_FragCoord.xy));
  float scrim = sq.x * sq.y;
  float crest = smoothstep(-.02, -.11, vL.x), fold = smoothstep(.02, .11, vL.x);
  float sil = smoothstep(.22, .02, dot(N, V));

  // ---- night: basalt facets, the moon on their edges, lava pooled in the valleys ----
  vec3 night = vec3(0.);
  if (d < .5){
    vec3 alb = vec3(.013, .012, .014) * (.75 + .5 * vnoise(vW.xz * 1.9));
    vec3 moon = vec3(.32, .38, .58);
    night = alb * (max(dot(Nf, uMoonDir), 0.) * moon * 2.4 + vec3(.01, .009, .013)) * (1. - .35 * scrim);
    night += moon * pow(max(dot(Nf, normalize(uMoonDir + V)), 0.), 40.) * .12;
    float pr = length(vW.xz - uRock.xz);
    float pool = smoothstep(4.2, 1.4, pr);
    float mask = smoothstep(.12, .45, vL.y) * (.35 + .65 * smoothstep(.3, .7, vnoise(vW.xz * .12 + 3.)));
    mask = max(mask, pool * .9) * (1. - .97 * scrim);
    if (mask > .01){
      vec2 cp = vW.xz * .62 + (vec2(vnoise(vW.xz * .6), vnoise(vW.xz * .6 + 9.)) - .5) * .9;
      float edge = cracks(cp), fw = fwW * .37;
      float near = smoothstep(60., 18., dist);
      float flow = .5 + .5 * vnoise(vW.xz * .45 + vec2(uTime * .11, -uTime * .07));
      float lava = mask * (.4 + .8 * flow) * (1. + uHeat * .9);
      float core = 1. - smoothstep(0., .016 + fw, edge);
      float crack = 1. - smoothstep(0., .05 + fw, edge);
      float halo = exp(-edge * 22.);
      night += (vec3(1., .55, .16) * core * 2. * near + vec3(1., .1, .03) * crack * 1.1 * near + vec3(.5, .04, .01) * halo * .3) * lava;
    }
    vec3 toFire = normalize(uRock + vec3(0., -1.4, 1.6) - vW);
    night += alb * vec3(1., .22, .07) * 22. * exp(-pr * .6) * (.3 + .7 * max(dot(Nf, toFire), 0.)) * (1. + uHeat * .8) * (1. - .6 * scrim);
  }

  // ---- day: Aero greens, the sky from above, a white sheen on the crowns, a bright rim along the crest line ----
  vec3 day = vec3(0.), duskc = vec3(0.);
  if (d > .001){
    float up = Ns.y;
    vec3 alb = mix(toLin(vec3(.1, .45, .13)), toLin(vec3(.33, .74, .19)), smoothstep(.55, .92, up));
    alb = mix(alb, toLin(vec3(.74, .93, .38)), crest * smoothstep(.86, .99, up));
    alb *= 1. - .4 * fold;
    // dusk: the land is a dark silhouette, the last light runs along its crests
    duskc = vec3(.008, .007, .01) + alb * .025 + vec3(1., .45, .32) * crest * sil * .5;
    if (d > .5){
      float sl = max(dot(N, uSunDir), 0.);
      day = alb * (toLin(vec3(.66, .84, 1.)) * (.55 + .55 * up) + vec3(1., .95, .82) * sl * .7);
      day += vec3(1.) * crest * (smoothstep(.95, 1., up) * (1. - sil) * .14 + sil * .7) * (1. + .5 * uShine);
      day += toLin(vec3(.85, .95, 1.)) * pow(max(dot(reflect(-V, N), normalize(vec3(.25, .5, -1.))), 0.), 14.) * .14;   // the sky, glossy on the slopes
      day *= mix(vec3(.5, .4, .34), vec3(1.), smoothstep(.55, .97, d));   // late light near the dusk: lower, warmer
    }
  }
  vec3 col = mix(mix(night, duskc, smoothstep(0., .5, d)), day, smoothstep(.5, 1., d));
  col = toSRGB(col / (1. + col * .12));

  // aerial perspective: the far land melts into the sky above it
  float el = asin(clamp(-V.y, -1., 1.));
  vec3 fogC = skyAt(d, clamp((el - uHorizon) / (uSkyTop - uHorizon), 0., 1.));
  float fog = 1. - exp(-pow(max(dist - 14., 0.) * mix(.0135, .0125, d), 1.5));
  fog = max(fog, smoothstep(85., 122., dist));
  gl_FragColor = vec4(mix(col, fogC, clamp(fog, 0., 1.)), 1.);
}`;

export function makeTerrain(THREE, shared, { cols = 360, rows = 200 } = {}) {
  const oz = 20, rMin = 4.5, rMax = 125, aMax = 52 * Math.PI / 180, C = cols + 1;
  const n = C * (rows + 1), G = coarse(), dA = 2 * aMax / cols;
  const pos = new Float32Array(n * 3), hh = new Float32Array(n * 2), nd = new Float32Array(n * 4), ln = new Float32Array(n);
  const rr = new Float64Array(rows + 1);
  for (let j = 0, k = 0; j <= rows; j++) {
    const r = rr[j] = rMin * Math.pow(rMax / rMin, j / rows);
    for (let i = 0; i <= cols; i++, k++) {
      const a = (i / cols * 2 - 1) * aMax, x = Math.sin(a) * r, z = oz - Math.cos(a) * r;
      pos[k * 3] = x; pos[k * 3 + 2] = z;
      if (r < 32) { const h = heights(x, z); hh[k * 2] = h[0]; hh[k * 2 + 1] = h[1]; }
      else { hh[k * 2] = G.night(x, z); hh[k * 2 + 1] = G.day(x, z); }
      ln[k] = G.lap(x, z);
    }
  }
  // the day's normal and curvature, from the neighbours on the grid (polar: around the fan's origin)
  const D = k => hh[k * 2 + 1];
  for (let j = 0, k = 0; j <= rows; j++) {
    const j0 = Math.max(0, j - 1), j1 = Math.min(rows, j + 1), r = rr[j], r0 = rr[j0], r1 = rr[j1];
    for (let i = 0; i <= cols; i++, k++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(cols, i + 1);
      const ka0 = j * C + i0, ka1 = j * C + i1, kr0 = j0 * C + i, kr1 = j1 * C + i;
      const tax = pos[ka1 * 3] - pos[ka0 * 3], tay = D(ka1) - D(ka0), taz = pos[ka1 * 3 + 2] - pos[ka0 * 3 + 2];
      const trx = pos[kr1 * 3] - pos[kr0 * 3], tryy = D(kr1) - D(kr0), trz = pos[kr1 * 3 + 2] - pos[kr0 * 3 + 2];
      let nx = tryy * taz - trz * tay, ny = trz * tax - trx * taz, nz = trx * tay - tryy * tax;
      if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const l = Math.hypot(nx, ny, nz) || 1;
      nd[k * 4] = nx / l; nd[k * 4 + 1] = ny / l; nd[k * 4 + 2] = nz / l;
      let lap = 0;
      if (j > 0 && j < rows && i > 0 && i < cols) {
        const f = D(k), h0 = r - r0, h1 = r1 - r;
        const frr = 2 * (D(kr1) * h0 + D(kr0) * h1 - f * (h0 + h1)) / (h0 * h1 * (h0 + h1));
        const fr = (D(kr1) - D(kr0)) / (h0 + h1), faa = (D(ka1) - 2 * f + D(ka0)) / (dA * dA);
        lap = frr + fr / r + faa / (r * r);
      }
      nd[k * 4 + 3] = lap;
    }
  }
  const idx = new Uint32Array(cols * rows * 6);
  let q = 0;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1;
    idx[q++] = a; idx[q++] = b; idx[q++] = c; idx[q++] = b; idx[q++] = d; idx[q++] = c;   // counter-clockwise seen from above
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aH', new THREE.BufferAttribute(hh, 2));
  geo.setAttribute('aNd', new THREE.BufferAttribute(nd, 4));
  geo.setAttribute('aLn', new THREE.BufferAttribute(ln, 1));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -40), 200);

  const uniforms = {
    ...shared,
    uVp: { value: new THREE.Vector4(0, 0, 1, 1) }, uCam: { value: new THREE.Vector3() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
    uRock: { value: new THREE.Vector3(ROCK.x, 0, ROCK.z) }, uScrim: { value: new THREE.Vector4(-1e4, -1e4, -1e4, -1e4) },
    uHeat: { value: 0 }, uShine: { value: 0 }, uSkyTop: { value: .5 }, uHorizon: { value: 0 },
  };
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader }));
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}
