// Course Landing scripts

const hasGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;
const animate = hasGsap && !reduceMotion;

if (animate) {
  document.documentElement.classList.add("js-gsap");
  gsap.registerPlugin(ScrollTrigger);
  // Always start at the top so the scroll-driven hero isn't half-played on reload
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
}

// ---------- Smooth scroll (Lenis) ----------
let lenis = null;
if (animate && typeof Lenis !== "undefined") {
  lenis = new Lenis({ lerp: 0.09 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    const id = link.getAttribute("href");
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: id === "#top" ? 0 : -80, duration: 1.6 });
    else target.scrollIntoView({ behavior: "smooth" });
  });
});

// ---------- Text splitting ----------
// Wraps every character in a span, keeping nested tags (like <em>) intact.
function splitChars(el) {
  const chars = [];
  function walk(node) {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
          const word = document.createElement("span");
          word.className = "word";
          [...part].forEach((ch) => {
            const c = document.createElement("span");
            c.className = "char";
            c.textContent = ch;
            word.appendChild(c);
            chars.push(c);
          });
          frag.appendChild(word);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  }
  walk(el);
  return chars;
}

function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map((w) => `<span class="fill-word">${w}</span>`).join(" ");
  return el.querySelectorAll(".fill-word");
}

// ---------- Header ----------
const header = document.querySelector(".header");
let lastY = 0;
window.addEventListener("scroll", () => {
  const y = window.scrollY;
  header.classList.toggle("is-scrolled", y > 40);
  header.classList.toggle("is-hidden", y > lastY && y > 400 && !header.classList.contains("menu-open"));
  lastY = y;
}, { passive: true });

// ---------- Mobile menu ----------
const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("nav");
function setMenu(open) {
  nav.classList.toggle("is-open", open);
  header.classList.toggle("menu-open", open);
  menuToggle.setAttribute("aria-expanded", open);
  if (lenis) open ? lenis.stop() : lenis.start();
  else document.body.style.overflow = open ? "hidden" : "";
}
menuToggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

// ---------- Scroll reveal ----------
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach((el) => {
  // Stagger siblings inside the same parent
  const index = [...el.parentElement.children].indexOf(el);
  el.style.transitionDelay = `${Math.min(index, 5) * 0.08}s`;
  revealObserver.observe(el);
});

// ---------- Count-up stats ----------
const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = +el.dataset.count;
    const start = performance.now();
    const duration = 1600;
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    countObserver.unobserve(el);
  });
}, { threshold: 0.5 });
document.querySelectorAll("[data-count]").forEach((el) => countObserver.observe(el));

// ---------- Hero 3D globe (Three.js) ----------
const GLOBE_MARKERS = [
  { lat: 40, lon: -74, label: "Design", icon: 3 },
  { lat: 51, lon: 0, label: "Courses", icon: 1 },
  { lat: 28, lon: 77, label: "Code", icon: 4 },
  { lat: 35, lon: 139, label: "Ideas", icon: 2 },
  { lat: -33, lon: 151, label: "Certificate", icon: 0 },
  { lat: -23, lon: -46, label: "Live Classes", icon: 5 },
  { lat: 1, lon: 103, label: "Launch", icon: 6 },
  { lat: 6, lon: 3, label: "Top Rated", icon: 7 },
];
const GLOBE_ARCS = [[0, 1], [1, 2], [2, 3], [3, 6], [6, 4], [5, 0], [7, 1], [7, 5], [2, 6]];

function latLonToVec(lat, lon, r) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function dotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  g.beginPath();
  g.arc(32, 32, 28, 0, Math.PI * 2);
  g.fillStyle = "#fff";
  g.fill();
  return new THREE.CanvasTexture(c);
}

function initHero3D() {
  const hero = document.querySelector(".hero");
  const canvas = document.getElementById("heroCanvas");
  const markerLayer = document.getElementById("heroMarkers");
  const cursorRing = document.querySelector(".cursor-ring");
  const small = window.innerWidth < 640;
  const ACCENT = 0x01565b;
  const LIME = 0xcbeb3a;
  const INK = 0x181818;
  const R = 1.6;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.z = 9;
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 0.5);
  key.position.set(-3, 4, 5);
  scene.add(key);

  // world (mouse parallax + column offset) > root (scale) > tilt (drag X) > spin (drag/auto Y)
  const world = new THREE.Group();
  const root = new THREE.Group();
  const tilt = new THREE.Group();
  const spin = new THREE.Group();
  scene.add(world);
  world.add(root);
  root.add(tilt);
  tilt.add(spin);
  tilt.rotation.x = 0.35;

  // Solid core hides the dots on the far side
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.985, 64, 64),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })
  );
  spin.add(core);

  // Dotted "continents": Fibonacci-sphere points filtered by a smooth pseudo-noise
  const total = small ? 5000 : 9000;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const dotPositions = [];
  for (let i = 0; i < total; i++) {
    const y = 1 - (i / (total - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = i * golden;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const lat = Math.asin(y);
    const lon = Math.atan2(z, x);
    const land = Math.sin(lon * 1.5 + 0.5) * Math.cos(lat * 2)
      + 0.5 * Math.sin(lon * 3.1 - lat * 2.7 + 1.3)
      + 0.3 * Math.cos(lon * 6.3 + lat * 5.1);
    if (land > 0.2 && Math.abs(lat) < 1.35) dotPositions.push(x * R, y * R, z * R);
  }
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute("position", new THREE.Float32BufferAttribute(dotPositions, 3));
  spin.add(new THREE.Points(dotGeo, new THREE.PointsMaterial({
    size: 0.045, map: dotTexture(), color: INK, transparent: true, alphaTest: 0.5,
  })));

  // Faint latitude / longitude grid
  const gridMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.08 });
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = [];
    for (let lon = 0; lon < 360; lon += 6) pts.push(latLonToVec(lat, lon, R * 1.002));
    spin.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
  }
  for (let lon = 0; lon < 180; lon += 30) {
    const pts = [];
    const l = THREE.MathUtils.degToRad(lon);
    for (let d = 0; d < 360; d += 6) {
      const t = THREE.MathUtils.degToRad(d);
      pts.push(new THREE.Vector3(Math.cos(t) * Math.cos(l), Math.sin(t), Math.cos(t) * Math.sin(l)).multiplyScalar(R * 1.002));
    }
    spin.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
  }

  // Soft orange rim glow
  root.add(new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.12, 64, 64),
    new THREE.ShaderMaterial({
      uniforms: { glow: { value: new THREE.Color(ACCENT) } },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 glow;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float f = pow(1.0 - abs(dot(vNormal, vView)), 3.0);
          gl_FragColor = vec4(glow, f * 0.55);
        }`,
      transparent: true,
      depthWrite: false,
    })
  ));

  // Orbit rings, each carrying a small satellite
  const rings = [
    { radius: R * 1.32, color: LIME, opacity: 1, rot: [1.15, 0.35, 0], speed: 0.35 },
    { radius: R * 1.5, color: ACCENT, opacity: 0.3, rot: [1.9, -0.5, 0], speed: -0.22 },
  ].map((def) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(def.radius, 0.006, 8, 200),
      new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: def.opacity })
    );
    ring.rotation.set(...def.rot);
    const sat = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), new THREE.MeshStandardMaterial({ color: def.color }));
    sat.position.x = def.radius;
    ring.add(sat);
    root.add(ring);
    return { ring, speed: def.speed };
  });

  // Markers: pin + pulse ring in 3D, label badge in HTML
  const pinMat = new THREE.MeshBasicMaterial({ color: ACCENT });
  const markers = GLOBE_MARKERS.map((m, i) => {
    const p = latLonToVec(m.lat, m.lon, R * 1.01);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), pinMat);
    pin.position.copy(p);
    const pulse = new THREE.Mesh(
      new THREE.RingGeometry(0.05, 0.068, 32),
      new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, side: THREE.DoubleSide })
    );
    pulse.position.copy(p);
    pulse.lookAt(p.clone().multiplyScalar(2));
    spin.add(pin, pulse);

    const [bg, fg] = HERO_ICON_COLORS[i % HERO_ICON_COLORS.length];
    const tag = document.createElement("div");
    tag.className = "globe-tag";
    tag.style.setProperty("--bg", bg);
    tag.style.setProperty("--fg", fg);
    tag.innerHTML = `<span class="globe-tag__icon">${HERO_ICONS[m.icon]}</span><span>${m.label}</span>`;
    markerLayer.appendChild(tag);
    return { pin, pulse, tag, phase: i * 0.37 };
  });

  // Arcs between markers with a pulse travelling along each
  const arcMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.55 });
  const travelerGeo = new THREE.SphereGeometry(0.028, 12, 12);
  const arcs = GLOBE_ARCS.map(([a, b], i) => {
    const va = latLonToVec(GLOBE_MARKERS[a].lat, GLOBE_MARKERS[a].lon, R * 1.01);
    const vb = latLonToVec(GLOBE_MARKERS[b].lat, GLOBE_MARKERS[b].lon, R * 1.01);
    const lift = 1 + va.distanceTo(vb) * 0.28;
    const mid = va.clone().add(vb).normalize().multiplyScalar(R * lift);
    const curve = new THREE.QuadraticBezierCurve3(va, mid, vb);
    spin.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(64)), arcMat));
    const traveler = new THREE.Mesh(travelerGeo, pinMat);
    spin.add(traveler);
    return { curve, traveler, offset: i * 0.19 };
  });

  // Values driven by the intro (intro, markersIn), scroll (scatter, center, size) and mouse (tx/ty)
  const state = {
    intro: 0, markersIn: 0, size: 1, scatter: 0, center: 0,
    offsetX: 0, mx: 0, my: 0, tx: 0, ty: 0,
  };
  window.addEventListener("mousemove", (e) => {
    state.tx = e.clientX / window.innerWidth - 0.5;
    state.ty = e.clientY / window.innerHeight - 0.5;
  });

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Push the globe into the right-hand column on wide screens
    const halfWidth = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 9 * camera.aspect;
    state.offsetX = w > 960 ? halfWidth * 0.58 : 0;
    world.scale.setScalar(w > 640 ? 1 : 0.75);
  }
  resize();
  window.addEventListener("resize", resize);

  // Drag to rotate (with momentum); only starts when the press lands on the globe
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let dragging = false;
  let overGlobe = false;
  let lastX = 0, lastY = 0, velY = 0, velX = 0;

  function hitsGlobe(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(core).length > 0;
  }
  function setOverGlobe(v) {
    if (v === overGlobe) return;
    overGlobe = v;
    hero.classList.toggle("is-over-globe", v);
    if (cursorRing) {
      cursorRing.classList.toggle("is-view", v);
      cursorRing.querySelector("span").textContent = v ? "Drag" : "View";
    }
  }

  hero.addEventListener("pointerdown", (e) => {
    if (e.target.closest("a, button") || window.scrollY > 10 || !hitsGlobe(e)) return;
    e.preventDefault();
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    velX = velY = 0;
    hero.classList.add("is-dragging");
    hero.setPointerCapture(e.pointerId);
  });
  hero.addEventListener("pointermove", (e) => {
    if (dragging) {
      velY = (e.clientX - lastX) * 0.006;
      velX = (e.clientY - lastY) * 0.006;
      spin.rotation.y += velY;
      tilt.rotation.x = THREE.MathUtils.clamp(tilt.rotation.x + velX, -0.9, 0.9);
      lastX = e.clientX;
      lastY = e.clientY;
    } else if (e.pointerType === "mouse") {
      setOverGlobe(window.scrollY < 10 && hitsGlobe(e));
    }
  });
  const endDrag = () => {
    dragging = false;
    hero.classList.remove("is-dragging");
  };
  hero.addEventListener("pointerup", endDrag);
  hero.addEventListener("pointercancel", endDrag);
  hero.addEventListener("pointerleave", () => setOverGlobe(false));

  const tmp = new THREE.Vector3();
  const center = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const toCam = new THREE.Vector3();
  let active = true;

  gsap.ticker.add((time) => {
    if (!active) return;

    // Spin: auto-rotate plus momentum from the last drag
    if (!dragging) {
      spin.rotation.y += 0.0025 * (1 + state.scatter * 10) + velY;
      tilt.rotation.x = THREE.MathUtils.clamp(tilt.rotation.x + velX, -0.9, 0.9);
      velY *= 0.95;
      velX *= 0.9;
    }

    state.mx += (state.tx - state.mx) * 0.05;
    state.my += (state.ty - state.my) * 0.05;
    world.rotation.y = state.mx * 0.25;
    world.rotation.x = state.my * 0.15;
    world.position.x = state.offsetX * (1 - state.center);
    root.scale.setScalar(Math.max(state.intro * state.size, 0.001));

    rings.forEach(({ ring, speed }) => { ring.rotation.z = time * speed; });

    arcs.forEach(({ curve, traveler, offset }) => {
      curve.getPoint((time * 0.25 + offset) % 1, traveler.position);
    });

    // Project each marker to screen; fade tags on the far side of the globe
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    root.getWorldPosition(center);
    markers.forEach((m) => {
      const t = (time * 0.8 + m.phase) % 1;
      m.pulse.scale.setScalar(1 + t * 2.2);
      m.pulse.material.opacity = 1 - t;

      m.pin.getWorldPosition(tmp);
      normal.copy(tmp).sub(center).normalize();
      toCam.copy(camera.position).sub(tmp).normalize();
      const facing = normal.dot(toCam);
      const vis = THREE.MathUtils.smoothstep(facing, 0.05, 0.35) * state.markersIn * (1 - state.scatter);
      tmp.project(camera);
      const sx = (tmp.x * 0.5 + 0.5) * w;
      const sy = (-tmp.y * 0.5 + 0.5) * h;
      m.tag.style.opacity = vis.toFixed(3);
      m.tag.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -135%) scale(${(0.6 + 0.4 * vis).toFixed(3)})`;
    });

    renderer.render(scene, camera);
  });

  return {
    camera,
    state,
    isBusy: () => dragging || overGlobe,
    setActive: (v) => { active = v; },
  };
}

// ---------- Hero hover: letters scatter away from the cursor, learning icons pop out ----------
const HERO_ICONS = [
  '<svg viewBox="0 0 24 24"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/><path d="M22 9v5"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M4 4h6a3 3 0 0 1 2 1 3 3 0 0 1 2-1h6v15h-6a2 2 0 0 0-2 2 2 2 0 0 0-2-2H4z"/><path d="M12 5v16"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M4 20l4-1L19 8l-3-3L5 16z"/><path d="M14 7l3 3"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/></svg>',
  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M12 3c4 2 6 6 5 11l-3 3h-4l-3-3c-1-5 1-9 5-11z"/><circle cx="12" cy="10" r="2"/><path d="M9 18l-2 3M15 18l2 3"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
  '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M10 17h4"/></svg>',
];
const HERO_ICON_COLORS = [
  ["#01565b", "#cbeb3a"], ["#cbeb3a", "#01565b"], ["#181818", "#cbeb3a"],
  ["#013f43", "#ffffff"], ["#a7d8d0", "#013f43"], ["#ffffff", "#01565b"],
];

function initHeroHover(chars, isBusy) {
  const hero = document.querySelector(".hero");
  const layer = document.createElement("div");
  layer.className = "hero__icons";
  hero.appendChild(layer);

  const movers = chars.map((el) => ({
    el,
    x: gsap.quickTo(el, "x", { duration: 0.7, ease: "power3" }),
    y: gsap.quickTo(el, "y", { duration: 0.7, ease: "power3" }),
    r: gsap.quickTo(el, "rotation", { duration: 0.7, ease: "power3" }),
  }));
  const radius = 220;
  let enabled = false;
  let scattered = false;
  let lastSpawn = 0, lastX = 0, lastY = 0;

  function reset() {
    if (!scattered) return;
    scattered = false;
    movers.forEach((m) => { m.x(0); m.y(0); m.r(0); });
  }

  function spawnIcon(clientX, clientY) {
    const box = hero.getBoundingClientRect();
    const [bg, fg] = HERO_ICON_COLORS[Math.floor(Math.random() * HERO_ICON_COLORS.length)];
    const el = document.createElement("span");
    el.className = "hero-icon";
    el.style.setProperty("--bg", bg);
    el.style.setProperty("--fg", fg);
    el.style.left = `${clientX - box.left}px`;
    el.style.top = `${clientY - box.top}px`;
    el.innerHTML = HERO_ICONS[Math.floor(Math.random() * HERO_ICONS.length)];
    layer.appendChild(el);
    gsap.timeline({ onComplete: () => el.remove() })
      .fromTo(el, { scale: 0, rotation: gsap.utils.random(-120, 120) },
        { scale: 1, rotation: gsap.utils.random(-25, 25), duration: 0.5, ease: "back.out(3)" })
      .to(el, { x: gsap.utils.random(-140, 140), y: gsap.utils.random(-220, -80), duration: 1.5, ease: "power2.out" }, 0)
      .to(el, { opacity: 0, scale: 0.5, duration: 0.45, ease: "power2.in" }, 1.05);
  }

  hero.addEventListener("mousemove", (e) => {
    if (!enabled || window.scrollY > 10) return;
    // Leave the letters alone while the globe is being hovered or dragged
    if (isBusy && isBusy()) { reset(); return; }
    scattered = true;
    movers.forEach((m) => {
      const r = m.el.getBoundingClientRect();
      const cx = r.left + r.width / 2 - gsap.getProperty(m.el, "x");
      const cy = r.top + r.height / 2 - gsap.getProperty(m.el, "y");
      const dx = cx - e.clientX;
      const dy = cy - e.clientY;
      const d = Math.hypot(dx, dy) || 1;
      const force = Math.max(0, 1 - d / radius) ** 1.5;
      m.x((dx / d) * force * 160);
      m.y((dy / d) * force * 160);
      m.r(force * (dx > 0 ? 35 : -35));
    });

    const now = performance.now();
    if (now - lastSpawn > 80 && Math.hypot(e.clientX - lastX, e.clientY - lastY) > 40) {
      spawnIcon(e.clientX, e.clientY);
      lastSpawn = now;
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });
  hero.addEventListener("mouseleave", reset);
  window.addEventListener("scroll", () => { if (window.scrollY > 10) reset(); }, { passive: true });

  return { enable: () => { enabled = true; } };
}

// ---------- GSAP animations ----------
if (animate) {
  // Preloader, then hero intro
  const preloader = document.getElementById("preloader");
  const countEl = document.getElementById("preloaderCount");
  const heroChars = splitChars(document.querySelector(".hero__title"));
  const counter = { v: 0 };
  if (lenis) lenis.stop();

  let hero3d = null;
  if (typeof THREE !== "undefined") {
    try { hero3d = initHero3D(); } catch (err) { console.warn("WebGL hero disabled:", err); }
  }
  const heroHover = finePointer ? initHeroHover(heroChars, hero3d && hero3d.isBusy) : null;

  const intro = gsap.timeline()
    .to(counter, {
      v: 100, duration: 1.6, ease: "power2.inOut",
      onUpdate: () => { countEl.textContent = Math.round(counter.v); },
    })
    .to(preloader, { yPercent: -100, duration: 1, ease: "expo.inOut" })
    .from(heroChars, { yPercent: 120, rotate: 8, duration: 1.1, stagger: 0.025, ease: "expo.out" }, "-=0.45")
    .from(".hero-fade", { y: 60, opacity: 0, duration: 1, stagger: 0.12, ease: "expo.out" }, "-=0.9")
    .add(() => {
      preloader.remove();
      document.querySelector(".hero__title").classList.add("is-in");
      if (heroHover) heroHover.enable();
      if (lenis) lenis.start();
    });
  if (hero3d) {
    intro.to(hero3d.state, { intro: 1, duration: 1.6, ease: "elastic.out(1, 0.5)" }, 2.4);
    intro.to(hero3d.state, { markersIn: 1, duration: 1.2, ease: "power2.out" }, 3);
  }

  // Hero scroll: pinned while letters fly apart in 3D and the camera dives into the globe
  const heroScroll = gsap.timeline({
    defaults: { ease: "none", immediateRender: false },
    scrollTrigger: { trigger: ".hero", start: "top top", end: "+=140%", scrub: 1, pin: true },
  });
  heroScroll
    .fromTo(heroChars,
      { xPercent: 0, yPercent: 0, rotateX: 0, rotateY: 0, opacity: 1 },
      {
        xPercent: () => gsap.utils.random(-400, 400),
        yPercent: () => gsap.utils.random(-500, 300),
        rotateX: () => gsap.utils.random(-360, 360),
        rotateY: () => gsap.utils.random(-360, 360),
        transformPerspective: 600,
        opacity: 0,
        stagger: { each: 0.01, from: "random" },
        duration: 0.6,
      }, 0)
    .fromTo(".hero__bottom, .hero__scroll", { y: 0, opacity: 1 }, { y: -80, opacity: 0, duration: 0.3 }, 0);
  if (hero3d) {
    const { camera, state } = hero3d;
    heroScroll
      .fromTo(state, { scatter: 0, center: 0 }, { scatter: 1, center: 1, duration: 0.6 }, 0)
      .fromTo(camera.position, { z: 9 }, { z: 6, duration: 1 }, 0)
      .fromTo(state, { size: 1 }, { size: 3.4, duration: 0.6 }, 0.35)
      .fromTo("#heroCanvas", { opacity: 1 }, { opacity: 0, duration: 0.25 }, 0.75);

    // Stop rendering once the hero is fully scrolled past
    ScrollTrigger.create({
      trigger: ".hero", start: "top bottom",
      endTrigger: ".why", end: "top top",
      onToggle: (self) => hero3d.setActive(self.isActive),
    });
  }

  // Hero title tilts toward the mouse
  if (finePointer) {
    const tiltX = gsap.quickTo(".hero__title", "rotateY", { duration: 0.8, ease: "power3" });
    const tiltY = gsap.quickTo(".hero__title", "rotateX", { duration: 0.8, ease: "power3" });
    gsap.set(".hero__title", { transformPerspective: 1200 });
    window.addEventListener("mousemove", (e) => {
      tiltX((e.clientX / window.innerWidth - 0.5) * 8);
      tiltY((e.clientY / window.innerHeight - 0.5) * -6);
    });
  }

  // Section titles: chars rise in when they scroll into view
  document.querySelectorAll(".section__title[data-split]").forEach((title) => {
    const chars = splitChars(title);
    gsap.from(chars, {
      yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.018, ease: "expo.out",
      scrollTrigger: { trigger: title, start: "top 85%" },
    });
  });

  // Marquees: constant loop, speed and direction react to scroll velocity
  document.querySelectorAll(".marquee").forEach((marquee) => {
    const reverse = marquee.hasAttribute("data-reverse");
    const loop = gsap.fromTo(marquee.querySelector(".marquee__track"),
      { xPercent: reverse ? -50 : 0 },
      { xPercent: reverse ? 0 : -50, duration: 20, ease: "none", repeat: -1 });
    // Start deep into the repeats so playing backwards never hits the start
    loop.totalTime(loop.duration() * 1000);
    ScrollTrigger.create({
      trigger: marquee, start: "top bottom", end: "bottom top",
      onUpdate: (self) => {
        const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 300, 5);
        gsap.to(loop, { timeScale: self.direction * boost, duration: 0.2, overwrite: true });
        gsap.to(loop, { timeScale: self.direction, duration: 1, delay: 0.2 });
      },
    });
  });

  // Reel: clip-path opens up as it scrolls in
  gsap.fromTo(".why__reel",
    { clipPath: "inset(25% 20% 25% 20% round 40px)" },
    {
      clipPath: "inset(0% 0% 0% 0% round 20px)", ease: "none",
      scrollTrigger: { trigger: ".why__reel", start: "top 90%", end: "center 50%", scrub: true },
    });
  gsap.fromTo(".why__reel-inner", { scale: 1.4 }, {
    scale: 1, ease: "none",
    scrollTrigger: { trigger: ".why__reel", start: "top bottom", end: "bottom top", scrub: true },
  });

  // About: words fill in one by one while scrolling
  const fillWords = splitWords(document.querySelector("[data-words]"));
  gsap.to(fillWords, {
    opacity: 1, stagger: 0.1, ease: "none",
    scrollTrigger: { trigger: ".about__lead", start: "top 80%", end: "bottom 45%", scrub: true },
  });

  const mm = gsap.matchMedia();

  // Modules: pinned horizontal scroll on desktop
  mm.add("(min-width: 961px)", () => {
    const track = document.querySelector(".works__track");
    const distance = () => track.scrollWidth - window.innerWidth;
    const scroller = gsap.to(track, {
      x: () => -distance(), ease: "none",
      scrollTrigger: {
        trigger: ".works", pin: ".works__pin", start: "top top",
        end: () => `+=${distance()}`, scrub: 1, invalidateOnRefresh: true,
      },
    });
    // Inner image parallax while the track moves
    document.querySelectorAll(".work__fill").forEach((fill) => {
      gsap.fromTo(fill, { xPercent: -15 }, {
        xPercent: 15, ease: "none",
        scrollTrigger: {
          trigger: fill.parentElement, containerAnimation: scroller,
          start: "left right", end: "right left", scrub: true,
        },
      });
    });
  });

  // Curriculum: stacked sticky cards, each one shrinks as the next covers it
  const cards = gsap.utils.toArray(".service");
  cards.forEach((card, i) => {
    const next = cards[i + 1];
    if (!next) return;
    gsap.to(card, {
      scale: 0.9, opacity: 0.5, ease: "none",
      scrollTrigger: { trigger: next, start: "top bottom", end: "top 20%", scrub: true },
    });
  });

  // Process: line draws across
  gsap.to(".process__line span", {
    scaleX: 1, ease: "none",
    scrollTrigger: { trigger: ".process", start: "top 70%", end: "bottom 70%", scrub: true },
  });

  // Big text rows slide in opposite directions
  gsap.fromTo(".bigtext__row--1", { xPercent: 0 }, {
    xPercent: -35, ease: "none",
    scrollTrigger: { trigger: ".bigtext", start: "top bottom", end: "bottom top", scrub: true },
  });
  gsap.fromTo(".bigtext__row--2", { xPercent: -35 }, {
    xPercent: 0, ease: "none",
    scrollTrigger: { trigger: ".bigtext", start: "top bottom", end: "bottom top", scrub: true },
  });

  // CTA: title zooms up to full size
  gsap.fromTo(".cta__title", { scale: 0.55, opacity: 0.3 }, {
    scale: 1, opacity: 1, ease: "none",
    scrollTrigger: { trigger: ".cta", start: "top bottom", end: "center center", scrub: true },
  });

  // Footer: giant logo rises
  gsap.from(".footer__big", {
    yPercent: 60, opacity: 0, ease: "none",
    scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: true },
  });

  // Recalculate once fonts have loaded (they change text widths)
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}

// ---------- Custom cursor + magnetic buttons ----------
if (animate && finePointer) {
  document.documentElement.classList.add("has-cursor");
  const dot = document.querySelector(".cursor");
  const ring = document.querySelector(".cursor-ring");
  const dotX = gsap.quickTo(dot, "x", { duration: 0.1 });
  const dotY = gsap.quickTo(dot, "y", { duration: 0.1 });
  const ringX = gsap.quickTo(ring, "x", { duration: 0.5, ease: "power3" });
  const ringY = gsap.quickTo(ring, "y", { duration: 0.5, ease: "power3" });

  window.addEventListener("mousemove", (e) => {
    dotX(e.clientX); dotY(e.clientY);
    ringX(e.clientX); ringY(e.clientY);
  });

  document.querySelectorAll("a, button, .tab, input, textarea, label").forEach((el) => {
    el.addEventListener("mouseenter", () => ring.classList.add("is-hover"));
    el.addEventListener("mouseleave", () => ring.classList.remove("is-hover"));
  });
  document.querySelectorAll('[data-cursor="view"]').forEach((el) => {
    el.addEventListener("mouseenter", () => {
      ring.querySelector("span").textContent = "View";
      ring.classList.add("is-view");
    });
    el.addEventListener("mouseleave", () => ring.classList.remove("is-view"));
  });

  document.querySelectorAll(".magnetic").forEach((el) => {
    const x = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const y = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.35);
      y((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener("mouseleave", () => { x(0); y(0); });
  });
}

// ---------- Pricing tabs ----------
const tabs = document.querySelectorAll(".tab");
const pill = document.querySelector(".tabs__pill");
const panels = document.querySelectorAll(".plans");
function movePill(tab) {
  pill.style.width = `${tab.offsetWidth}px`;
  pill.style.transform = `translateX(${tab.offsetLeft - 6}px)`;
}
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.toggle("is-active", t === tab));
    panels.forEach((p) => p.classList.toggle("is-active", p.dataset.panel === tab.dataset.tab));
    movePill(tab);
    if (animate) ScrollTrigger.refresh();
  });
});
movePill(document.querySelector(".tab.is-active"));
window.addEventListener("resize", () => movePill(document.querySelector(".tab.is-active")));

// ---------- Modals ----------
function openModal(modal) {
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  if (lenis) lenis.stop();
  else document.body.style.overflow = "hidden";
}
function closeModal(modal) {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  if (lenis) lenis.start();
  else document.body.style.overflow = "";
}
const videoModal = document.getElementById("videoModal");
const formModal = document.getElementById("formModal");
document.getElementById("playBtn").addEventListener("click", () => openModal(videoModal));
document.querySelectorAll("[data-open-form]").forEach((btn) =>
  btn.addEventListener("click", (e) => { e.preventDefault(); openModal(formModal); })
);
document.querySelectorAll(".modal [data-close]").forEach((el) =>
  el.addEventListener("click", () => closeModal(el.closest(".modal")))
);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.querySelectorAll(".modal.is-open").forEach(closeModal);
});

// Enroll form (dummy submit)
document.getElementById("enrollForm").addEventListener("submit", (e) => {
  e.preventDefault();
  e.target.classList.add("is-done");
});
