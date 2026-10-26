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
