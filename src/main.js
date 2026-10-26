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
const timefliesHint = document.querySelector("#timeflies-hint");
const clockSection = document.querySelector("#clock-section");
const giantClock = document.querySelector("#giant-clock");
const clockTicks = document.querySelector(".clock-ticks");
const clockFace = document.querySelector(".clock-face");
const hourHand = document.querySelector("#hour-hand");
const minuteHand = document.querySelector("#minute-hand");
const clockCenter = document.querySelector(".clock-center");
const clockCaption = document.querySelector(".clock-caption");

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

// ── Elegant custom cursor — replaces native pointer ────────────────────
// Suits the dark cinematic theme: tiny warm ivory dot + gold ring + soft aura.
// Hidden on touch / reduced-motion; pointer events stay fully functional.
let mouseX = -9999;
let mouseY = -9999;
let sharedRafId = null; // used by TIME FLIES dissolve
{
  const cursorGlow = document.querySelector("#cursor-glow");
  const cursorCore = cursorGlow?.querySelector(".cursor-glow-core");
  const cursorDot = cursorGlow?.querySelector(".cursor-dot");
  const cursorRing = cursorGlow?.querySelector(".cursor-ring");
  const cursorTrails = cursorGlow ? [...cursorGlow.querySelectorAll(".cursor-trail")] : [];
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const canUseCustom = cursorGlow && cursorCore && cursorDot && cursorRing && !reducedPreference.matches && !isTouch && window.matchMedia("(pointer: fine)").matches;
  if (canUseCustom) {
    document.documentElement.classList.add("has-custom-cursor");
    let glowVisible = false;
    let glowIdleTimer = null;

    const qCoreX = gsap.quickTo(cursorCore, "x", { duration: 0.45, ease: "power3.out" });
    const qCoreY = gsap.quickTo(cursorCore, "y", { duration: 0.45, ease: "power3.out" });
    const qDotX = gsap.quickTo(cursorDot, "x", { duration: 0.18, ease: "power3.out" });
    const qDotY = gsap.quickTo(cursorDot, "y", { duration: 0.18, ease: "power3.out" });
    const qRingX = gsap.quickTo(cursorRing, "x", { duration: 0.32, ease: "power3.out" });
    const qRingY = gsap.quickTo(cursorRing, "y", { duration: 0.32, ease: "power3.out" });
    const qxTrail = cursorTrails.map((el) => gsap.quickTo(el, "x", { duration: 0.58, ease: "power2.out" }));
    const qyTrail = cursorTrails.map((el) => gsap.quickTo(el, "y", { duration: 0.58, ease: "power2.out" }));

    const showGlow = (x, y) => {
      if (!glowVisible) {
        cursorGlow.classList.add("is-visible");
        glowVisible = true;
      }
      qCoreX(x); qCoreY(y);
      qDotX(x); qDotY(y);
      qRingX(x); qRingY(y);
      cursorTrails.forEach((_, i) => {
        setTimeout(() => {
          qxTrail[i](x); qyTrail[i](y);
          cursorTrails[i].style.opacity = String(0.44 - i * 0.12);
        }, (i + 1) * 48);
      });
      cursorGlow.classList.remove("is-idle");
      clearTimeout(glowIdleTimer);
      glowIdleTimer = setTimeout(() => cursorGlow.classList.add("is-idle"), 520);
    };

    const onWindowMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      showGlow(mouseX, mouseY);
      // Hover state for interactive elements — ring expands, suits interface
      const target = e.target;
      const isInteractive = target.closest('a, button, [role="button"], .chapter-tick, .wordmark, #timeflies-title span');
      cursorGlow.classList.toggle("is-hover", !!isInteractive);
      // Also trigger TIME FLIES dissolve when in view
      if (timefliesSection && typeof window.__timefliesUpdate === "function") {
        if (!sharedRafId) sharedRafId = requestAnimationFrame(() => { sharedRafId = null; window.__timefliesUpdate(); });
      }
    };

    window.addEventListener("pointermove", onWindowMove, { passive: true });
    window.addEventListener("pointerleave", () => {
      cursorGlow.classList.remove("is-visible");
      cursorGlow.classList.remove("is-hover");
      glowVisible = false;
      clearTimeout(glowIdleTimer);
      cursorTrails.forEach((t) => (t.style.opacity = "0"));
      mouseX = -9999; mouseY = -9999;
    });
    // Hide glow when mouse leaves viewport via blur
    window.addEventListener("blur", () => {
      cursorGlow.classList.remove("is-visible");
      glowVisible = false;
    });
  } else if (window.matchMedia("(pointer: coarse)").matches || reducedPreference.matches) {
    // Ensure fallback: no custom cursor class
    document.documentElement.classList.remove("has-custom-cursor");
  }
}

// ── 2. Seamless transition into darkness ────────────────────────────────
// Preserve original journey and its ending; the fade is already handled by
// `ending = smooth(80,84,age)` and `decorativeStarsAlpha = 1 - smooth(82,85)` in scene.js.
// The continuation background (#02040a) matches the stage's near-black end,
// so the natural unpin slide feels like a continuous darkening — no extra pin,
// no opacity hacks that would conflict with Lenis/ScrollTrigger.
// We only add a subtle darkness veil fade for cinematic depth, scrubbed with scroll.
if (darkness && !reducedPreference.matches) {
  const veil = darkness.querySelector(".darkness-veil");
  if (veil) {
    gsap.fromTo(
      veil,
      { opacity: 0.6 },
      {
        opacity: 1,
        ease: "none",
        scrollTrigger: {
          trigger: darkness,
          start: "top 90%",
          end: "bottom 40%",
          scrub: true,
        },
      },
    );
  }
  const caption = darkness.querySelector(".darkness-caption");
  if (caption) {
    gsap.fromTo(
      caption,
      { opacity: 0, y: 8 },
      {
        opacity: 0.9,
        y: 0,
        ease: "none",
        scrollTrigger: {
          trigger: darkness,
          start: "top 75%",
          end: "top 25%",
          scrub: true,
        },
      },
    );
  }
}

// ── 3. TIME FLIES — each letter from different direction, scroll-driven ──
if (timefliesSection && timefliesLetters.length) {
  const prefersReduced = reducedPreference.matches;

  // Define per-letter entrance vectors (left, right, above, below, diagonals)
  // 9 letters: T I M E  F L I E S
  const letterOffsets = [
    { x: -140, y: 0 },   // T from left
    { x: 130, y: -40 },  // I from right-up
    { x: 0, y: -130 },   // M from above
    { x: 0, y: 120 },    // E from below
    { x: -110, y: -90 }, // F left-above
    { x: 120, y: 70 },   // L right-below
    { x: -90, y: 90 },   // I left-below
    { x: 100, y: -80 },  // E right-above
    { x: 0, y: 110 },    // S from below
  ];

  if (!prefersReduced) {
    // Set initial offsets (will be scrubbed to 0)
    timefliesLetters.forEach((span, i) => {
      const off = letterOffsets[i] || { x: 0, y: 60 };
      gsap.set(span, { x: off.x, y: off.y, opacity: 0 });
    });

    // Timeline scrubbed by scroll — letters assemble with stagger
    const tfTl = gsap.timeline({
      scrollTrigger: {
        trigger: timefliesSection,
        start: "top 82%",
        end: "top 18%",
        scrub: 0.9,
      },
    });
    tfTl.to(timefliesLetters, {
      x: 0,
      y: 0,
      opacity: 1,
      duration: 1,
      ease: "power3.out",
      stagger: 0.09,
    }, 0);

    // Hint fades in after letters settle
    if (timefliesHint) {
      gsap.fromTo(
        timefliesHint,
        { opacity: 0, y: 6 },
        {
          opacity: 0.85,
          y: 0,
          ease: "none",
          scrollTrigger: {
            trigger: timefliesSection,
            start: "top 35%",
            end: "top -5%",
            scrub: true,
          },
        },
      );
    }
  } else {
    // Reduced motion: simple fade, no directional movement
    gsap.fromTo(
      timefliesLetters,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 0.6,
        stagger: 0.05,
        scrollTrigger: {
          trigger: timefliesSection,
          start: "top 85%",
          end: "top 45%",
          scrub: true,
        },
      },
    );
  }

  // ── 4. Hover: dissolve + time-bending stretch (cursor glow is global) ─
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  timefliesSection.setAttribute("tabindex", "0");
  timefliesSection.setAttribute("aria-label", "Time flies — move pointer to dissolve");

  let rafId = null;

  // Precompute per-letter random dispersion + bend params
  const hoverMeta = timefliesLetters.map(() => ({
    dx: (Math.random() - 0.5) * 26,
    dy: -4 - Math.random() * 14,
    rot: (Math.random() - 0.5) * 10,
    bendSy: 1 + (Math.random() * 0.14 - 0.02), // stretch Y up to 1.12
    bendSx: 1 - Math.random() * 0.08,
    bendSkew: (Math.random() - 0.5) * 8,
  }));

  function updateDissolve() {
    sharedRafId = null;
    rafId = null;
    const rect = timefliesSection.getBoundingClientRect();
    const inView = rect.top < window.innerHeight * 0.78 && rect.bottom > window.innerHeight * 0.22;
    if (!inView) return;

    for (let i = 0; i < timefliesLetters.length; i++) {
      const span = timefliesLetters[i];
      const meta = hoverMeta[i];
      const r = span.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(mouseX - cx, mouseY - cy);
      const maxDist = 220;
      const influence = 1 - Math.min(dist / maxDist, 1);
      if (influence > 0.03) {
        // Dissolve intensity stronger near cursor
        const op = Math.max(0, 1 - Math.pow(influence, 0.78) * 1.12);
        const blur = influence * 16;
        const tx = meta.dx * influence;
        const ty = meta.dy * influence;
        const scale = 1 - influence * 0.14;
        const rot = meta.rot * influence;
        // Time-bending: stretch vertical near cursor, slight horizontal squeeze + skew
        const bendSy = 1 + (meta.bendSy - 1) * influence * 1.1;
        const bendSx = 1 - (1 - meta.bendSx) * influence;
        const skew = meta.bendSkew * influence;
        span.style.opacity = String(op);
        if (!prefersReduced) {
          // Combine dissolve + bend — bending is most visible at influence 0.25–0.65
          if (influence > 0.18 && influence < 0.86) {
            span.style.filter = `blur(${blur}px)`;
            span.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${bendSx}, ${bendSy}) skewX(${skew}deg) rotate(${rot * 0.5}deg)`;
            span.classList.add("is-bending");
            span.style.setProperty("--bend-blur", `${blur * 0.45}px`);
            span.style.setProperty("--bend-x", `${tx * 0.6}px`);
            span.style.setProperty("--bend-y", `${ty * 0.7}px`);
            span.style.setProperty("--bend-sx", `${bendSx}`);
            span.style.setProperty("--bend-sy", `${bendSy}`);
            span.style.setProperty("--bend-skew", `${skew}deg`);
          } else {
            span.style.filter = `blur(${blur}px)`;
            span.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale}) rotate(${rot}deg)`;
            span.classList.remove("is-bending");
          }
        }
        span.classList.toggle("is-dissolving", influence > 0.42);
        span.style.setProperty("--dx", `${tx}px`);
        span.style.setProperty("--rot", `${rot}deg`);
      } else {
        span.style.opacity = "";
        span.style.filter = "";
        span.style.transform = "";
        span.classList.remove("is-dissolving");
        span.classList.remove("is-bending");
      }
    }
  }

  function onPointerMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!rafId) rafId = requestAnimationFrame(updateDissolve);
    if (!sharedRafId) sharedRafId = requestAnimationFrame(updateDissolve);
  }

  // Expose for global cursor handler to trigger dissolve smoothly
  window.__timefliesUpdate = updateDissolve;

  function onPointerLeave() {
    // keep global mouseX/Y for custom cursor; just reset dissolve
    for (const span of timefliesLetters) {
      span.style.transition = "opacity 0.9s ease, filter 0.9s ease, transform 0.9s ease";
      span.style.opacity = "";
      span.style.filter = "";
      span.style.transform = "";
      span.classList.remove("is-dissolving");
      span.classList.remove("is-bending");
    }
    setTimeout(() => {
      for (const span of timefliesLetters) span.style.transition = "";
    }, 900);
  }

  if (!isTouch) {
    timefliesSection.addEventListener("pointermove", onPointerMove, { passive: true });
    timefliesSection.addEventListener("pointerleave", onPointerLeave);
    timefliesSection.addEventListener("pointerenter", onPointerMove, { passive: true });
  }

  // Keyboard: Enter/Space triggers strong dissolve
  timefliesSection.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      timefliesLetters.forEach((span, i) => {
        const meta = hoverMeta[i];
        span.style.transition = "opacity 0.5s ease, filter 0.5s ease, transform 0.5s ease";
        span.style.opacity = "0";
        span.style.filter = "blur(12px)";
        span.style.transform = `translate3d(${meta.dx * 0.7}px, ${meta.dy}px, 0) scale(0.88) rotate(${meta.rot}deg)`;
        span.classList.add("is-dissolving");
      });
      setTimeout(() => {
        timefliesLetters.forEach((span) => {
          span.style.opacity = "";
          span.style.filter = "";
          span.style.transform = "";
          span.style.transition = "opacity 0.9s ease, filter 0.9s ease, transform 0.9s ease";
          span.classList.remove("is-dissolving");
        });
        setTimeout(() => timefliesLetters.forEach((s) => (s.style.transition = "")), 900);
      }, 1200);
    }
  });

  // Touch alternative: tap to dissolve, hold shows, auto-return
  if (isTouch) {
    let touchTimeout = null;
    const handleTouch = (e) => {
      e.preventDefault();
      timefliesLetters.forEach((span, i) => {
        const meta = hoverMeta[i];
        span.style.transition = "opacity 0.5s ease, filter 0.5s ease, transform 0.5s ease";
        span.style.opacity = "0";
        span.style.filter = "blur(12px)";
        span.style.transform = `translate3d(${meta.dx * 0.6}px, ${meta.dy * 0.8}px, 0) scale(0.9) rotate(${meta.rot * 0.7}deg)`;
        span.classList.add("is-dissolving");
      });
      clearTimeout(touchTimeout);
      touchTimeout = setTimeout(() => {
        timefliesLetters.forEach((span) => {
          span.style.opacity = "";
          span.style.filter = "";
          span.style.transform = "";
          span.style.transition = "opacity 0.85s ease, filter 0.85s ease, transform 0.85s ease";
          span.classList.remove("is-dissolving");
        });
        setTimeout(() => timefliesLetters.forEach((s) => (s.style.transition = "")), 900);
      }, 1400);
    };
    timefliesSection.addEventListener("touchstart", handleTouch, { passive: false });
    timefliesSection.addEventListener("click", (e) => {
      if (!isTouch) return;
      handleTouch(e);
    });
  }

  // Focus subtle pulse (accessible)
  timefliesSection.addEventListener("focus", () => {
    if (prefersReduced) return;
    timefliesLetters.forEach((span, i) => {
      setTimeout(() => {
        span.style.opacity = "0.5";
        span.style.filter = "blur(2px)";
      }, i * 35);
    });
  });
  timefliesSection.addEventListener("blur", () => {
    timefliesLetters.forEach((span) => {
      span.style.opacity = "";
      span.style.filter = "";
      span.style.transform = "";
    });
  });
}

// ── Golden Thread: single thin line from darkness to clock ─────────────
{
  const thread = document.querySelector(".golden-thread");
  const threadPath = document.querySelector("#golden-thread-path");
  if (thread && threadPath && !reducedPreference.matches) {
    const len = 1360;
    gsap.set(threadPath, {
      strokeDasharray: len,
      strokeDashoffset: len,
    });
    gsap.set(thread, { opacity: 0 });
    const threadTl = gsap.timeline({
      scrollTrigger: {
        trigger: continuation,
        start: "top 68%",
        end: "top -6%",
        scrub: 1.1,
      },
    });
    // Draw across darkness (thin line appears)
    threadTl.to(thread, { opacity: 0.95, duration: 0.18, ease: "none" }, 0);
    threadTl.to(threadPath, { strokeDashoffset: 0, duration: 0.62, ease: "power1.inOut" }, 0.06);
    // Hold briefly, then fade as clock assembles — thread becomes clock outline
    threadTl.to(thread, { opacity: 0, duration: 0.32, ease: "power2.in" }, 0.58);
  }
}

// ── 5 & 6. Clock construction + movement as one scroll-driven sequence ─
if (clockSection && giantClock && hourHand && minuteHand && clockFace && clockCenter) {
  // Ensure correct rotation origin: SVG user units, not CSS pixels
  // Root cause of reversed/wobbling hands was using CSS transformOrigin "200px 200px"
  // which does not match SVG viewBox and responsive scaling. Fixed via svgOrigin.
  const allTicks = clockTicks ? [...clockTicks.querySelectorAll("line")] : [];

  // Initial states for construction (deterministic, no autoplay)
  const prefersReduced = reducedPreference.matches;
  const faceCircumference = 2 * Math.PI * 188; // ~1181

  if (!prefersReduced) {
    gsap.set(clockFace, {
      strokeDasharray: faceCircumference,
      strokeDashoffset: faceCircumference,
      opacity: 0.12,
    });
    gsap.set(allTicks, { opacity: 0, scale: 0.7, transformOrigin: "200px 200px", svgOrigin: "200 200" });
    gsap.set([hourHand, minuteHand], { opacity: 0, scale: 0.6, svgOrigin: "200 200" });
    gsap.set(clockCenter, { opacity: 0, scale: 0.4, svgOrigin: "200 200" });
    gsap.set(clockCaption, { opacity: 0, y: 8 });
    gsap.set(giantClock, { scale: 0.94, opacity: 0.7 });
  } else {
    // Reduced motion: visible but still scrubbed
    gsap.set([clockFace, ...allTicks, hourHand, minuteHand, clockCenter], { opacity: 1 });
  }

  // Single coherent timeline — scrubbed, deterministic, reversible
  const clockTl = gsap.timeline({
    scrollTrigger: {
      trigger: clockSection,
      start: "top top",
      end: "bottom bottom",
      scrub: prefersReduced ? 0.2 : 1,
      // No pin — sticky handles visual continuity, avoids conflicting pins
    },
  });

  if (!prefersReduced) {
    // Stage 1: faint outline appears (0% → 12%)
    clockTl.to(clockFace, { opacity: 0.42, duration: 0.18, ease: "none" }, 0);
    // Stage 2: circle draws around dial (5% → 38%)
    clockTl.to(
      clockFace,
      {
        strokeDashoffset: 0,
        opacity: 1,
        duration: 0.42,
        ease: "power2.inOut",
      },
      0.05,
    );
    clockTl.to(giantClock, { scale: 1, opacity: 1, duration: 0.3, ease: "power2.out" }, 0.08);
    // Stage 3: hour markings emerge progressively (18% → 48%, staggered by angle)
    clockTl.to(
      allTicks,
      {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.015,
      },
      0.18,
    );
    // Stage 4: center point and hands assemble (42% → 58%)
    clockTl.to(clockCenter, { opacity: 1, scale: 1, duration: 0.18, ease: "back.out(1.6)" }, 0.42);
    clockTl.to(
      [hourHand, minuteHand],
      { opacity: 1, scale: 1, duration: 0.28, ease: "back.out(1.4)", stagger: 0.06 },
      0.46,
    );
    clockTl.to(clockCaption, { opacity: 0.9, y: 0, duration: 0.2 }, 0.5);

    // Stage 5: completed clock becomes clearly visible — then hand movement
    // Hands rotate clockwise with scroll — verified correct direction via svgOrigin
    // Mapping: full clockSection scroll (post-construction) advances 6 rotations minute, 0.5 rotation hour? Keep deliberate:
    // Use remaining 0.4 → 1.0 progress for movement: minute 720deg (2 rot), hour 60deg
    // We achieve this by animating a dummy progress object and applying via onUpdate
    const handProgress = { t: 0 };
    clockTl.to(handProgress, {
      t: 1,
      duration: 0.9,
      ease: "none",
      onUpdate() {
        const p = handProgress.t;
        // Root cause fix: use svgOrigin "200 200" not CSS "200px 200px", positive angle = clockwise
        const minuteDeg = p * 720; // 2 full clockwise rotations over movement phase
        const hourDeg = p * 60; // 60deg clockwise (2 hours)
        gsap.set(minuteHand, { rotation: minuteDeg, svgOrigin: "200 200" });
        gsap.set(hourHand, { rotation: hourDeg, svgOrigin: "200 200" });
      },
    }, 0.52);
  } else {
    // Reduced motion: simple scrub for hands without construction flourish
    const handProgress = { t: 0 };
    clockTl.to(handProgress, {
      t: 1,
      duration: 1,
      ease: "none",
      onUpdate() {
        const p = handProgress.t;
        gsap.set(minuteHand, { rotation: p * 360, svgOrigin: "200 200" });
        gsap.set(hourHand, { rotation: p * 30, svgOrigin: "200 200" });
      },
    }, 0);
  }

  // Ensure hands rotate around exact center without drift — correct origin
  // Remove previous incorrect CSS transformOrigins
  hourHand.style.transformOrigin = "";
  minuteHand.style.transformOrigin = "";
  const clockHandsGroup = document.querySelector("#clock-hands");
  if (clockHandsGroup) {
    clockHandsGroup.style.transformOrigin = "";
    clockHandsGroup.style.transformBox = "";
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
