# Interwoven

**A life in threads.** A quiet, mobile-first, scroll-driven canvas experience about the people who shape a life.

## Run

Requires Node.js 20.19+ (or 22+).

```sh
npm install
npm run dev
```

Open the Vite URL. The development server binds to `0.0.0.0:5173` and accepts the Arena preview host. Production:

```sh
npm run build
npm run preview
```

Deploy the contents of `dist/` to any static host. All assets are local; there are no runtime CDN requests.

## One-file version

```sh
npm run standalone
```

Creates **`deliverables/interwoven.html`**: JavaScript, CSS, fonts, and the ambient loop are embedded. Open this HTML directly in a browser; no server or network connection is needed. The Vite source remains the best version to edit.

## Change the story

All people live in **`src/people.js`**. Every age is the main character's age.

```js
{
  id: 'a-friend',
  name: 'Childhood friend',
  color: '#91bcb0',
  startAge: 10,
  endAge: null,
  leaveAge: 23,
  leaveTo: 'right',
  laneX: .60,
  enterFrom: 'left'
}
```

- **`id`**: unique key; `origin` can reference another person's key.
- **`name`, `color`**: label and muted six-digit hex color.
- **`startAge`**: when the thread joins. Negative ages mean the person is already present at age zero.
- **`endAge`**: when someone dies, or `null`. Their dot first rises into the upper sky for four story years, remains fully visible for one year, then fades over three years. The thread dissolves during the ascent. Fading does not start until the dot is above, and no permanent labeled star remains.
- **`leaveAge`** _(optional)_: when a passing connection starts drifting away. This is not a death; the thread drifts toward an edge and fades away completely.
- **`laneX`**: preferred horizontal lane, normalized from 0 to 1 within the thread area. Living lanes automatically re-center as the cast changes.
- **`enterFrom`**: `'left'`, `'right'`, or `null`. Entrants sweep in from that edge, then straighten beside the family.
- **`enterYears`** _(optional)_: entrance duration, default five years.
- **`origin`** _(optional)_: another person's `id`. A new thread branches from that person's lane, as the child does from the partner.
- **`skyX`, `skyY`** _(optional)_: a temporary resting point in the upper sky, normalized to the viewport. Targets are kept below the header and inside the canvas.
- **`divergeAge`, `divergeYears`, `divergeLaneX`** _(optional)_: a smooth move into an independent, on-screen lane. Unlike `leaveAge`, this never sends the dot off-screen or makes it disappear. The child follows this route from ages 68–78; the curve and dot use the same path calculation so they stay connected.
- **`isMe`** _(optional)_: a slightly warmer, brighter treatment for the central thread.

The `CHAPTERS` array in the same file contains the chapter copy. The tiny chapter controls in `index.html` seek to representative moments. Update those `data-age` values and accessible labels if you substantially change the chapters.

## How the animation works

`src/main.js` sets up one pinned `100svh` stage with a **9,000px ScrollTrigger**, `scrub: true`. Lenis emits scroll updates to ScrollTrigger; one GSAP ticker runs Lenis and the renderer.

**`scene.render(progress)` is deterministic.** `age = progress * 85`. Every entrance, horizontal drift, death, label layout, thread, star twinkle, and ending glyph is calculated from that age. The renderer never accumulates elapsed time, velocity, or per-person animation state. Scrub backward to reconstruct the exact same scene.

`src/scene.js` renders everything in the scene to a single Canvas 2D surface. HTML only supplies the persistent controls and accessible text equivalent. Backgrounds, radial star sprites, and tail gradients are cached at resize. A seeded star field and seeded grain prevent random changes between renders. DPR is capped at 2.

The child gradually follows a separate visible route near the end. Me rises last, from age 77 to 81, stays above until 82, then slowly fades through age 85. The original “Life is a journey” ending begins only after this ascent, with the same typography and two closing lines. Remaining threads ease to a stop. Chapter copy gives way during an ascent, then returns while the star rests and fades.

`DEATH_RISE_YEARS`, `DEATH_HOLD_YEARS`, and `DEATH_FADE_YEARS` in `src/people.js` control the separate departure phases. `DEATH_YEARS` is their sum; `ENDING_REVEAL_AGE` controls the final message.

## Sound & motion

The sound button controls a local, original 32-second ambient loop. It is **muted and paused by default**, and loads only after a user gesture. No third-party audio or music samples are used. `scripts/make-ambient.py` regenerates the seamless pad using Python and NumPy; these are not website dependencies.

`prefers-reduced-motion` turns off smooth-wheel interpolation and animated UI bars, reduces thread wobble, and softens the glow. Direct scroll scrubbing remains available.

The canvas has a dynamically updated accessible description. Semantic chapter buttons, a labeled progress element, focus states, keyboard scrolling, and a full text equivalent are included.

## Files

```text
index.html                    Semantic shell, controls, text alternative
src/people.js                 Editable cast and chapter copy
src/scene.js                  Pure progress-to-canvas renderer
src/main.js                   Scroll, controls, sound, responsive setup
src/style.css                 Typography and restrained interface
public/fonts/                 Local Cormorant Garamond and DM Sans
public/fonts/licenses/        SIL Open Font License notices
public/audio/ambient.wav      Original seamless ambient pad
scripts/make-ambient.py        Optional audio regeneration
scripts/make-standalone.mjs    Creates the offline single-file version
vite.config.js                Local and Arena preview configuration
```

Only **GSAP / ScrollTrigger** and **Lenis** are used at runtime. Vite is the development/build tool. No UI frameworks, component kits, or additional graphics libraries.
