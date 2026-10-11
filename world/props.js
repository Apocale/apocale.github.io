// Khanjar's side: the dagger planted in a faceted stone on the summit, like a sword in the stone,
// its steel lit from below by the lava and edged by the moon.
import { makeDagger } from '../shared/dagger.js';
import { ROCK, rocksH, hillsH } from './terrain.js';

// what the steel reflects: the night above, the lava's glow rising to the horizon all around, and thin strips of
// cold light that draw the edges. The flat of the blade looks at the horizon: fire at its foot, night at its top.
export function fireEnv(THREE, renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(30, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec3 vP; void main(){
      float y = vP.y;
      vec3 fire = vec3(2.3, .52, .14);
      vec3 c = mix(fire * 1.1, fire * .5, smoothstep(-.9, -.05, y));                 // the lava, all around below
      c = mix(c, vec3(.03, .034, .055), smoothstep(-.03, .13, y));                     // its glow ends just over the horizon
      c += vec3(.05, .06, .1) * smoothstep(.05, .6, y) * smoothstep(.3, -.9, vP.x);   // the moonlit night on the left
      c += vec3(.02, .025, .05) * smoothstep(.4, 1., y);
      // where the flat of the blade looks (the horizon on the left): fire at its foot, dark steel, a thin cold line
      float w = smoothstep(.55, .9, -vP.x);
      vec3 band = mix(vec3(2.1, .5, .13), vec3(.2, .04, .02), smoothstep(.0, .07, y));
      band = mix(band, vec3(.03, .036, .065), smoothstep(.06, .1, y));
      band += vec3(.05, .06, .1) * smoothstep(.12, .3, y);
      band += vec3(2.4, 2.6, 3.) * smoothstep(.115, .128, y) * smoothstep(.155, .142, y);
      c = mix(c, band, w * smoothstep(-.1, .02, y) * (1. - smoothstep(.34, .42, y)));
      gl_FragColor = vec4(c, 1.); }`,
  })));
  const panel = (w, h, x, y, z, k, color) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  panel(16, .32, 0, 9, 2, 7, 0xe2e8ff);        // a thin cold line overhead
  panel(.32, 14, 9, 2, 6, 6, 0xe2e8ff);        // and one on the right, in front: the edges and the ridge
  panel(.3, 12, -7, 3, -8, 4, 0xb4c2ec);       // the moon, behind on the left: a rim on the back edge
  panel(4, 1.4, -3, -1.2, 9, 2.4, 0xff6a30);   // embers low in front
  const tex = pmrem.fromScene(env, .015).texture;
  pmrem.dispose();
  return tex;
}

// a seeded random, so the stone is the same on every visit
function rand(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

export function makeProps(THREE) {
  const group = new THREE.Group();
  const groundY = Math.min(rocksH(ROCK.x, ROCK.z), hillsH(ROCK.x, ROCK.z));

  // the stone: an icosahedron pushed out of shape, a flat top, sharp facets
  const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position, r = rand(11), seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    if (!seen.has(k)) seen.set(k, [.8 + .32 * r(), (r() - .5) * .14]);
    const [s, j] = seen.get(k);
    let yy = y * s;
    if (yy > .5) yy = .5 + (yy - .5) * .25 + j;
    p.setXYZ(i, x * s * 1.35, Math.max(yy, -.6), z * s * 1.05);
  }
  g.computeVertexNormals();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x18191d, roughness: .6, metalness: .12, flatShading: true, envMapIntensity: .6 });
  const stone = new THREE.Mesh(g, stoneMat);
  const S = .66;
  stone.scale.setScalar(S);
  stone.rotation.y = .5;
  stone.position.set(ROCK.x, groundY - .04, ROCK.z);           // seated in the summit
  group.add(stone);
  const top = new THREE.Vector3(ROCK.x, groundY - .04 + .52 * S, ROCK.z);

  // the slot where the blade enters, still hot
  const slot = new THREE.Mesh(new THREE.BoxGeometry(.42, .035, .12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5a2a).multiplyScalar(2.2) }));
  slot.position.copy(top).add(new THREE.Vector3(0, .005, 0)); slot.rotation.y = -.35;
  group.add(slot);

  // the dagger, tip down in the stone, the handle up, leaning a little; its flat turned to catch the fire
  const { pivot, dagger, materials } = makeDagger(THREE);
  materials.steel.envMapIntensity = 1.5; materials.steel.roughness = .1;
  const entry = new THREE.Object3D(); entry.position.set(2.28, .24, 0); dagger.add(entry);   // where the blade meets the stone
  const holder = new THREE.Group();
  holder.add(pivot);
  pivot.rotation.set(0, 0, -Math.PI / 2 + .13);
  holder.rotation.y = -.55;
  holder.scale.setScalar(1.12);
  group.add(holder);
  const place = lift => {
    holder.position.set(0, 0, 0); holder.updateMatrixWorld(true);
    const at = entry.getWorldPosition(new THREE.Vector3());
    holder.position.copy(top).sub(at).add(new THREE.Vector3(0, -.08 + lift, 0));
  };
  place(0);

  // the light: the lava under the summit, a little fire on the other side, the moon behind, a cold fill
  const lava = new THREE.PointLight(0xff5a24, 5, 12, 1.8); lava.position.copy(top).add(new THREE.Vector3(.8, -1.1, 2.2));
  const lava2 = new THREE.PointLight(0xff3a12, 3, 8, 1.8); lava2.position.copy(top).add(new THREE.Vector3(-1.5, -.7, .6));
  const moon = new THREE.DirectionalLight(0xb7c4ff, 1.3); moon.position.set(ROCK.x - 7, 12, ROCK.z - 8); moon.target.position.copy(top);
  const fill = new THREE.DirectionalLight(0xdfe6ff, .22); fill.position.set(ROCK.x + 3, top.y + 3, ROCK.z + 12); fill.target.position.copy(top);
  group.add(lava, lava2, moon, moon.target, fill, fill.target);

  return { group, holder, place, top, lava, lava2, slot, stone, base: { lava: lava.intensity, lava2: lava2.intensity } };
}
