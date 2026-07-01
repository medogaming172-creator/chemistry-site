const THREE = window.THREE;

const container = document.getElementById('lab3d-container');
if (!container) throw new Error('Container not found');

let W, H, scene, camera, renderer, labGroup, bubbles = [], particles;
let time = 0;

function init() {
  W = container.clientWidth;
  H = container.clientHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0f1e);

  const aspect = W / H;
  const viewHeight = 6.5;
  const viewWidth = viewHeight * aspect;
  camera = new THREE.OrthographicCamera(
    -viewWidth / 2, viewWidth / 2,
    viewHeight / 2, -viewHeight / 2,
    0.1, 100
  );
  camera.position.set(0.3, 0.6, 8);
  camera.lookAt(0.3, 0.6, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.physicallyCorrectLights = true;
  container.appendChild(renderer.domElement);

  createEnvironment();
  createLights();
  createScene();
  createParticles();
  animate();
  window.addEventListener('resize', onResize);
}

function createEnvironment() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#1a1a3e');
  g.addColorStop(0.3, '#0f1428');
  g.addColorStop(0.6, '#0a0f1e');
  g.addColorStop(1, '#060a12');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = 'rgba(0,191,255,0.1)';
  ctx.beginPath(); ctx.arc(120, 60, 35, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(380, 120, 28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(150,100,255,0.07)';
  ctx.beginPath(); ctx.arc(420, 50, 25, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,200,255,0.06)';
  ctx.beginPath(); ctx.arc(200, 180, 20, 0, Math.PI * 2); ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = tex;
  scene.environmentIntensity = 1.2;
}

function createLights() {
  scene.add(new THREE.AmbientLight(0x223366, 0.3));
  const d = new THREE.DirectionalLight(0x88ddff, 0.9);
  d.position.set(2, 5, 4); scene.add(d);
  const f = new THREE.DirectionalLight(0x4466aa, 0.3);
  f.position.set(-2, 1, 3); scene.add(f);
  const r = new THREE.DirectionalLight(0x99ccff, 0.2);
  r.position.set(-1, -2, -3); scene.add(r);
}

// --- Materials ---
function glassMat(opt) {
  return new THREE.MeshPhysicalMaterial({
    color: opt?.color || 0x88ccff,
    metalness: 0,
    roughness: 0.05,
    transparent: true,
    opacity: opt?.opacity || 0.2,
    transmission: 0.7,
    thickness: 0.3,
    clearcoat: 0.2,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.5,
    side: THREE.DoubleSide,
    ...opt,
  });
}

function liquidMat(color, emissive, intensity) {
  return new THREE.MeshPhysicalMaterial({
    color,
    emissive,
    emissiveIntensity: intensity || 0.3,
    transparent: true,
    opacity: 0.65,
    roughness: 0.15,
    metalness: 0,
    envMapIntensity: 0.5,
  });
}

// --- Glassware Builders ---

function buildRoundFlask(glass, liquid, fillPct) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 32), glass);
  body.scale.y = 0.85;
  g.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.35, 16), glass);
  neck.position.y = 0.5;
  g.add(neck);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 8, 16), glass);
  rim.position.y = 0.68;
  g.add(rim);
  if (liquid) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 24), liquid);
    l.scale.set(0.85, fillPct * 0.6, 0.85);
    l.position.y = -0.28 + fillPct * 0.2;
    g.add(l);
  }
  return g;
}

function buildErlenmeyer(glass, liquid, fillPct) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.38, 0.6, 24, 1, true),
    glass
  );
  body.position.y = -0.15;
  g.add(body);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.38, 24), glass);
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = -0.45;
  g.add(bottom);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.25, 16), glass);
  neck.position.y = 0.28;
  g.add(neck);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 8, 16), glass);
  rim.position.y = 0.41;
  g.add(rim);
  if (liquid) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.35, fillPct * 0.5, 24), liquid);
    l.position.y = -0.4 + fillPct * 0.25;
    g.add(l);
    const lTop = new THREE.Mesh(new THREE.CircleGeometry(0.35, 24), liquid);
    lTop.rotation.x = -Math.PI / 2;
    lTop.position.y = -0.4 + fillPct * 0.5;
    lTop.scale.x = fillPct;
    g.add(lTop);
  }
  return g;
}

function buildBeaker(glass, liquid, fillPct) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.2, 0.45, 24, 1, true),
    glass
  );
  g.add(body);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), glass);
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = -0.225;
  g.add(bottom);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 8, 24), glass);
  rim.position.y = 0.225;
  g.add(rim);
  if (liquid) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, fillPct * 0.4, 24), liquid);
    l.position.y = -0.22 + fillPct * 0.2;
    g.add(l);
    const lTop = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), liquid);
    lTop.rotation.x = -Math.PI / 2;
    lTop.position.y = -0.22 + fillPct * 0.4;
    g.add(lTop);
  }
  return g;
}

function buildTestTube(glass, liquid, fillPct) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.3, 16, 1, true),
    glass
  );
  g.add(body);
  const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  bottom.position.y = -0.15;
  g.add(bottom);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 12), glass);
  rim.position.y = 0.15;
  g.add(rim);
  if (liquid) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, fillPct * 0.25, 12), liquid);
    l.position.y = -0.14 + fillPct * 0.125;
    g.add(l);
  }
  return g;
}

function buildTube(from, to, glass) {
  const dir = new THREE.Vector3().copy(to).sub(from);
  const len = dir.length();
  dir.normalize();
  const mid = new THREE.Vector3().copy(from).add(to).multiplyScalar(0.5);
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 8), glass);
  t.position.copy(mid);
  t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  return t;
}

function buildCondenser(glass) {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 16, 1, true), glass);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 12), glass);
  inner.position.y = 0.025;
  const cap1 = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 8, 16), glass);
  cap1.position.y = -0.4;
  const cap2 = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 8, 16), glass);
  cap2.position.y = 0.4;
  g.add(outer, inner, cap1, cap2);

  const inlet = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), glass);
  inlet.position.set(0.12, 0.25, 0);
  inlet.rotation.z = Math.PI / 2;
  const outlet = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), glass);
  outlet.position.set(0.12, -0.25, 0);
  outlet.rotation.z = Math.PI / 2;
  g.add(inlet, outlet);

  return g;
}

// --- Build Scene ---
function createScene() {
  labGroup = new THREE.Group();

  // Materials
  const gGlass = glassMat();
  const gGlassThin = glassMat({ opacity: 0.1, thickness: 0.2 });
  const gGlassThick = glassMat({ opacity: 0.2, thickness: 0.6 });

  const blueLiquid = liquidMat(0x0088ff, 0x0044ff, 0.4);
  const purpleLiquid = liquidMat(0x9944ff, 0x6622cc, 0.35);
  const cyanLiquid = liquidMat(0x00ccff, 0x0099dd, 0.3);
  const greenLiquid = liquidMat(0x00dd88, 0x009955, 0.25);

  // Table
  const table = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.06, 0.6),
    new THREE.MeshPhysicalMaterial({
      color: 0x1a2233,
      metalness: 0.3,
      roughness: 0.6,
      transparent: true,
      opacity: 0.7,
    })
  );
  table.position.y = -1.6;
  table.receiveShadow = true;
  labGroup.add(table);

  // Table glow edge
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.015, 0.55),
    new THREE.MeshBasicMaterial({
      color: 0x00bfff,
      transparent: true,
      opacity: 0.05,
    })
  );
  edge.position.y = -1.57;
  labGroup.add(edge);

  // --- Round-bottom flask (boiling) - top ---
  const flaskPos = new THREE.Vector3(-0.1, 1.7, 0);
  const flask = buildRoundFlask(gGlassThick, blueLiquid, 0.55);
  flask.position.copy(flaskPos);
  labGroup.add(flask);

  // --- Erlenmeyer flask (receiving) - bottom right ---
  const erlPos = new THREE.Vector3(0.6, -0.4, -0.1);
  const erl = buildErlenmeyer(gGlassThick, purpleLiquid, 0.45);
  erl.position.copy(erlPos);
  labGroup.add(erl);

  // --- Condenser - middle ---
  const cond = buildCondenser(gGlass);
  cond.position.set(0.45, 0.65, 0.05);
  cond.rotation.z = -0.15;
  cond.scale.set(1, 0.9, 1);
  labGroup.add(cond);

  // --- Distillation arm: flask neck -> condenser ---
  const arm1 = buildTube(
    new THREE.Vector3(flaskPos.x + 0.1, flaskPos.y + 0.7, 0),
    new THREE.Vector3(0.45, 1.05, 0.05),
    gGlassThin
  );
  labGroup.add(arm1);

  // --- Distillation arm: condenser -> Erlenmeyer ---
  const arm2 = buildTube(
    new THREE.Vector3(0.45, 0.25, 0.05),
    new THREE.Vector3(erlPos.x + 0.08, erlPos.y + 0.45, -0.1),
    gGlassThin
  );
  labGroup.add(arm2);

  // --- Beaker - left side ---
  const beakerPos = new THREE.Vector3(-0.85, -0.45, 0);
  const beaker = buildBeaker(gGlass, cyanLiquid, 0.5);
  beaker.position.copy(beakerPos);
  labGroup.add(beaker);

  // --- Test tubes - right side ---
  const tubePositions = [
    new THREE.Vector3(1.0, -0.85, 0.15),
    new THREE.Vector3(1.1, -1.2, -0.1),
    new THREE.Vector3(0.95, -1.55, 0.1),
  ];
  const tubeLiquids = [greenLiquid, cyanLiquid, purpleLiquid];
  tubePositions.forEach((p, i) => {
    const t = buildTestTube(gGlass, tubeLiquids[i], 0.4 + i * 0.1);
    t.position.copy(p);
    t.scale.set(1, 1, 1);
    labGroup.add(t);
  });

  // --- Bubbles ---
  const bubbleSources = [
    { pos: new THREE.Vector3(flaskPos.x, flaskPos.y - 0.2, 0), color: 0x4488ff, count: 6 },
    { pos: new THREE.Vector3(erlPos.x, erlPos.y - 0.1, -0.1), color: 0xaa66ff, count: 5 },
    { pos: new THREE.Vector3(beakerPos.x, beakerPos.y - 0.1, 0), color: 0x44ddff, count: 4 },
  ];

  bubbleSources.forEach(src => {
    for (let i = 0; i < src.count; i++) {
      const r = 0.008 + Math.random() * 0.015;
      const b = new THREE.Mesh(
        new THREE.SphereGeometry(r, 8, 8),
        new THREE.MeshPhysicalMaterial({
          color: src.color,
          transparent: true,
          opacity: 0.3 + Math.random() * 0.2,
          emissive: src.color,
          emissiveIntensity: 0.5,
          roughness: 0,
          metalness: 0,
        })
      );
      b.position.set(
        src.pos.x + (Math.random() - 0.5) * 0.3,
        src.pos.y + Math.random() * 0.1,
        src.pos.z + (Math.random() - 0.5) * 0.2
      );
      b.userData = {
        source: src.pos.clone(),
        speed: 0.2 + Math.random() * 0.3,
        offsetX: (Math.random() - 0.5) * 0.3,
        offsetZ: (Math.random() - 0.5) * 0.2,
        phase: Math.random() * Math.PI * 2,
        height: 0.2 + Math.random() * 0.3,
        baseY: src.pos.y + Math.random() * 0.1,
      };
      labGroup.add(b);
      bubbles.push(b);
    }
  });

  // Neon glow spheres (invisible, for light)
  const glowSphereMat = new THREE.MeshBasicMaterial({
    color: 0x0066ff,
    transparent: true,
    opacity: 0.03,
  });
  const gs1 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), glowSphereMat);
  gs1.position.set(flaskPos.x, flaskPos.y, 0);
  labGroup.add(gs1);
  const gs2 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), glowSphereMat);
  gs2.material = new THREE.MeshBasicMaterial({ color: 0x8844ff, transparent: true, opacity: 0.03 });
  gs2.position.set(erlPos.x, erlPos.y, -0.1);
  labGroup.add(gs2);

  scene.add(labGroup);

  // Glow point lights (separate from group so they don't move with float)
  const pBlue = new THREE.PointLight(0x0055ff, 0.5, 3);
  pBlue.position.set(-0.1, 1.7, 0.5);
  scene.add(pBlue);
  const pPurple = new THREE.PointLight(0x7733dd, 0.4, 3);
  pPurple.position.set(0.6, -0.4, 0.5);
  scene.add(pPurple);
  const pCyan = new THREE.PointLight(0x00bbff, 0.25, 2);
  pCyan.position.set(-0.85, -0.45, 0.5);
  scene.add(pCyan);
}

function createParticles() {
  const count = 120;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const data = [];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 3.5;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 5 + 0.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
    const c = new THREE.Color().setHSL(0.55 + Math.random() * 0.15, 0.6, 0.4 + Math.random() * 0.3);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
    sizes[i] = 0.005 + Math.random() * 0.015;
    data.push({
      vx: (Math.random() - 0.5) * 0.002,
      vy: (Math.random() - 0.5) * 0.002,
      vz: (Math.random() - 0.5) * 0.002,
      phase: Math.random() * Math.PI * 2,
    });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const mat = new THREE.PointsMaterial({
    size: 0.015,
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  particles = new THREE.Points(geo, mat);
  particles.userData.data = data;
  scene.add(particles);
}

// --- Animation ---
function animate() {
  requestAnimationFrame(animate);
  time += 0.01;

  if (labGroup) {
    const floatY = Math.sin(time * 0.5) * 0.03;
    const floatX = Math.sin(time * 0.3) * 0.015;
    const rotZ = Math.sin(time * 0.4) * 0.005;
    labGroup.position.y = floatY;
    labGroup.position.x = floatX;
    labGroup.rotation.z = rotZ;
  }

  // Bubbles
  bubbles.forEach(b => {
    const { source, speed, offsetX, offsetZ, phase, height, baseY } = b.userData;
    const t = time * speed + phase;
    const yOff = (Math.sin(t) * 0.5 + 0.5) * height;
    b.position.y = baseY + yOff;
    b.position.x = source.x + offsetX + Math.sin(t * 0.7 + phase) * 0.02;
    b.position.z = source.z + offsetZ + Math.cos(t * 0.5 + phase) * 0.02;
    const scale = 0.5 + (Math.sin(t) * 0.5 + 0.5) * 0.5;
    b.scale.setScalar(scale);
    b.material.opacity = 0.2 + (Math.sin(t) * 0.5 + 0.5) * 0.3;
  });

  // Particles
  if (particles) {
    const pos = particles.geometry.attributes.position.array;
    const data = particles.userData.data;
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      pos[i * 3] += d.vx + Math.sin(time + d.phase) * 0.0003;
      pos[i * 3 + 1] += d.vy + Math.cos(time * 0.7 + d.phase) * 0.0003;
      pos[i * 3 + 2] += d.vz + Math.sin(time * 0.5 + d.phase) * 0.0002;
      if (pos[i * 3] > 2) pos[i * 3] = -2;
      if (pos[i * 3] < -2) pos[i * 3] = 2;
      if (pos[i * 3 + 1] > 3.5) pos[i * 3 + 1] = -2;
      if (pos[i * 3 + 1] < -2.5) pos[i * 3 + 1] = 3.5;
    }
    particles.geometry.attributes.position.needsUpdate = true;
  }

  renderer.render(scene, camera);
}

function onResize() {
  W = container.clientWidth;
  H = container.clientHeight;
  if (W === 0 || H === 0) return;
  const aspect = W / H;
  const viewHeight = 6.5;
  const viewWidth = viewHeight * aspect;
  camera.left = -viewWidth / 2;
  camera.right = viewWidth / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(W, H);
}

init();
