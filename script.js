// Course Landing scripts

const hasGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;
const animate = hasGsap && !reduceMotion;

if (animate) {
  document.documentElement.classList.add("js-gsap");
  gsap.registerPlugin(ScrollTrigger);
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

// ---------- Hero 3D scene (Three.js) ----------
function initHero3D() {
  const canvas = document.getElementById("heroCanvas");
  const small = window.innerWidth < 640;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.z = 9;

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.PointLight(0x7b6bff, 2.5, 20);
  rim.position.set(-4, -2, 3);
  scene.add(rim);
  const warm = new THREE.PointLight(0xffc44d, 1.6, 20);
  warm.position.set(4, -3, 2);
  scene.add(warm);

  const world = new THREE.Group();
  scene.add(world);

  // Morphing blob: sphere whose vertices are pushed by layered sine waves
  const segments = small ? 64 : 128;
  const blobGeo = new THREE.SphereGeometry(1.5, segments, segments);
  const basePos = blobGeo.attributes.position.array.slice();
  const blob = new THREE.Mesh(blobGeo, new THREE.MeshPhysicalMaterial({
    color: 0xff5b2e, roughness: 0.2, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.2,
  }));
  world.add(blob);

  // Floating shapes around the blob
  const shapeDefs = [
    [new THREE.TorusGeometry(0.55, 0.2, 32, 96), { color: 0x111111, roughness: 0.3, metalness: 0.6 }, [-2.6, 1.4, -0.5]],
    [new THREE.IcosahedronGeometry(0.45, 0), { color: 0x5b5bf7, roughness: 0.4, flatShading: true }, [2.4, 1.6, 0.4]],
    [new THREE.BoxGeometry(0.6, 0.6, 0.6), { color: 0xffc44d, roughness: 0.3 }, [2.2, -1.6, 0.6]],
    [new THREE.TorusKnotGeometry(0.32, 0.11, 128, 16), { color: 0xffffff, roughness: 0.15, metalness: 0.2 }, [-2.2, -1.5, 0.8]],
    [new THREE.SphereGeometry(0.22, 32, 32), { color: 0x111111, roughness: 0.2 }, [0.6, 2.2, 1]],
    [new THREE.OctahedronGeometry(0.3, 0), { color: 0xe9407a, roughness: 0.3, flatShading: true }, [-0.4, -2.3, 1.2]],
  ];
  const shapes = shapeDefs.map(([geo, mat, pos], i) => {
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial(mat));
    mesh.position.set(...pos);
    mesh.userData = { base: new THREE.Vector3(...pos), phase: i * 1.3, spin: 0.2 + Math.random() * 0.4 };
    world.add(mesh);
    return mesh;
  });

  // Values driven by scroll (scatter, center) and mouse (tx/ty)
  const state = { scatter: 0, center: 0, wobble: 0.18, offsetX: 0, mx: 0, my: 0, tx: 0, ty: 0 };
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
    state.offsetX = w > 960 ? 1.8 : 0;
    world.scale.setScalar(w > 640 ? 1 : 0.65);
  }
  resize();
  window.addEventListener("resize", resize);

  const pos = blobGeo.attributes.position;
  let active = true;
  gsap.ticker.add((time) => {
    if (!active) return;
    for (let i = 0; i < pos.count; i++) {
      const x = basePos[i * 3], y = basePos[i * 3 + 1], z = basePos[i * 3 + 2];
      const n = Math.sin(x * 1.8 + time * 1.2) * Math.sin(y * 2.1 + time * 0.9) * Math.sin(z * 1.6 + time * 1.1);
      const k = 1 + n * state.wobble;
      pos.array[i * 3] = x * k;
      pos.array[i * 3 + 1] = y * k;
      pos.array[i * 3 + 2] = z * k;
    }
    pos.needsUpdate = true;
    blobGeo.computeVertexNormals();
    blob.rotation.set(time * 0.1, time * 0.15, 0);

    state.mx += (state.tx - state.mx) * 0.05;
    state.my += (state.ty - state.my) * 0.05;
    world.rotation.y = state.mx * 0.6;
    world.rotation.x = state.my * 0.4;
    world.position.x = state.offsetX * (1 - state.center);

    const spread = 1 + state.scatter * 2.5;
    shapes.forEach((m) => {
      const d = m.userData;
      m.position.set(d.base.x * spread, d.base.y * spread + Math.sin(time + d.phase) * 0.15, d.base.z + state.scatter * 4);
      m.rotation.x += d.spin * 0.01 * (1 + state.scatter * 4);
      m.rotation.y += d.spin * 0.013 * (1 + state.scatter * 4);
    });

    renderer.render(scene, camera);
  });

  return { blob, shapes, camera, state, setActive: (v) => { active = v; } };
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
      if (lenis) lenis.start();
    });
  if (hero3d) {
    intro.from(hero3d.blob.scale, { x: 0, y: 0, z: 0, duration: 1.6, ease: "elastic.out(1, 0.5)" }, 2.4);
    intro.from(hero3d.shapes.map((m) => m.scale), { x: 0, y: 0, z: 0, duration: 1.2, stagger: 0.08, ease: "back.out(2)" }, 2.6);
  }

  // Hero scroll: pinned while letters fly apart in 3D and the blob swallows the screen
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
    const { blob, camera, state } = hero3d;
    heroScroll
      .fromTo(state, { scatter: 0, center: 0, wobble: 0.18 }, { scatter: 1, center: 1, wobble: 0.32, duration: 0.7 }, 0)
      .fromTo(blob.rotation, { z: 0 }, { z: Math.PI, duration: 1 }, 0)
      .fromTo(camera.position, { z: 9 }, { z: 6, duration: 1 }, 0)
      .fromTo(blob.scale, { x: 1, y: 1, z: 1 }, { x: 4, y: 4, z: 4, duration: 0.6 }, 0.4);

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
      tiltX((e.clientX / window.innerWidth - 0.5) * 14);
      tiltY((e.clientY / window.innerHeight - 0.5) * -10);
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
    el.addEventListener("mouseenter", () => ring.classList.add("is-view"));
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
