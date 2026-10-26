import "./style.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { LifeScene, smooth } from "./scene.js";
import {
  PEOPLE,
  CHAPTERS,
  MAX_AGE,
  SCROLL_DISTANCE,
} from "./people.js";

gsap.registerPlugin(ScrollTrigger);
gsap.ticker.lagSmoothing(0);
ScrollTrigger.config({ ignoreMobileResize: true });

const stage = document.querySelector("#stage");
const canvas = document.querySelector("#universe");
const reducedPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const scene = new LifeScene(canvas, reducedPreference.matches);
const cue = document.querySelector("#scroll-cue");
const rail = document.querySelector("#progress-fill");
const restart = document.querySelector("#restart");
const footerNote = document.querySelector(".footer-note");
const progressElement = document.querySelector("#age-progress");
const chapterButtons = [...document.querySelectorAll(".chapter-tick")];
let progress = 0;
let lastAge = -1;
let lastChapter = -1;

const lenis = new Lenis({
  lerp: 0.075,
  smoothWheel: !reducedPreference.matches,
  wheelMultiplier: 0.85,
  touchMultiplier: 1.15,
  anchors: false,
  autoRaf: false,
});
lenis.on("scroll", ScrollTrigger.update);

// Chrome is derived from exactly the same progress as the canvas.
function updateChrome() {
  const age = progress * MAX_AGE;
  cue.style.opacity = 1 - smooth(0.003, 0.02, progress);
  rail.style.transform = `scaleX(${progress})`;
  footerNote.style.opacity = 1 - smooth(79, 83, age);
  const restartAlpha = smooth(83, 85, age);
  const canRestart = restartAlpha > 0.7;
  restart.style.opacity = restartAlpha;
  restart.style.visibility = restartAlpha > 0 ? "visible" : "hidden";
  restart.style.pointerEvents = canRestart ? "auto" : "none";
  restart.tabIndex = canRestart ? 0 : -1;
  restart.setAttribute("aria-hidden", String(!canRestart));

  const wholeAge = Math.floor(age + 0.001);
  if (wholeAge !== lastAge) {
    lastAge = wholeAge;
    progressElement.value = age;
    progressElement.textContent = `${wholeAge} of 85 years`;
    const visible = PEOPLE.filter((p) => age >= p.startAge).map((p) => p.name);
    canvas.setAttribute(
      "aria-label",
      `Age ${wholeAge}. Connections in view: ${visible.join(", ")}. Departing lights rise into the sky and remain as stars. At the end all stars connect to Me.`,
    );
  }
  const chapter = Math.max(
    0,
    CHAPTERS.findLastIndex((item) => age >= item.age),
  );
  if (chapter !== lastChapter) {
    lastChapter = chapter;
    chapterButtons.forEach((button, i) => {
      button.classList.toggle("is-current", i === chapter);
      if (i === chapter) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
  }
}

scene.resize(stage.clientWidth, stage.clientHeight);
const scroll = ScrollTrigger.create({
  trigger: stage,
  start: "top top",
  end: `+=${SCROLL_DISTANCE}`,
  pin: true,
  pinSpacing: true,
  scrub: true,
  anticipatePin: 1,
  invalidateOnRefresh: true,
  onUpdate(self) {
    progress = self.progress;
    updateChrome();
  },
});

// Pinning creates the 9,000px spacer after Lenis first measures the document.
// Synchronize immediately (and on refresh), rather than waiting for Lenis's
// debounced observer. This keeps early chapter clicks correct, even offline.
ScrollTrigger.addEventListener("refresh", () => lenis.resize());
lenis.resize();

// A single RAF source: GSAP ticks Lenis, which drives ScrollTrigger.
// The scene has no elapsed-time input. Even twinkle is a function of age.
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
  scene.render(progress);
});

function seekAge(age, immediate = false) {
  const destination =
    scroll.start +
    (Math.min(MAX_AGE, Math.max(0, age)) / MAX_AGE) *
      (scroll.end - scroll.start);
  lenis.scrollTo(destination, {
    immediate: immediate || reducedPreference.matches,
    duration: 2.6,
    easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  });
}
chapterButtons.forEach((button) =>
  button.addEventListener("click", () => seekAge(Number(button.dataset.age))),
);
restart.addEventListener("click", () => seekAge(0));
document.querySelector(".wordmark").addEventListener("click", (event) => {
  event.preventDefault();
  seekAge(0);
});

// Audio removed for now — user will provide different audio.
// Sound toggle hidden in index.html; no audio logic needed.

// ── Hub: continuation after 85 ─────────────────────────────────────────────
const hub = document.querySelector("#hub");
const hubNodes = [...document.querySelectorAll(".hub-node")];
const hubPanels = [...document.querySelectorAll(".hub-panel")];
const hubCloses = [...document.querySelectorAll(".hub-panel__close")];

function openHubPanel(id) {
  const target = document.getElementById(`panel-${id}`);
  if (!target) return;
  // Close others
  hubPanels.forEach((p) => {
    if (p !== target) p.hidden = true;
  });
  hubNodes.forEach((n) => {
    n.setAttribute("aria-expanded", n.dataset.dest === id ? "true" : "false");
  });
  target.hidden = false;
  target.focus({ preventScroll: true });
  // Update URL without reload (preserve history)
  const url = new URL(window.location.href);
  url.hash = id;
  history.replaceState(null, "", url);
  // Smooth scroll to panel using existing Lenis
  const top = target.getBoundingClientRect().top + window.scrollY - 20;
  if (!reducedPreference.matches) {
    lenis.scrollTo(top, { duration: 1.2 });
  } else {
    window.scrollTo(0, top);
  }
}

function closeHubPanels() {
  hubPanels.forEach((p) => (p.hidden = true));
  hubNodes.forEach((n) => n.setAttribute("aria-expanded", "false"));
  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname);
  }
}

hubNodes.forEach((btn) =>
  btn.addEventListener("click", () => {
    const id = btn.dataset.dest;
    const panel = document.getElementById(`panel-${id}`);
    const willOpen = panel.hidden;
    if (willOpen) openHubPanel(id);
    else closeHubPanels();
  }),
);
hubCloses.forEach((btn) =>
  btn.addEventListener("click", () => {
    closeHubPanels();
    // Return focus to the node that opened it
    const id = btn.closest(".hub-panel").id.replace("panel-", "");
    document.querySelector(`[data-dest="${id}"]`)?.focus();
  }),
);

// Esc closes any open panel and returns to hub grid
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const open = hubPanels.find((p) => !p.hidden);
    if (open) {
      e.preventDefault();
      closeHubPanels();
      const id = open.id.replace("panel-", "");
      document.querySelector(`[data-dest="${id}"]`)?.focus();
    }
  }
});

// Deep link: #distractions etc.
if (window.location.hash) {
  const hash = window.location.hash.slice(1);
  if (["distractions", "dreams", "realworld", "choice"].includes(hash)) {
    // Defer until after fonts/scroll ready
    requestAnimationFrame(() => openHubPanel(hash));
  }
}

// Reveal hub when it enters viewport — continuous, no pin overlap
if (hub) {
  ScrollTrigger.create({
    trigger: hub,
    start: "top 85%",
    onEnter: () => hub.classList.add("is-visible"),
    onEnterBack: () => hub.classList.add("is-visible"),
    onLeaveBack: () => {
      // keep visible once revealed; comment out to hide on scroll up past hub
    },
  });
  // Also add subtle parallax for hub-threads SVG (restrained)
  const hubThreads = document.querySelector(".hub-threads");
  if (hubThreads && !reducedPreference.matches) {
    gsap.fromTo(
      hubThreads,
      { y: 8, opacity: 0.7 },
      {
        y: -8,
        opacity: 1,
        ease: "none",
        scrollTrigger: {
          trigger: hub,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      },
    );
  }
}

// Rebuild caches only when the actual stage size changes. 100svh prevents
// mobile browser chrome from resizing the story during a normal scroll.
let cachedWidth = stage.clientWidth;
let cachedHeight = stage.clientHeight;
new ResizeObserver(() => {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  if (width === cachedWidth && height === cachedHeight) return;
  cachedWidth = width;
  cachedHeight = height;
  scene.resize(width, height);
  ScrollTrigger.refresh();
}).observe(stage);
reducedPreference.addEventListener("change", (event) => {
  scene.reduced = event.matches;
  lenis.options.smoothWheel = !event.matches;
});

// Fonts are local, preloaded, and awaited before the first settled frame.
document.fonts.ready.then(() => {
  scene.resize(stage.clientWidth, stage.clientHeight);
  ScrollTrigger.refresh();
  updateChrome();
});
updateChrome();

// Development-only hooks make reversibility and visual regression testable.
if (import.meta.env.DEV) {
  window.__interwoven = {
    seek: (age) => seekAge(age, true),
    get progress() {
      return progress;
    },
    render: (value) => scene.render(value),
    scene,
    lenis,
    scroll,
  };
}
