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

// ── Continuation: Darkness → TIME FLIES → Clock ──────────────────────────
const continuation = document.querySelector("#continuation");
const darkness = document.querySelector("#darkness");
const timefliesSection = document.querySelector("#timeflies");
const timefliesTitle = document.querySelector("#timeflies-title");
const timefliesLetters = timefliesTitle
  ? [...timefliesTitle.querySelectorAll(".timeflies-word span")]
  : [];
const clockSection = document.querySelector("#clock-section");
const giantClock = document.querySelector("#giant-clock");
const clockTicks = document.querySelector(".clock-ticks");
const hourHand = document.querySelector("#hour-hand");
const minuteHand = document.querySelector("#minute-hand");

// Build clock ticks (minimal, restrained)
if (clockTicks) {
  const NS = "http://www.w3.org/2000/svg";
  for (let i = 0; i < 60; i++) {
    const isMajor = i % 5 === 0;
    const angle = (i * 6 * Math.PI) / 180;
    const rOuter = 186;
    const rInner = isMajor ? 172 : 178;
    const x1 = 200 + Math.sin(angle) * rInner;
    const y1 = 200 - Math.cos(angle) * rInner;
    const x2 = 200 + Math.sin(angle) * rOuter;
    const y2 = 200 - Math.cos(angle) * rOuter;
    const line = document.createElementNS(NS, "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("class", isMajor ? "" : "minor");
    if (isMajor) {
      line.setAttribute("stroke", "rgba(216,189,128,0.38)");
      line.setAttribute("stroke-width", "1.4");
    }
    clockTicks.appendChild(line);
  }
}

// Transition into darkness: fade stage chrome already via ending; add subtle veil
// Use ScrollTrigger to darken stage background as we enter #darkness
if (darkness && stage) {
  ScrollTrigger.create({
    trigger: darkness,
    start: "top bottom", // when darkness top hits viewport bottom
    end: "top 55%",
    scrub: true,
    onUpdate(self) {
      // As darkness approaches, gently dim the pinned stage
      // This creates a cinematic bleed into black without a cut
      const p = self.progress; // 0 → 1 as darkness slides up
      if (progress >= 0.998) {
        // Only after journey is essentially complete
        stage.style.opacity = String(1 - p * 0.45);
      }
    },
  });
  ScrollTrigger.create({
    trigger: "#continuation",
    start: "top 90%",
    end: "top 10%",
    scrub: true,
    onUpdate(self) {
      // Ensure stage fully hidden once past continuation
      if (self.progress > 0.6) {
        stage.style.opacity = "0";
      } else if (progress < 0.998) {
        stage.style.opacity = "";
      }
    },
  });
}

// TIME FLIES hover dissolve — refined, distance-based
if (timefliesTitle && timefliesLetters.length) {
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const prefersReduced = reducedPreference.matches;

  // Make timeflies focusable for keyboard
  timefliesSection?.setAttribute("tabindex", "0");

  let rafId = null;
  let mouseX = -9999;
  let mouseY = -9999;

  function updateDissolve() {
    rafId = null;
    for (const span of timefliesLetters) {
      const rect = span.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = mouseX - cx;
      const dy = mouseY - cy;
      const dist = Math.hypot(dx, dy);
      // Radius of influence: ~160px, dissolve gradually within
      const maxDist = 170;
      const influence = 1 - Math.min(dist / maxDist, 1);
      // Map influence to opacity/blur
      if (influence > 0.02) {
        const op = Math.max(0, 1 - influence * 1.05);
        const blur = influence * 8;
        const ty = influence * 6;
        span.style.opacity = String(op);
        if (!prefersReduced) {
          span.style.filter = `blur(${blur}px)`;
          span.style.transform = `translateY(${ty}px) scale(${1 - influence * 0.02})`;
        } else {
          span.style.filter = "";
          span.style.transform = "";
        }
        span.classList.toggle("is-dissolving", influence > 0.5);
      } else {
        span.style.opacity = "";
        span.style.filter = "";
        span.style.transform = "";
        span.classList.remove("is-dissolving");
      }
    }
  }

  function onPointerMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!rafId) rafId = requestAnimationFrame(updateDissolve);
  }

  function onPointerLeave() {
    mouseX = -9999;
    mouseY = -9999;
    // Gently return
    for (const span of timefliesLetters) {
      span.style.transition = "opacity 0.9s ease, filter 0.9s ease, transform 0.9s ease";
      span.style.opacity = "";
      span.style.filter = "";
      span.style.transform = "";
      span.classList.remove("is-dissolving");
    }
    setTimeout(() => {
      for (const span of timefliesLetters) span.style.transition = "";
    }, 900);
  }

  if (!isTouch) {
    timefliesSection?.addEventListener("pointermove", onPointerMove);
    timefliesSection?.addEventListener("pointerleave", onPointerLeave);
    timefliesSection?.addEventListener("pointerenter", onPointerMove);
  }

  // Keyboard: focus gives subtle dissolve pulse
  timefliesSection?.addEventListener("focus", () => {
    if (prefersReduced) return;
    timefliesLetters.forEach((span, i) => {
      setTimeout(() => {
        span.style.opacity = "0.35";
        span.style.filter = "blur(3px)";
      }, i * 40);
    });
  });
  timefliesSection?.addEventListener("blur", () => {
    timefliesLetters.forEach((span) => {
      span.style.opacity = "";
      span.style.filter = "";
      span.style.transform = "";
    });
  });
  timefliesSection?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      // Toggle dissolve via tap-like
      const anyDissolved = timefliesLetters.some((s) => s.classList.contains("is-dissolving"));
      if (!anyDissolved) {
        timefliesSection.classList.add("is-touched");
        setTimeout(() => timefliesSection.classList.remove("is-touched"), 1400);
        timefliesLetters.forEach((span, i) => {
          span.style.opacity = "0";
          span.style.filter = "blur(6px)";
          span.style.transition = "opacity 0.6s ease, filter 0.6s ease";
          setTimeout(() => {
            span.style.opacity = "";
            span.style.filter = "";
            span.style.transition = "";
          }, 1200 + i * 30);
        });
      }
    }
  });

  // Touch alternative: tap to dissolve, gentle return
  if (isTouch) {
    let touchTimeout = null;
    const handleTouch = (e) => {
      e.preventDefault();
      // Prevent pointermove handling
      timefliesSection.classList.add("is-touched");
      timefliesLetters.forEach((span, i) => {
        span.style.transition = "opacity 0.55s ease, filter 0.55s ease, transform 0.55s ease";
        span.style.opacity = "0";
        span.style.filter = "blur(6px)";
        span.style.transform = `translateY(${2 + Math.random() * 4}px)`;
      });
      clearTimeout(touchTimeout);
      touchTimeout = setTimeout(() => {
        timefliesSection.classList.remove("is-touched");
        timefliesLetters.forEach((span) => {
          span.style.opacity = "";
          span.style.filter = "";
          span.style.transform = "";
          span.style.transition = "opacity 0.9s ease, filter 0.9s ease, transform 0.9s ease";
        });
        setTimeout(() => {
          timefliesLetters.forEach((s) => (s.style.transition = ""));
        }, 900);
      }, 1400);
    };
    timefliesSection?.addEventListener("touchstart", handleTouch, { passive: false });
    // Also allow click fallback
    timefliesSection?.addEventListener("click", (e) => {
      if (!isTouch) return;
      handleTouch(e);
    });
  }
}

// Giant Clock — scroll-driven, reversible, enough distance
if (clockSection && giantClock && hourHand && minuteHand) {
  // Ensure hands rotate around center
  const clockHands = document.querySelector("#clock-hands");
  if (clockHands) {
    clockHands.style.transformOrigin = "200px 200px";
    clockHands.style.transformBox = "fill-box";
  }
  hourHand.style.transformOrigin = "200px 200px";
  minuteHand.style.transformOrigin = "200px 200px";

  // Create ScrollTrigger for clock with generous scroll distance
  // Clock-section is 220vh, sticky wrap makes clock stay while scroll drives hands
  ScrollTrigger.create({
    trigger: clockSection,
    start: "top top",
    end: "bottom bottom",
    scrub: reducedPreference.matches ? 0.3 : 0.8,
    onUpdate(self) {
      const p = self.progress; // 0 → 1 over clock-section scroll
      // Map to meaningful time: 2 full rotations of minute hand = 2 hours? Actually 12h = 720min = 12 rotations
      // For cinematic feel: 4 hours over full scroll => minute 4 rotations (1440deg), hour 120deg
      // Keep it deliberate, not frantic
      const minuteDeg = p * 1440; // 4 full rotations
      const hourDeg = p * 120; // 4 hours = 120deg (360/12*4)
      // Apply with GSAP for smoothness
      gsap.set(minuteHand, { rotation: minuteDeg, transformOrigin: "200px 200px" });
      gsap.set(hourHand, { rotation: hourDeg, transformOrigin: "200px 200px" });
      // Also nudge clock face opacity subtly on entry
      if (giantClock) {
        giantClock.style.opacity = String(0.72 + p * 0.28);
      }
    },
  });

  // Reveal clock gently when entering
  ScrollTrigger.create({
    trigger: clockSection,
    start: "top 80%",
    onEnter: () => {
      if (!reducedPreference.matches) {
        gsap.fromTo(
          giantClock,
          { scale: 0.96, opacity: 0.6 },
          { scale: 1, opacity: 1, duration: 0.9, ease: "power2.out" },
        );
      }
    },
  });
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
