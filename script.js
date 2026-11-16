// Course Landing scripts

// Header: shrink on scroll, hide when scrolling down
const header = document.querySelector(".header");
let lastY = 0;
window.addEventListener("scroll", () => {
  const y = window.scrollY;
  header.classList.toggle("is-scrolled", y > 40);
  header.classList.toggle("is-hidden", y > lastY && y > 400 && !header.classList.contains("menu-open"));
  lastY = y;
}, { passive: true });

// Mobile menu
const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("nav");
function setMenu(open) {
  nav.classList.toggle("is-open", open);
  header.classList.toggle("menu-open", open);
  menuToggle.setAttribute("aria-expanded", open);
  document.body.style.overflow = open ? "hidden" : "";
}
menuToggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

// Scroll reveal
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

// Count-up stats
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

// Hero cards parallax
const heroCards = document.querySelectorAll(".hero__card");
window.addEventListener("scroll", () => {
  const y = window.scrollY;
  if (y > window.innerHeight * 1.5) return;
  heroCards.forEach((card, i) => {
    card.style.transform = `translateY(${y * (i + 1) * -0.08}px) rotate(${y * (i - 1) * 0.01}deg)`;
  });
}, { passive: true });

// Pricing tabs
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
  });
});
movePill(document.querySelector(".tab.is-active"));
window.addEventListener("resize", () => movePill(document.querySelector(".tab.is-active")));

// Modals
function openModal(modal) {
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeModal(modal) {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
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
