// Embers rise from the lava on Khanjar's side; soap bubbles float on Isma Organizer's side.
// Each fades where the time of day is not its own: the embers die out in the dusk, the bubbles appear with the day.
import { TOD } from './glsl.js';

export function makeEmbers(THREE, shared, count, origin) {
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  const uniforms = { ...shared, uOrigin: { value: origin.clone() }, uHeat: { value: 0 }, uDpr: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      uniform float uTime, uHeat, uDpr;
      uniform vec3 uOrigin;
      attribute vec4 aSeed;
      varying float vA, vT;
      void main(){
        float life = 5. + 5. * aSeed.w;
        float t = fract(uTime * (1. + uHeat * .7) / life + aSeed.z);
        vec3 p = uOrigin + vec3((aSeed.x - .5) * 13., -1.6 + 1.4 * aSeed.y, (aSeed.y - .55) * 11.);
        p.y += t * (3.2 + 3.5 * aSeed.w);
        p.x += sin(t * 5. + aSeed.z * 30.) * .35 + t * t * 2.4;
        p.z += cos(t * 4. + aSeed.x * 20.) * .3;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (2.6 + 3. * aSeed.w) * uDpr * clamp(16. / -mv.z, .5, 2.2) * (1. - t * .5);
        vA = smoothstep(0., .1, t) * (1. - smoothstep(.5, 1., t)) * (.75 + .5 * uHeat);
        vT = t;
      }`,
    fragmentShader: /* glsl */`
      ${TOD}
      varying float vA, vT;
      void main(){
        float r = length(gl_PointCoord - .5);
        float a = (smoothstep(.5, .0, r) * .6 + smoothstep(.22, .0, r)) * vA * (1. - smoothstep(.18, .5, dayAt(gl_FragCoord.xy)));
        vec3 col = mix(vec3(1., .82, .5), vec3(1., .3, .16), smoothstep(0., .7, vT));
        gl_FragColor = vec4(col, a);                 // additive: the colour, weighted once by its alpha
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 6;
  return { points, uniforms };
}

export function makeBubbles(THREE, shared, count) {
  const uniforms = { ...shared, uSunDir: { value: new THREE.Vector3(0, 1, 0) } };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    vertexShader: /* glsl */`
      varying vec3 vN, vV, vP;
      void main(){
        mat4 m = modelMatrix * instanceMatrix;
        vec4 w = m * vec4(position, 1.);
        vN = normalize(mat3(m) * normal);
        vV = cameraPosition - w.xyz;
        vP = position;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      ${TOD}
      uniform vec3 uSunDir;
      varying vec3 vN, vV, vP;
      void main(){
        vec3 N = normalize(vN), V = normalize(vV);
        float nv = max(dot(N, V), 0.), f = pow(1. - nv, 2.4);
        float th = f * 1.5 + vP.y * .3 + vP.x * .12 + uTime * .025;
        vec3 film = .55 + .45 * cos(6.2832 * (th + vec3(0., .33, .67)));
        film = mix(film, vec3(1., .63, .9), smoothstep(.1, .9, vP.y) * .45);
        film = mix(film, vec3(.31, .84, 1.), smoothstep(.1, .9, -vP.y) * .5);
        vec3 R = reflect(-V, N);
        float spec = pow(max(dot(R, uSunDir), 0.), 260.) * 2.5
                   + pow(max(dot(R, normalize(vec3(-.55, .75, .5))), 0.), 90.) * 1.2
                   + pow(max(dot(R, normalize(vec3(.5, -.6, .6))), 0.), 40.) * .25;
        float edge = smoothstep(.0, .06, nv);
        float a = (.03 + f * .62) * edge + (1. - edge) * .25;
        vec3 col = film * f * .95 + vec3(.85, .95, 1.) * (1. - edge) * .25 + vec3(1.) * spec;
        a = clamp(a + spec * .8, 0., 1.);
        float day = smoothstep(.38, .82, dayAt(gl_FragCoord.xy));
        gl_FragColor = vec4(col * day, a * day);
      }`,
  });
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 48, 32), mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.renderOrder = 7;
  return { mesh, uniforms };
}
