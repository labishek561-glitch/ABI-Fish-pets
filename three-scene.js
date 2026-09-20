import { State } from './state.js';
import { storage, toast, reducedMotion } from './utils.js';
import { addToCart, toggleWishlist } from './firebase.js';

export const Aquarium3D = {
  THREE: null, OrbitControls: null, GLTFLoader: null,
  hero: null, showroom: null, viewer: null,
  heroControls: null,
  quality: 'high', webglOK: true
};

/* ---- QUALITY DETECTION ---- */
export function detectQuality() {
  if (storage.get('abi_perf', false)) return 'low';
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const mobile = matchMedia('(max-width: 860px)').matches;
  if (reducedMotion) return 'low';
  if (mobile && (cores <= 4 || mem <= 3)) return 'low';
  if (mobile) return 'medium';
  if (cores <= 4) return 'medium';
  return 'high';
}
function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

/* ---- deterministic palette from product name + category ---- */
function paletteFor(product) {
  const key = (product.name || '') + '|' + (product.type || product.category || '');
  let h = 0; for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  const hue2 = (hue + 40 + (Math.abs(h >> 3) % 60)) % 360;
  const hsl = (hh, s, l) => `hsl(${hh} ${s}% ${l}%)`;
  return {
    body:  hsl(hue, 70, 52),
    belly: hsl(hue2, 80, 78),
    fin:   hsl(hue2, 72, 60),
    cap:   hsl((hue + 180) % 360, 70, 50),
    shade: hsl(hue, 60, 26)
  };
}
/* ---- Glowing Jellyfish (hero-only, deep-abyss aesthetic) ---- */
function buildJellyfish(THREE, opts) {
  const o = Object.assign({
    color: 0x7dd3fc,     // pale icy blue
    glow: 0x38bdf8,      // bright cyan glow
    size: 1,
    tentacles: 8
  }, opts);

  const group = new THREE.Group();
  const inner = new THREE.Group();
  group.add(inner);

  /* --- Bell / dome (translucent, emissive) --- */
  const bellGeo = new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.58);
  const bellMat = new THREE.MeshStandardMaterial({
    color: o.color,
    emissive: new THREE.Color(o.glow),
    emissiveIntensity: 1.1,
    transparent: true,
    opacity: 0.38,
    roughness: 0.1,
    metalness: 0.15,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const bell = new THREE.Mesh(bellGeo, bellMat);
  bell.scale.set(0.62, 0.52, 0.62);
  inner.add(bell);

  /* --- Inner glowing core --- */
  const coreMat = new THREE.MeshBasicMaterial({
    color: o.glow,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), coreMat);
  core.scale.set(0.6, 0.4, 0.6);
  core.position.y = -0.05;
  inner.add(core);

  /* --- Trailing tentacles --- */
  const tentacleMat = new THREE.MeshBasicMaterial({
    color: o.color,
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const tentacleList = [];
  for (let i = 0; i < o.tentacles; i++) {
    const t = (i / o.tentacles) * Math.PI * 2;
    const cx = Math.cos(t), sz = Math.sin(t);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cx * 0.34, -0.30, sz * 0.34),
      new THREE.Vector3(cx * 0.44, -0.90, sz * 0.44),
      new THREE.Vector3(cx * 0.42 + Math.sin(t * 3) * 0.12, -1.70, sz * 0.42 + Math.cos(t * 2) * 0.12),
      new THREE.Vector3(cx * 0.28, -2.50, sz * 0.28)
    ]);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 12, 0.018, 4, false),
      tentacleMat
    );
    tentacleList.push(tube);
    inner.add(tube);
  }

  /* --- Long thin filaments --- */
  const filamentMat = new THREE.MeshBasicMaterial({
    color: o.glow,
    transparent: true,
    opacity: 0.38,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  for (let i = 0; i < 4; i++) {
    const t = (i / 4) * Math.PI * 2 + 0.5;
    const cx = Math.cos(t), sz = Math.sin(t);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cx * 0.10, -0.30, sz * 0.10),
      new THREE.Vector3(cx * 0.16, -1.40, sz * 0.16),
      new THREE.Vector3(cx * 0.10, -2.60, sz * 0.10),
      new THREE.Vector3(cx * 0.04, -3.60, sz * 0.04)
    ]);
    inner.add(new THREE.Mesh(
      new THREE.TubeGeometry(curve, 14, 0.012, 3, false),
      filamentMat
    ));
  }

  /* --- Soft point light radiating from core --- */
  const light = new THREE.PointLight(o.glow, 3.5, 7, 2);
  light.position.y = -0.15;
  inner.add(light);

  group.scale.setScalar(o.size);

  return {
    group, inner, bell,
    update(time, speed = 1) {
      const pulse = Math.sin(time * 1.5 * speed);
      const p = (pulse + 1) / 2;                 // 0..1
      /* bell inhale / exhale */
      bell.scale.set(0.62 * (1 + p * 0.20), 0.52 * (1 - p * 0.14), 0.62 * (1 + p * 0.20));
      core.scale.set(0.60 * (1 + p * 0.24), 0.40 * (1 + p * 0.18), 0.60 * (1 + p * 0.24));
      core.material.opacity = 0.35 + p * 0.35;
      light.intensity = 2.4 + p * 3.4;
      /* tentacle sway */
      tentacleList.forEach((tc, i) => {
        tc.rotation.y = Math.sin(time * 1.1 * speed + i * 0.4) * 0.18;
      });
      inner.rotation.z = Math.sin(time * 0.5 * speed) * 0.06;
    },
    dispose() {
      group.traverse(x => { if (x.geometry) x.geometry.dispose(); });
      [bellMat, coreMat, tentacleMat, filamentMat].forEach(m => m.dispose());
    }
  };
}
/* ---- procedural 3D fish ---- */
function buildFish(THREE, opts) {
  const o = Object.assign({
    body: 0xff8a3d, fin: 0xffc46b, cap: 0xef4444,
    tall: 1, tail: 1, hump: 0, size: 1, variant: 'goldfish'
  }, opts);

  const group = new THREE.Group();
  const inner = new THREE.Group();
  group.add(inner);

  const bodyMat = new THREE.MeshStandardMaterial({ color: o.body, roughness: .3, metalness: .32,
    emissive: new THREE.Color(o.body).multiplyScalar(.09) });
  const finMat  = new THREE.MeshStandardMaterial({ color: o.fin, roughness: .45, metalness: .06,
    transparent: true, opacity: .85, side: THREE.DoubleSide, depthWrite: false,
    emissive: new THREE.Color(o.fin).multiplyScalar(.06) });
  const capMat  = new THREE.MeshStandardMaterial({ color: o.cap, roughness: .5, metalness: .12,
    emissive: new THREE.Color(o.cap).multiplyScalar(.1) });

  const bodyGeo = new THREE.SphereGeometry(1, 26, 18);
  bodyGeo.scale(0.36, 0.40 * o.tall, 1.0);
  inner.add(new THREE.Mesh(bodyGeo, bodyMat));

  if (o.variant === 'oranda' || o.variant === 'flowerhorn') {
    const humpGeo = new THREE.SphereGeometry(1, 18, 14);
    humpGeo.scale(0.30 * o.hump, 0.26 * o.hump, 0.30 * o.hump);
    const hump = new THREE.Mesh(humpGeo, capMat);
    hump.position.set(0, 0.20 * o.tall, 0.60);
    inner.add(hump);
  }

  function finGeo(outline) {
    const pos = []; const root = outline[0];
    for (let i = 1; i < outline.length - 1; i++) {
      pos.push(0, root[1], root[0]);
      pos.push(0, outline[i][1], outline[i][0]);
      pos.push(0, outline[i + 1][1], outline[i + 1][0]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0, -0.92);
  const t = o.tail;
  tailPivot.add(new THREE.Mesh(finGeo([
    [-0.05, 0], [-0.80*t, -0.72*t], [-0.44*t, -0.26*t],
    [-0.88*t, 0], [-0.44*t, 0.26*t], [-0.80*t, 0.72*t]
  ]), finMat));
  inner.add(tailPivot);

  inner.add(new THREE.Mesh(finGeo([
    [-0.32, 0.30*o.tall], [0.16, 0.80*o.tall], [-0.40, 0.86*o.tall], [-0.78, 0.32*o.tall]
  ]), finMat));
  inner.add(new THREE.Mesh(finGeo([
    [-0.42, -0.30*o.tall], [0.02, -0.62*o.tall], [-0.46, -0.68*o.tall], [-0.82, -0.30*o.tall]
  ]), finMat));

  const pectL = new THREE.Mesh(finGeo([[0,0],[0.34,0.20],[0.46,0.02],[0.20,-0.16]]), finMat);
  pectL.position.set(0.30, -0.02, 0.28); pectL.rotation.set(0, -0.95, 0.15);
  inner.add(pectL);
  const pectR = pectL.clone(); pectR.position.set(-0.30, -0.02, 0.28); pectR.rotation.set(0, 0.95, -0.15);
  inner.add(pectR);

  const eyeW = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .15 });
  const eyeB = new THREE.MeshStandardMaterial({ color: 0x05070f, roughness: .08, metalness: .35 });
  [-1, 1].forEach(side => {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 10), eyeW);
    w.position.set(side * 0.265, 0.10, 0.62); inner.add(w);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), eyeB);
    b.position.set(side * 0.30, 0.10, 0.68); inner.add(b);
  });

  group.scale.setScalar(o.size);

  return {
    group, inner, tailPivot, pectL, pectR,
    update(time, speed = 1) {
      tailPivot.rotation.y = Math.sin(time * 6.2 * speed) * 0.34;
      pectL.rotation.z = 0.15 + Math.sin(time * 4.4 * speed) * 0.22;
      pectR.rotation.z = -0.15 - Math.sin(time * 4.4 * speed) * 0.22;
      inner.rotation.y = Math.sin(time * 3.1 * speed) * 0.05;
      inner.rotation.z = Math.sin(time * 2.2 * speed) * 0.03;
    },
    dispose() {
      group.traverse(x => { if (x.geometry) x.geometry.dispose(); });
      [bodyMat, finMat, capMat, eyeW, eyeB].forEach(m => m.dispose());
    }
  };
}

function fishOptsFromProduct(product, size = 1) {
  const pal = paletteFor(product);
  const category = (product.type || product.category || '').toLowerCase();
  const variant =
    category.includes('ranchu') ? 'ranchu' :
    category.includes('oranda') ? 'oranda' :
    category.includes('betta') ? 'betta' :
    category.includes('guppy') ? 'guppy' :
    category.includes('flower') ? 'flowerhorn' : 'goldfish';
  return {
    body: pal.body, fin: pal.fin, cap: pal.cap,
    tall: variant === 'oranda' ? 1.22 : variant === 'ranchu' ? 1.18 : variant === 'flowerhorn' ? 1.10 : variant === 'guppy' ? .82 : 1,
    tail: variant === 'betta' ? 1.35 : variant === 'guppy' ? 1.15 : 1,
    hump: variant === 'oranda' ? 1 : variant === 'flowerhorn' ? 1.15 : 0,
    size,
    variant
  };
}

/* ---- Aquarium scene ---- */
class Aquarium {
  constructor(canvas, THREE, quality, mode = 'hero') {
    this.THREE = THREE; this.canvas = canvas; this.mode = mode;
    this.quality = quality; this.running = false; this.visible = true;
    this.clock = new THREE.Clock(); this.mouse = { x: 0, y: 0 };
    this.fishes = []; this.plants = []; this.rays = [];
    this.dprCap = quality === 'low' ? 1 : quality === 'medium' ? 1.35 : 1.8;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x03182a, mode === 'showroom' ? .06 : .042);

    this.camera = new THREE.PerspectiveCamera(52, 1, .1, 260);
    this.camera.position.set(0, .6, mode === 'showroom' ? 5.4 : 9);
    this.camera.lookAt(0, -.3, mode === 'showroom' ? 0 : -2);

    this.buildLights(); this.buildEnvironment(); this.buildBubbles(); this.buildDust();
    if (quality !== 'low') this.buildRays();

    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement || canvas);
    this.animate = this.animate.bind(this);
    // before:
this.scene.fog = new THREE.FogExp2(0x03182a, mode === 'showroom' ? .06 : .042);

// after (deeper, darker):
this.scene.fog = new THREE.FogExp2(0x010a18, mode === 'showroom' ? .06 : .032);
  }

  applyQuality(q) {
    this.quality = q;
    this.dprCap = q === 'low' ? 1 : q === 'medium' ? 1.35 : 1.8;
    if (this.dust) this.dust.material.opacity = q === 'low' ? .25 : .5;
    this.resize();
  }

  buildLights() {
    const T = this.THREE;
    this.scene.add(new T.HemisphereLight(0x9fe8ff, 0x04131f, this.mode === 'showroom' ? 1.25 : 1.05));
    const sun = new T.DirectionalLight(0xbdf0ff, this.mode === 'showroom' ? 1.5 : 1.15);
    sun.position.set(3, 14, 6); this.scene.add(sun);
    const aA = new T.PointLight(0x22d3ee, this.mode === 'showroom' ? 26 : 34, 34, 2);
    aA.position.set(-8, 3, 4); this.scene.add(aA);
    const aB = new T.PointLight(0x8b5cf6, 22, 34, 2);
    aB.position.set(9, -1, 2); this.scene.add(aB);
    this.lights = { sun, accentA: aA, accentB: aB };
  }

  buildEnvironment() {
    const T = this.THREE; const small = this.quality === 'low';
    const floor = new T.Mesh(new T.CircleGeometry(52, small ? 26 : 52),
      new T.MeshStandardMaterial({ color: 0x0b2a3d, roughness: .96, metalness: .04 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = this.mode === 'showroom' ? -2.6 : -6;
    this.scene.add(floor);

    const rockMat = new T.MeshStandardMaterial({ color: 0x0e2b3f, roughness: .95, flatShading: true });
    const rockCount = small ? 4 : 9;
    for (let i = 0; i < rockCount; i++) {
      const g = new T.IcosahedronGeometry(0.5 + Math.random() * 1.3, small ? 0 : 1);
      const p = g.attributes.position;
      for (let v = 0; v < p.count; v++) {
        p.setXYZ(v, p.getX(v) * (1 + (Math.random() - .5) * .35),
                    p.getY(v) * (1 + (Math.random() - .5) * .3),
                    p.getZ(v) * (1 + (Math.random() - .5) * .35));
      }
      g.computeVertexNormals();
      const rock = new T.Mesh(g, rockMat);
      const spread = this.mode === 'showroom' ? 5 : 12;
      rock.position.set((Math.random() - .5) * spread * 1.7,
        (this.mode === 'showroom' ? -2.6 : -6) + .25, -2 - Math.random() * 9);
      rock.rotation.y = Math.random() * Math.PI; rock.scale.y = .75;
      this.scene.add(rock);
    }

const plantCount = small ? 5 : 11;
    for (let i = 0; i < plantCount; i++) {
      const plant = new T.Group();
      const hue = 0.34 + Math.random() * 0.14;
      const mat = new T.MeshStandardMaterial({
        color: new T.Color().setHSL(hue, .55, .26),
        roughness: .8, side: T.DoubleSide, transparent: true, opacity: .92
      });
      const leaves = small ? 4 : 6;
      for (let l = 0; l < leaves; l++) {
        const h = .9 + Math.random() * 2.6;
        const shape = new T.Shape();
        shape.moveTo(0, 0);
        shape.bezierCurveTo(.22, h * .35, .12, h * .72, 0, h);
        shape.bezierCurveTo(-.12, h * .72, -.22, h * .35, 0, 0);
        const leaf = new T.Mesh(new T.ShapeGeometry(shape, small ? 4 : 8), mat);
        leaf.position.set((Math.random() - .5) * .35, 0, (Math.random() - .5) * .35);
        leaf.rotation.set((Math.random() - .5) * .3, Math.random() * Math.PI, (Math.random() - .5) * .35);
        plant.add(leaf);
      }
      const spread = this.mode === 'showroom' ? 4.4 : 11;
      plant.position.set((Math.random() - .5) * spread * 2, this.mode === 'showroom' ? -2.6 : -6, -1.5 - Math.random() * 10);
      plant.userData.phase = Math.random() * Math.PI * 2;
      this.scene.add(plant); this.plants.push(plant);
    }
  }
buildFish(products) {
  const pool = (products && products.length) ? products : [];
  /* Hero uses jellyfish — it doesn't need products.
     Showroom uses product-based fish. */
  if (this.mode === 'showroom' && !pool.length) return;

  const counts = { low: 4, medium: 6, high: 9 };
  const n = this.mode === 'showroom' ? 1 : counts[this.quality] || 6;

  for (let i = 0; i < n; i++) {
    let rig;

    if (this.mode === 'hero') {
      /* ─── JELLYFISH ─── */
      rig = buildJellyfish(this.THREE, {
        color: 0x7dd3fc,
        glow: 0x38bdf8,
        size: 0.35 + Math.random() * 0.55,
        tentacles: this.quality === 'low' ? 6 : 8
      });
    } else {
      /* ─── FISH (showroom) ─── */
      const p = pool[i % pool.length];
      rig = buildFish(this.THREE, fishOptsFromProduct(p, 1.15));
    }

    const f = rig.group;
    const bounds = this.mode === 'showroom'
      ? { x: 1.6, y: .9, zMin: -1.6, zMax: 1.4 }
      : { x: 8.5, y: 4.5, zMin: -12, zMax: 2 };

    f.position.set(
      (Math.random() - .5) * bounds.x * 1.7,
      (Math.random() - .5) * bounds.y * 1.5,
      bounds.zMin + Math.random() * (bounds.zMax - bounds.zMin)
    );

    f.userData = {
      rig,
      type: this.mode === 'hero' ? 'jellyfish' : 'fish',
      speed: this.mode === 'showroom' ? .5 : (0.8 + Math.random() * 1.0),
      phase: Math.random() * Math.PI * 2,
      bounds,
      target: new this.THREE.Vector3(),
      /* jellyfish-only */
      floatDir: Math.random() > 0.5 ? 1 : -1
    };

    if (this.mode === 'showroom') this.pickTarget(f, true);

    this.scene.add(f);
    this.fishes.push(f);
  }
}
  replaceFishes(products) {
    this.fishes.forEach(f => { this.scene.remove(f); f.userData.rig.dispose(); });
    this.fishes = [];
    this.buildFish(products);
  }

  setShowroomProduct(product) {
    if (this.mode !== 'showroom' || !product) return;
    this.fishes.forEach(f => { this.scene.remove(f); f.userData.rig.dispose(); });
    this.fishes = [];
    const rig = buildFish(this.THREE, fishOptsFromProduct(product, 1.15));
    const f = rig.group;
    const bounds = { x: 1.6, y: .9, zMin: -1.6, zMax: 1.4 };
    f.position.set(0, 0, 0);
    f.userData = { rig, speed: .5, phase: 0, bounds, target: new this.THREE.Vector3() };
    this.pickTarget(f, true);
    this.scene.add(f); this.fishes.push(f);
  }

  pickTarget(f, initial) {
    const b = f.userData.bounds;
    if (this.mode === 'showroom') {
      f.userData.target.set((Math.random() - .5) * b.x * 1.6,
        (Math.random() - .5) * b.y * 1.6,
        b.zMin + Math.random() * (b.zMax - b.zMin));
      return;
    }
    f.userData.target.set((Math.random() - .5) * b.x * 1.8,
      (Math.random() - .5) * b.y * 1.6,
      b.zMin + Math.random() * (b.zMax - b.zMin));
    if (initial) f.position.copy(f.userData.target);
  }

  buildBubbles() {
    const T = this.THREE;
    const count = this.quality === 'low' ? 70 : this.quality === 'medium' ? 140 : 240;
    const geo = new T.BufferGeometry();
    const pos = new Float32Array(count * 3);
    this.bubbleData = [];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - .5) * 22;
      pos[i * 3 + 1] = -6 + Math.random() * 14;
      pos[i * 3 + 2] = -14 + Math.random() * 18;
      this.bubbleData.push({ speed: .35 + Math.random() * .8, wob: Math.random() * Math.PI * 2, amp: .12 + Math.random() * .3 });
    }
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const mat = new T.PointsMaterial({ size: .26, color: 0x9fe4ff, transparent: true, opacity: .55,
      depthWrite: false, blending: T.AdditiveBlending });
    this.bubbles = new T.Points(geo, mat);
    this.scene.add(this.bubbles);
  }

  buildDust() {
    const T = this.THREE;
    const count = this.quality === 'low' ? 180 : this.quality === 'medium' ? 420 : 760;
    const geo = new T.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - .5) * 30;
      pos[i * 3 + 1] = (Math.random() - .5) * 16;
      pos[i * 3 + 2] = -16 + Math.random() * 22;
    }
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const mat = new T.PointsMaterial({ size: .07, color: 0x9fe4ff, transparent: true, opacity: .5,
      depthWrite: false, blending: T.AdditiveBlending });
    this.dust = new T.Points(geo, mat);
    this.scene.add(this.dust);
  }

  buildRays() {
    const T = this.THREE;
    const n = this.quality === 'high' ? 7 : 4;
    for (let i = 0; i < n; i++) {
      const w = 1.2 + Math.random() * 2.6;
      const mat = new T.MeshBasicMaterial({ color: 0x9fe4ff, transparent: true,
        opacity: .045 + Math.random() * .05, blending: T.AdditiveBlending,
        depthWrite: false, side: T.DoubleSide });
      const ray = new T.Mesh(new T.PlaneGeometry(w, 26), mat);
      ray.position.set((Math.random() - .5) * 20, 4 + Math.random() * 4, -6 - Math.random() * 10);
      ray.rotation.z = (Math.random() - .5) * .38;
      ray.rotation.x = -0.16;
      ray.userData.phase = Math.random() * Math.PI * 2;
      this.scene.add(ray); this.rays.push(ray);
    }
  }

  resize() {
    const parent = this.canvas.parentElement || this.canvas;
    const w = parent.clientWidth || 1, h = parent.clientHeight || 1;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.dprCap));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start() { if (this.running) return; this.running = true; this.clock.start(); this.animate(); }
  stop()  { this.running = false; }
  setVisible(v) { this.visible = v; if (v) this.start(); else this.stop(); }

  animate() {
    if (!this.running) return;
    this._raf = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), .05);
    const t = this.clock.elapsedTime;

   this.fishes.forEach(f => {
  const ud = f.userData;

  if (ud.type === 'jellyfish') {
    /* ─── Jellyfish: slow vertical drift + gentle sway ─── */
    f.position.y += ud.floatDir * 0.35 * ud.speed * dt;
    if (f.position.y > ud.bounds.y * 0.9)  ud.floatDir = -1;
    if (f.position.y < -ud.bounds.y * 0.9) ud.floatDir = 1;

    /* horizontal drift */
    f.position.x += Math.sin(t * 0.28 + ud.phase) * 0.12 * dt;
    f.position.z += Math.cos(t * 0.22 + ud.phase) * 0.08 * dt;

    /* gentle rotation */
    f.rotation.y = Math.sin(t * 0.35 + ud.phase) * 0.45;
    f.rotation.z = Math.sin(t * 0.5 + ud.phase) * 0.10;

    /* bell pulsing */
    ud.rig.update(t + ud.phase, ud.speed * 0.6);

  } else {
    /* ─── Fish: original swimming logic ─── */
    const toT = ud.target.clone().sub(f.position);
    const dist = toT.length();
    if (dist < .9) this.pickTarget(f);
    toT.normalize();
    f.position.addScaledVector(toT, ud.speed * dt);

    const targetYaw = Math.atan2(toT.x, toT.z);
    let diff = targetYaw - f.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    f.rotation.y += diff * Math.min(1, dt * 2.6);
    f.rotation.z += ((-diff * .32) - f.rotation.z) * Math.min(1, dt * 3);
    f.position.y += Math.sin(t * 1.6 + ud.phase) * .0035;

    ud.rig.update(t + ud.phase, ud.speed * .75);
  }
});
    this.plants.forEach(p => {
      p.rotation.z = Math.sin(t * .7 + p.userData.phase) * .09;
      p.rotation.x = Math.cos(t * .5 + p.userData.phase) * .06;
    });

    if (this.bubbles) {
      const pos = this.bubbles.geometry.attributes.position;
      const arr = pos.array;
      for (let i = 0; i < this.bubbleData.length; i++) {
        const b = this.bubbleData[i];
        arr[i * 3 + 1] += b.speed * dt * 1.6;
        arr[i * 3] += Math.sin(t * 1.4 + b.wob) * b.amp * dt;
        if (arr[i * 3 + 1] > 8) {
          arr[i * 3 + 1] = -6;
          arr[i * 3] = (Math.random() - .5) * 22;
          arr[i * 3 + 2] = -14 + Math.random() * 18;
        }
      }
      pos.needsUpdate = true;
    }
    if (this.dust) this.dust.rotation.y += dt * .01;

    this.rays.forEach((r, i) => {
      r.material.opacity = .035 + Math.abs(Math.sin(t * .35 + r.userData.phase)) * .06;
      r.rotation.z = (i % 2 ? 1 : -1) * .12 + Math.sin(t * .22 + r.userData.phase) * .07;
    });

    if (this.lights) {
      this.lights.accentA.position.x = Math.sin(t * .35) * 9;
      this.lights.accentA.position.z = 4 + Math.cos(t * .28) * 4;
      this.lights.sun.position.x = Math.sin(t * .12) * 5;
    }

    if (this.mode === 'hero' && !document.body.classList.contains('immersive')) {
      this.camera.position.x += (this.mouse.x * 1.8 - this.camera.position.x) * .035;
      this.camera.position.y += ((.6 + this.mouse.y * .9) - this.camera.position.y) * .035;
      this.camera.lookAt(0, -.3, -2);
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.stop();
    cancelAnimationFrame(this._raf);
    this.ro && this.ro.disconnect();
    this.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach(m => { m.map && m.map.dispose(); m.dispose(); });
        else { o.material.map && o.material.map.dispose(); o.material.dispose(); }
      }
    });
    this.renderer.dispose();
  }
}

/* ---- BOOT THREE.JS ---- */
export async function initThree() {
  if (!webglAvailable()) {
    Aquarium3D.webglOK = false;
    const stage = document.getElementById('heroStage');
    if (stage) stage.classList.add('no-webgl');
    return false;
  }
  try {
    const THREE = await import('three');
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
    const { GLTFLoader }   = await import('three/addons/loaders/GLTFLoader.js');

    Aquarium3D.THREE = THREE;
    Aquarium3D.OrbitControls = OrbitControls;
    Aquarium3D.GLTFLoader = GLTFLoader;
    Aquarium3D.quality = detectQuality();

    const heroCanvas = document.getElementById('heroCanvas');
    const heroStage = document.getElementById('heroStage');
    heroCanvas.width  = heroStage.clientWidth  || window.innerWidth;
    heroCanvas.height = heroStage.clientHeight || window.innerHeight;

    Aquarium3D.hero = new Aquarium(heroCanvas, THREE, Aquarium3D.quality, 'hero');

    const hc = new OrbitControls(Aquarium3D.hero.camera, heroCanvas);
    hc.enableDamping = true; hc.dampingFactor = .06;
    hc.enableZoom = false; hc.enablePan = false;
    hc.minPolarAngle = .75; hc.maxPolarAngle = 1.95;
    hc.minDistance = 4; hc.maxDistance = 13;
    hc.target.set(0, -.4, -2); hc.enabled = false;
    Aquarium3D.heroControls = hc;

    const heroIO = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (Aquarium3D.hero) Aquarium3D.hero.setVisible(e.isIntersecting && !document.hidden);
        if (Aquarium3D.heroControls) Aquarium3D.heroControls.enabled = e.isIntersecting;
      });
    }, { threshold: .06 });
    heroIO.observe(heroStage);
    Aquarium3D.hero.start();

    if (!reducedMotion && !matchMedia('(hover: none)').matches) {
      window.addEventListener('pointermove', e => {
        Aquarium3D.hero.mouse.x = (e.clientX / window.innerWidth - .5) * 2;
        Aquarium3D.hero.mouse.y = -(e.clientY / window.innerHeight - .5) * 2;
      }, { passive: true });
    }

    try {
      const sc = document.getElementById('showroomCanvas');
      const stage = document.getElementById('showroomStage');
      sc.width  = stage.clientWidth  || 640;
      sc.height = stage.clientHeight || 400;
      Aquarium3D.showroom = new Aquarium(sc, THREE, Aquarium3D.quality, 'showroom');
      const sIO = new IntersectionObserver(entries => {
        entries.forEach(e => { if (Aquarium3D.showroom) Aquarium3D.showroom.setVisible(e.isIntersecting && !document.hidden); });
      }, { threshold: .12 });
      sIO.observe(stage);
      Aquarium3D.showroom.setVisible(false);
    } catch (err) { console.warn('[ABI] showroom scene unavailable:', err); }

    (function tickImmersive() {
      requestAnimationFrame(tickImmersive);
      if (document.body.classList.contains('immersive') && Aquarium3D.heroControls) Aquarium3D.heroControls.update();
    })();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        Aquarium3D.hero && Aquarium3D.hero.stop();
        Aquarium3D.showroom && Aquarium3D.showroom.stop();
      } else {
        Aquarium3D.hero && Aquarium3D.hero.setVisible(true);
      }
    });

    return true;
  } catch (err) {
    console.warn('[ABI] Three.js unavailable — falling back to CSS aquarium.', err);
    Aquarium3D.webglOK = false;
    const stage = document.getElementById('heroStage');
    if (stage) stage.classList.add('no-webgl');
    return false;
  }
}

/* ---- When Firebase products change, refresh fish in the aquarium ---- */
export function refreshThreeFishes() {
  if (!Aquarium3D.webglOK) return;
  const pool = State.allProducts.length ? State.allProducts : [];
  if (!pool.length) return;
  if (Aquarium3D.hero) {
    if (Aquarium3D.hero.fishes.length === 0) Aquarium3D.hero.buildFish(pool);
    else Aquarium3D.hero.replaceFishes(pool);
  }
  if (Aquarium3D.showroom && State.showroomCat) {
    const first = pool.find(p => (p.type || p.category) === State.showroomCat) || pool[0];
    if (first) Aquarium3D.showroom.setShowroomProduct(first);
  }
}

/* ---- 3D viewer for a live Firebase product ---- */
export async function open3DViewer(productId) {
  const p = State.allProducts.find(x => x.id === productId);
  if (!p) { toast('Not available', 'This product is not loaded.', 'warn'); return; }

  const overlay = document.getElementById('modal');
  const titleEl = document.getElementById('modalTitle');
  const subEl = document.getElementById('modalSub');
  const box = document.getElementById('modalBox');
  const content = document.getElementById('modalContent');

  titleEl.textContent = (p.name || 'Fish') + ' · 3D';
  subEl.textContent = 'Drag to rotate · Pinch or scroll to zoom';
  box.className = 'modal-box full';
  content.innerHTML = `
    <div class="viewer-stage" id="viewerStage">
      <canvas id="viewerCanvas"></canvas>
      <span class="viewer-hint">Drag to rotate · Scroll to zoom</span>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost btn-sm" id="vReset">⟲ Reset camera</button>
      <button class="btn btn-ghost btn-sm" id="vRotate">⏸ Pause rotation</button>
      <button class="btn btn-primary btn-sm" id="vAdd">Add to Cart</button>
      <button class="btn btn-ghost btn-sm" id="vWish">${State.wishlistData[p.id] ? '❤️ Saved' : '🤍 Wishlist'}</button>
    </div>
    <p style="margin-top:14px;font-size:.78rem;color:var(--muted)">
      ${p.model ? `Loaded from <code>${p.model}</code>` : 'Rendered with a real-time procedural model. Add a <code>model</code> field to the Firebase product to use a real .glb.'}
    </p>`;
  overlay.classList.add('on');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('locked');

  document.getElementById('vAdd').onclick = () => addToCart(p.id);
  document.getElementById('vWish').onclick = () => { toggleWishlist(p.id); open3DViewer(p.id); };

  if (!Aquarium3D.webglOK || !Aquarium3D.THREE) {
    const img = p.imageUrl || '';
    document.getElementById('viewerStage').innerHTML = `<img src="${img}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover" />`;
    return;
  }

  const THREE = Aquarium3D.THREE;
  const canvas = document.getElementById('viewerCanvas');
  const stage = document.getElementById('viewerStage');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: Aquarium3D.quality !== 'low', alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 100);
  camera.position.set(0, .5, 3.4);

  scene.add(new THREE.HemisphereLight(0xbdf0ff, 0x06202f, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.PointLight(0x22d3ee, 16, 20, 2); rim.position.set(-3, 1, -2); scene.add(rim);
  const rim2 = new THREE.PointLight(0x8b5cf6, 12, 20, 2); rim2.position.set(3, -1.5, -2); scene.add(rim2);

  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.6, 42),
    new THREE.MeshStandardMaterial({ color: 0x062436, roughness: .35, metalness: .4, transparent: true, opacity: .55 }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = -1.05; scene.add(disc);

  const controls = new Aquarium3D.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .07;
  controls.autoRotate = true; controls.autoRotateSpeed = 1.5;
  controls.minDistance = 1.6; controls.maxDistance = 7;
  controls.enablePan = false;

  const fit = () => {
    const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  fit();
  const ro = new ResizeObserver(fit); ro.observe(stage);

  let rig = null;
  if (p.model && Aquarium3D.GLTFLoader) {
    try {
      const glb = await new Promise((res, rej) => Aquarium3D.GLTFLoader.load(p.model, res, undefined, rej));
      const m = glb.scene;
      const box = new THREE.Box3().setFromObject(m);
      const size = box.getSize(new THREE.Vector3());
      const centre = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      m.position.sub(centre);
      m.scale.setScalar(2.4 / maxDim);
      scene.add(m);
    } catch (err) {
      console.warn('[ABI] model failed, falling back:', p.model, err);
      rig = buildFish(THREE, fishOptsFromProduct(p, 1.5));
      scene.add(rig.group);
    }
  } else {
    rig = buildFish(THREE, fishOptsFromProduct(p, 1.5));
    scene.add(rig.group);
  }

  let raf; const t0 = performance.now();
  function loop() {
    raf = requestAnimationFrame(loop);
    const t = (performance.now() - t0) / 1000;
    if (rig) rig.update(t, 1);
    controls.update();
    renderer.render(scene, camera);
  }
  loop();

  document.getElementById('vReset').onclick = () => {
    camera.position.set(0, .5, 3.4);
    controls.target.set(0, 0, 0);
    controls.update();
    toast('Camera reset', '', 'info');
  };
  document.getElementById('vRotate').onclick = e => {
    controls.autoRotate = !controls.autoRotate;
    e.currentTarget.textContent = controls.autoRotate ? '⏸ Pause rotation' : '▶ Resume rotation';
  };

Aquarium3D.viewer = {
    stop() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (rig) rig.dispose();
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach(m => { m.map && m.map.dispose(); m.dispose(); });
          else { o.material.map && o.material.map.dispose(); o.material.dispose(); }
        }
      });
      controls.dispose();
      renderer.dispose();
      Aquarium3D.viewer = null;
    }
  };
}
