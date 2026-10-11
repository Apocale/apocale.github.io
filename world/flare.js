// The glossy lens flare of a Frutiger Aero sun: glare, a faint rainbow halo, and ghosts strung along
// the line from the sun through the centre of the screen. Added on top of everything, only where it is day.
import { TOD } from './glsl.js';

export function makeFlare(THREE, shared) {
  const uniforms = { ...shared, uSunPx: { value: new THREE.Vector3(0, 0, 0) }, uShine: { value: 0 }, uView: { value: new THREE.Vector4(0, 0, 1, 1) } };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: /* glsl */`
      ${TOD}
      uniform vec3 uSunPx;
      uniform float uShine;
      uniform vec4 uView;                      // the viewport it is drawn in (device px)
      float hex(vec2 p){ p = abs(p); return max(p.x * .866 + p.y * .5, p.y); }
      void main(){
        float day = smoothstep(.45, .92, dayAt(gl_FragCoord.xy)) * smoothstep(.5, .95, dayAt(uSunPx.xy));   // no flare while the sun is still in the night
        if (day < .002 || uSunPx.z < .002){ gl_FragColor = vec4(0.); return; }
        vec2 p = gl_FragCoord.xy, s = uSunPx.xy, ax = uView.xy + uView.zw * .5 - s;
        float u = 1. / uView.w, r = length(p - s) * u;
        vec3 col = vec3(1., .96, .86) * (exp(-r * 26.) * .24 + exp(-r * 7.) * .06);
        col += (.5 + .5 * cos(6.2832 * (r * 3.2 + vec3(0., .33, .67)))) * exp(-abs(r - .26) * 70.) * .03;
        // the ghosts: k along the axis, radius, tint, hexagonal or round
        vec4 G[6];
        G[0] = vec4(.28, .028, 0., 1.); G[1] = vec4(.5, .06, 1., 0.); G[2] = vec4(.72, .022, 2., 1.);
        G[3] = vec4(1.12, .085, 3., 0.); G[4] = vec4(1.34, .035, 4., 1.); G[5] = vec4(1.6, .12, 5., 0.);
        for (int i = 0; i < 6; i++){
          vec2 q = (p - (s + ax * G[i].x)) * u;
          float dg = G[i].w > .5 ? hex(q) : length(q), rad = G[i].y;
          float disc = smoothstep(rad, rad * .55, dg), ring = exp(-abs(dg - rad * .94) / (rad * .05 + .0015));
          vec3 tint = .6 + .4 * cos(6.2832 * (G[i].z * .17 + vec3(.0, .33, .67)));
          col += tint * (disc * .085 + ring * .11);
        }
        gl_FragColor = vec4(col * day * uSunPx.z * (1. + .35 * uShine), 1.);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 20;
  return { mesh, uniforms };
}

// Reduced motion on a phone: the page is drawn once, the night in the Khanjar section and the day in the Organizer
// section; this paints the dusk on the border between them (the lava's glow above, the last light on it, violet below).
export function makeDuskBand(THREE, shared) {
  const uniforms = { ...shared, uBandPx: { value: 60 } };
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms, transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: /* glsl */`
      ${TOD}
      uniform float uBandPx;
      void main(){
        float dy = ((1. - gl_FragCoord.y / uRes.y) - uSeam.x) * uRes.y / uBandPx;
        float a = exp(-dy * dy * 1.4);
        vec3 c = dy < 0. ? mix(vec3(1., .52, .3), vec3(.22, .05, .035), smoothstep(0., -1.3, dy))
                         : mix(vec3(1., .6, .42), vec3(.34, .24, .56), smoothstep(0., 1.4, dy));
        gl_FragColor = vec4(c * a, a);
      }`,
  }));
  mesh.frustumCulled = false;
  mesh.renderOrder = 19;
  mesh.visible = false;
  return { mesh, uniforms };
}
