// Shared GLSL for the landscape: noise, the time of day across the screen, and the three skies.
// Every shader of the scene asks the same question, dayAt(pixel): 0 is Khanjar's night, .5 the dusk, 1 Isma Organizer's day.

export const NOISE = /* glsl */`
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++){ s += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
`;

// uSeam, desktop: x = seam at the top of the screen, y = seam at the bottom (0..1 from the left), z/w = half band at top/bottom.
// uSeam, phone: x = the boundary between the two sections (0..1 from the top of the screen), z = half band.
export const TOD = /* glsl */`
uniform vec2 uRes;
uniform vec4 uSeam;
uniform float uMode, uTime;
float dayAt(vec2 fc){
  vec2 q = fc / uRes;
  if (uMode < .5){
    float sx = mix(uSeam.y, uSeam.x, q.y), bw = mix(uSeam.w, uSeam.z, q.y);
    return smoothstep(-bw, bw, q.x - sx + .007 * sin(q.y * 7. + uTime * .21));
  }
  return smoothstep(-uSeam.z, uSeam.z, (1. - q.y) - uSeam.x + .006 * sin(q.x * 6. + uTime * .27));
}
`;

// the three skies, by elevation e (0 at the horizon, 1 at the top of the frame), in sRGB
export const SKY = /* glsl */`
vec3 nightSky(float e){
  vec3 c = mix(vec3(.20, .075, .045), vec3(.075, .045, .05), smoothstep(0., .12, e));   // ember haze over the lava
  c = mix(c, vec3(.03, .032, .05), smoothstep(.08, .45, e));
  return mix(c, vec3(.012, .014, .028), smoothstep(.45, 1., e));
}
vec3 duskSky(float e){
  vec3 c = mix(vec3(1., .74, .46), vec3(1., .5, .34), smoothstep(0., .1, e));          // the last light, on the horizon
  c = mix(c, vec3(.8, .33, .47), smoothstep(.07, .3, e));                                 // pink
  c = mix(c, vec3(.34, .22, .5), smoothstep(.24, .6, e));                                 // violet
  return mix(c, vec3(.1, .1, .27), smoothstep(.55, 1., e));                               // indigo, the first stars
}
vec3 daySky(float e){                                                                      // Isma Organizer's sky
  vec3 c = mix(vec3(.94, .984, 1.), vec3(.84, .945, 1.), smoothstep(0., .1, e));
  c = mix(c, vec3(.608, .839, .984), smoothstep(.06, .26, e));
  c = mix(c, vec3(.345, .682, .945), smoothstep(.2, .44, e));
  c = mix(c, vec3(.176, .553, .902), smoothstep(.4, .62, e));
  c = mix(c, vec3(.082, .439, .839), smoothstep(.58, .82, e));
  return mix(c, vec3(.039, .345, .741), smoothstep(.78, 1., e));
}
vec3 skyAt(float d, float e){
  return mix(mix(nightSky(e), duskSky(e), smoothstep(0., .5, d)), daySky(e), smoothstep(.5, 1., d));
}
vec3 toLin(vec3 c){ return pow(max(c, 0.), vec3(2.2)); }
vec3 toSRGB(vec3 c){ return pow(max(c, 0.), vec3(1. / 2.2)); }
`;
