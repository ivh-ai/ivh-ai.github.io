"use strict";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Mobile nav ---------- */
const toggle = document.querySelector(".nav-toggle");
const menu = document.getElementById("nav-menu");

toggle.addEventListener("click", () => {
  const open = menu.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", String(open));
});

menu.addEventListener("click", (e) => {
  if (e.target.matches("a")) {
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }
});

/* ---------- Hero terminal: typed command + output ---------- */
const HERO_CMD = 'claude "introduce ishaan"';
const HERO_LINES = [
  'Reading profile… <span class="ok">done</span>',
  '<span class="hl">Ishaan Hattangady</span> — Customer Success Manager, Austin, Texas.',
  'Designs and ships real, working software in collaboration with AI.',
  '<span class="ok">✔</span> 4 projects compiled below. All of them run.',
];

const typedEl = document.getElementById("typed");
const termOut = document.getElementById("termOut");

function renderTermInstant() {
  typedEl.textContent = HERO_CMD;
  termOut.innerHTML = HERO_LINES.map((l) => `<div class="out">${l}</div>`).join("");
}

if (reduced) {
  renderTermInstant();
} else {
  let ci = 0;
  (function typeCmd() {
    if (ci <= HERO_CMD.length) {
      typedEl.textContent = HERO_CMD.slice(0, ci++);
      setTimeout(typeCmd, 30 + Math.random() * 40);
    } else {
      setTimeout(emitLine, 380);
    }
  })();
  let li = 0;
  function emitLine() {
    if (li < HERO_LINES.length) {
      const d = document.createElement("div");
      d.className = "out";
      d.innerHTML = HERO_LINES[li++];
      termOut.appendChild(d);
      setTimeout(emitLine, 300);
    }
  }
}

/* ---------- Section command headers: type on scroll ---------- */
const cmdlines = document.querySelectorAll(".cmdline[data-cmd]");
function typeCmdline(elP) {
  const target = elP.querySelector(".c");
  const cmd = elP.dataset.cmd;
  if (reduced) {
    target.textContent = cmd;
    return;
  }
  let i = 0;
  (function type() {
    if (i <= cmd.length) {
      target.textContent = cmd.slice(0, i++);
      setTimeout(type, 24);
    }
  })();
}

if (!("IntersectionObserver" in window) || reduced) {
  cmdlines.forEach((el) => (el.querySelector(".c").textContent = el.dataset.cmd));
} else {
  const kio = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          typeCmdline(e.target);
          kio.unobserve(e.target);
        }
      }),
    { threshold: 0.4 }
  );
  cmdlines.forEach((el) => kio.observe(el));
}

/* ---------- Scroll-reveal ---------- */
const revealEls = document.querySelectorAll(".reveal");

if (reduced || !("IntersectionObserver" in window)) {
  revealEls.forEach((el) => el.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => observer.observe(el));
}

/* ---------- Footer year ---------- */
document.getElementById("year").textContent = new Date().getFullYear();
