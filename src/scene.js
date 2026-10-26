import {
  PEOPLE,
  CHAPTERS,
  MAX_AGE,
  DEATH_YEARS,
  DEATH_RISE_YEARS,
  DEATH_HOLD_YEARS,
  ENDING_REVEAL_AGE,
  LEAVE_YEARS,
} from "./people.js";

export const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, n) => {
  const t = clamp((n - a) / (b - a));
  return t * t * (3 - 2 * t);
};
// Only decorative drift decelerates. Actual life events always use real age,
// so moving an event into the last chapter in people.js still works.
const quietAge = (age) => {
  const slowing = clamp((age - 78) / 4);
  return age <= 78 ? age : 78 + 2 * (1 - Math.pow(1 - slowing, 2));
};
const rgb = (hex) => hex.match(/\w\w/g).map((n) => parseInt(n, 16));
const rgba = (hex, a) => `rgba(${rgb(hex).join(",")},${a})`;
const pale = (hex) =>
  `rgb(${rgb(hex)
    .map((n) => Math.round(mix(n, 238, 0.44)))
    .join(",")})`;
const makeCanvas = (w, h) =>
  Object.assign(document.createElement("canvas"), { width: w, height: h });

function randomFrom(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A deterministic renderer. There are no tweens, accumulated velocities,
 * timers, or random calls in render(). Its only input is scroll progress.
 * Resize only rebuilds expensive static backgrounds, gradients and sprites.
 */
export class LifeScene {
  constructor(canvas, reducedMotion = false) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.reduced = reducedMotion;
    this.byId = new Map(PEOPLE.map((person) => [person.id, person]));
    this.glows = new Map();
    this.phases = new Map(PEOPLE.map((p, i) => [p.id, i * 1.759 + 0.8]));
    this.colors = new Map(PEOPLE.map((p) => [p.id, pale(p.color)]));
    const random = randomFrom(7119);
    this.stars = Array.from({ length: 150 }, (_, i) => ({
      x: random(),
      y: random(),
      radius: 0.28 + Math.pow(random(), 3) * 0.9,
      opacity: 0.1 + random() * 0.4,
      phase: random() * Math.PI * 2,
      bright: i % 47 === 0,
    }));
    for (const p of PEOPLE) this.glows.set(p.id, this.makeGlow(p.color));
  }

  resize(width, height) {
    this.w = width;
    this.h = height;
    this.mobile = width < 600;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.nowY = height * 0.47;
    this.axisX = this.mobile ? 25 : Math.max(48, width * 0.042);
    this.left = this.mobile ? 44 : width * 0.1;
    this.right = this.mobile ? 26 : width * 0.1;
    this.span = width - this.left - this.right;
    this.trailHeight = height - this.nowY + 40;
    this.historyYears = this.mobile ? 15 : 18;
    this.threadGradients = new Map();
    for (const p of PEOPLE) {
      const gradient = this.ctx.createLinearGradient(
        0,
        this.nowY,
        0,
        height + 10,
      );
      gradient.addColorStop(0, rgba(p.color, 0.9));
      gradient.addColorStop(0.35, rgba(p.color, 0.65));
      gradient.addColorStop(0.75, rgba(p.color, 0.29));
      gradient.addColorStop(1, rgba(p.color, 0));
      this.threadGradients.set(p.id, gradient);
    }
    this.nowGradient = this.ctx.createLinearGradient(
      this.axisX,
      0,
      width - this.right / 2,
      0,
    );
    this.nowGradient.addColorStop(0, "rgba(179,190,208,.12)");
    this.nowGradient.addColorStop(0.48, "rgba(190,196,205,.15)");
    this.nowGradient.addColorStop(1, "rgba(179,190,208,0)");
    this.cacheBackground();
  }

  makeGlow(color) {
    const sprite = makeCanvas(128, 128);
    const c = sprite.getContext("2d");
    const gradient = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, rgba(color, 0.72));
    gradient.addColorStop(0.08, rgba(color, 0.55));
    gradient.addColorStop(0.22, rgba(color, 0.19));
    gradient.addColorStop(0.5, rgba(color, 0.05));
    gradient.addColorStop(1, rgba(color, 0));
    c.fillStyle = gradient;
    c.fillRect(0, 0, 128, 128);
    return sprite;
  }

  cacheBackground() {
    const { w, h, dpr } = this;
    this.background = makeCanvas(Math.round(w * dpr), Math.round(h * dpr));
    const c = this.background.getContext("2d");
    c.scale(dpr, dpr);
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#0c1221");
    sky.addColorStop(0.48, "#0a101c");
    sky.addColorStop(1, "#060c12");
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);

    // One soft, blue-grey nebula. Cached rather than remade every frame.
    c.save();
    c.translate(w * 0.67, h * 0.16);
    c.scale(1, 0.67);
    const nebula = c.createRadialGradient(
      0,
      0,
      0,
      0,
      0,
      Math.max(w * 0.55, h * 0.55),
    );
    nebula.addColorStop(0, "rgba(42,51,85,.22)");
    nebula.addColorStop(0.5, "rgba(30,41,66,.11)");
    nebula.addColorStop(1, "rgba(16,23,43,0)");
    c.fillStyle = nebula;
    c.fillRect(-w * 2, -h * 2, w * 4, h * 4);
    c.restore();

    const vignette = c.createRadialGradient(
      w * 0.49,
      h * 0.4,
      h * 0.15,
      w * 0.5,
      h * 0.4,
      Math.max(w, h) * 0.79,
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,.28)");
    c.fillStyle = vignette;
    c.fillRect(0, 0, w, h);

    // A nearly imperceptible, static grain keeps the dark field from feeling flat.
    const grain = makeCanvas(180, 180);
    const g = grain.getContext("2d");
    const image = g.createImageData(180, 180);
    const random = randomFrom(531);
    for (let i = 0; i < image.data.length; i += 4) {
      const value = random() > 0.5 ? 190 : 35;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
      image.data[i + 3] = Math.floor(random() * 9);
    }
    g.putImageData(image, 0, 0);
    c.globalAlpha = 0.2;
    c.fillStyle = c.createPattern(grain, "repeat");
    c.fillRect(0, 0, w, h);
  }

  /** Smoothly rebalance the living lanes as people enter or leave. */
  centerShift(age) {
    let total = 0,
      sum = 0;
    for (const p of PEOPLE) {
      let weight =
        p.startAge <= 0
          ? 1
          : smooth(p.startAge, p.startAge + (p.enterYears || 5), age);
      if (p.endAge !== null)
        weight *= 1 - smooth(p.endAge, p.endAge + DEATH_RISE_YEARS, age);
      if (p.leaveAge != null)
        weight *= 1 - smooth(p.leaveAge, p.leaveAge + LEAVE_YEARS, age);
      total += weight;
      sum += p.laneX * weight;
    }
    return total ? (0.5 - sum / total) * this.span * 0.85 : 0;
  }

  /** The x of any thread at any age, including before/after its crossing. */
  laneAt(p, age, shift, driftAge = quietAge(age)) {
    const familyLane = this.left + p.laneX * this.span + shift;
    // A diverging route is NOT a departure. It eases into an independent,
    // inset lane, stays visible, and is sampled by the very same thread path.
    const divergence =
      p.divergeAge == null
        ? 0
        : smooth(p.divergeAge, p.divergeAge + (p.divergeYears || 10), driftAge);
    const ownLane =
      this.left + clamp(p.divergeLaneX ?? p.laneX, 0.12, 0.9) * this.span;
    const base = mix(familyLane, ownLane, divergence);
    const entrance = smooth(p.startAge, p.startAge + (p.enterYears || 5), age);
    let x = base;
    if (p.enterFrom === "left") x = mix(-this.w * 0.12, base, entrance);
    if (p.enterFrom === "right") x = mix(this.w * 1.12, base, entrance);
    if (p.origin) {
      const origin = this.byId.get(p.origin);
      if (origin)
        x = mix(this.laneAt(origin, age, shift, driftAge), base, entrance);
    }
    if (p.leaveAge != null) {
      const departure = smooth(p.leaveAge, p.leaveAge + LEAVE_YEARS, age);
      x = mix(
        x,
        p.leaveTo === "right" ? this.w * 1.15 : -this.w * 0.15,
        departure,
      );
    }
    // A tiny, age-driven drift; the dot itself always stays on the now line.
    const phase = this.phases.get(p.id);
    return (
      x +
      Math.sin(driftAge * 0.105 + phase) * (this.reduced ? 0.7 : this.w * 0.003)
    );
  }

  skyPoint(p) {
    // Keep every lift target below the masthead and inside the canvas, even
    // on a short phone viewport. These are temporary resting points only.
    const top = this.h < 600 ? 85 : 96;
    return {
      x: clamp((p.skyX ?? 0.5) * this.w, this.axisX + 24, this.w - 40),
      y: clamp((p.skyY ?? 0.15) * this.h, top, Math.max(top, this.nowY - 48)),
    };
  }

  render(progress) {
    if (!this.w || !this.h) return;
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.globalAlpha = 1;
    c.shadowBlur = 0;
    c.drawImage(this.background, 0, 0, this.w, this.h);
    const age = clamp(progress) * MAX_AGE;
    // The last four years decelerate to stillness, with no accumulated state.
    const geometryAge = quietAge(age);
    const ending = smooth(80, 84, age);
    this.drawStars(age);
    this.drawAxis(age, ending);
    this.drawNowLine(ending);

    const shift = this.centerShift(age);
    const tips = [];
    for (const p of PEOPLE) {
      if (age < p.startAge) continue;
      const born =
        p.startAge <= 0 ? 1 : smooth(p.startAge, p.startAge + 0.8, age);
      const leave =
        p.leaveAge == null
          ? 0
          : smooth(p.leaveAge, p.leaveAge + LEAVE_YEARS, age);
      if (leave >= 1) continue;
      const departing = p.endAge != null && age >= p.endAge;
      const sinceDeparture = departing ? age - p.endAge : 0;
      const rise = clamp(sinceDeparture / DEATH_RISE_YEARS);
      // No fading during the ascent: rise for four years, rest for one,
      // then fade over three. A finished goodbye leaves no permanent star.
      const departureFade = smooth(
        DEATH_RISE_YEARS + DEATH_HOLD_YEARS,
        DEATH_YEARS,
        sinceDeparture,
      );
      if (departing && sinceDeparture >= DEATH_YEARS) continue;
      const alpha = born * (1 - leave);
      if (!alpha) continue;
      if (rise < 1)
        this.drawThread(
          p,
          age,
          shift,
          rise,
          alpha * (1 - ending * 0.83),
          geometryAge,
        );
      let x = this.laneAt(p, age, shift, geometryAge);
      let y = this.nowY;
      if (departing) {
        const originX = this.laneAt(p, p.endAge, this.centerShift(p.endAge));
        const sky = this.skyPoint(p);
        const travel = smooth(0, 1, rise);
        x = mix(originX, sky.x, travel);
        y =
          mix(this.nowY, sky.y, travel) -
          Math.sin(travel * Math.PI) * this.h * 0.025;
      }
      const presence = alpha * (1 - departureFade);
      // Ending dimming must not hide Me before the last ascent has completed.
      this.drawDot(p, x, y, presence * (departing ? 1 : 1 - ending * 0.84));
      if (x > this.axisX + 15 && x < this.w - 16)
        tips.push({
          p,
          x,
          y,
          alpha: presence * (departing ? 1 : 1 - smooth(80, 82.5, age)),
        });
    }
    this.drawLabels(tips);
    this.drawNarrative(age);
    this.drawEnding(age);
    c.globalAlpha = 1;
  }

  drawStars(age) {
    const c = this.ctx;
    for (const star of this.stars) {
      const twinkle = this.reduced
        ? 0.85
        : 0.75 + 0.25 * Math.sin(age * 0.21 + star.phase);
      const x = star.x * this.w;
      const y = 0.07 * this.h + star.y * this.h * 0.86;
      c.fillStyle = `rgba(194,207,228,${star.opacity * twinkle})`;
      c.beginPath();
      c.arc(x, y, star.radius, 0, Math.PI * 2);
      c.fill();
      if (star.bright) {
        c.strokeStyle = `rgba(183,203,225,${star.opacity * 0.3 * twinkle})`;
        c.lineWidth = 0.6;
        c.beginPath();
        c.moveTo(x - 2.5, y);
        c.lineTo(x + 2.5, y);
        c.moveTo(x, y - 2.5);
        c.lineTo(x, y + 2.5);
        c.stroke();
      }
    }
  }

  drawAxis(age, ending) {
    const c = this.ctx;
    const { axisX, nowY, h, w, mobile } = this;
    const opacity = 1 - ending;
    c.save();
    c.globalAlpha = opacity;
    c.lineWidth = 0.6;
    c.strokeStyle = "rgba(148,167,191,.12)";
    c.beginPath();
    c.moveTo(axisX, 91);
    c.lineTo(axisX, h - 90);
    c.stroke();
    const pixelsPerYear = h * 0.052;
    const from = Math.max(0, Math.floor((age - 13) / 5) * 5);
    const to = Math.ceil((age + 13) / 5) * 5;
    c.font = `${mobile ? 8 : 9}px 'DM Sans'`;
    c.textAlign = "right";
    for (let tick = from; tick <= Math.min(to, 85); tick += 5) {
      const y = nowY - (tick - age) * pixelsPerYear;
      if (y < 100 || y > h - 90 || Math.abs(tick - age) < 0.65) continue;
      const edgeFade = Math.min(
        smooth(90, 135, y),
        1 - smooth(h - 140, h - 90, y),
      );
      c.globalAlpha = opacity * edgeFade;
      c.fillStyle = "rgba(143,157,180,.5)";
      c.fillText(tick, axisX - 10, y + 3);
      c.strokeStyle = "rgba(148,167,191,.2)";
      c.beginPath();
      c.moveTo(axisX - 4, y);
      c.lineTo(axisX, y);
      c.stroke();
    }
    c.globalAlpha = opacity;
    c.fillStyle = "#c6ae7b";
    c.beginPath();
    c.arc(axisX, nowY, 1.4, 0, Math.PI * 2);
    c.fill();
    c.font = `${mobile ? 8 : 9}px 'DM Sans'`;
    c.fillText(Math.floor(age + 0.001), axisX - 10, nowY + 3);

    const counterX = mobile ? 47 : w * 0.108;
    const counterY = h * 0.807;
    c.textAlign = "left";
    c.font = `400 ${mobile ? 123 : Math.min(176, h * 0.21)}px Cormorant`;
    c.fillStyle = "rgba(173,188,208,.115)";
    c.fillText(
      String(Math.floor(age + 0.001)).padStart(2, "0"),
      counterX - 3,
      counterY,
    );
    c.fillStyle = "rgba(155,168,186,.42)";
    c.font = `${mobile ? 7 : 8}px 'DM Sans'`;
    this.tracked(
      "Y E A R S  I N T O  A  L I F E",
      counterX,
      counterY + 23,
      0.3,
    );
    c.restore();
  }

  drawNowLine(ending) {
    const c = this.ctx;
    c.save();
    c.globalAlpha = 1 - ending;
    c.strokeStyle = this.nowGradient;
    c.lineWidth = 0.65;
    c.beginPath();
    c.moveTo(this.axisX, this.nowY);
    c.lineTo(this.w - 10, this.nowY);
    c.stroke();
    c.fillStyle = "rgba(159,170,189,.43)";
    c.font = `7px 'DM Sans'`;
    this.tracked("NOW", this.axisX + 9, this.nowY + 15, 1.5);
    c.restore();
  }

  drawThread(p, age, shift, death, alpha, geometryAge) {
    const c = this.ctx;
    let maxY = this.h + 25;
    if (p.origin)
      maxY = Math.min(
        maxY,
        this.nowY + ((age - p.startAge) / this.historyYears) * this.trailHeight,
      );
    const minY = this.nowY + Math.pow(death, 0.8) * this.trailHeight;
    if (maxY <= minY + 0.5) return;
    const points = [];
    const phase = this.phases.get(p.id);
    for (let i = 0; i <= 38; i++) {
      const y = mix(minY, maxY, i / 38);
      const u = (y - this.nowY) / this.trailHeight;
      const historicalAge = age - u * this.historyYears;
      const envelope = Math.sin(Math.min(u * 1.1, 1) * Math.PI * 0.75);
      const amplitude = this.reduced ? 0.8 : Math.min(11, this.w * 0.018);
      const wobble =
        (Math.sin(u * 10 + phase + geometryAge * 0.07) +
          0.36 * Math.sin(u * 21 - geometryAge * 0.035 + phase)) *
        amplitude *
        envelope;
      points.push({
        x:
          this.laneAt(
            p,
            historicalAge,
            shift,
            geometryAge - u * this.historyYears,
          ) + wobble,
        y,
      });
    }
    c.save();
    c.globalAlpha = alpha * (1 - smooth(0, 1, death)) * (p.isMe ? 1 : 0.82);
    c.strokeStyle = this.threadGradients.get(p.id);
    c.lineWidth = p.isMe ? 1.65 : 1.3;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.shadowColor = rgba(p.color, 0.4);
    c.shadowBlur = this.reduced ? 0 : 6;
    c.beginPath();
    c.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      c.quadraticCurveTo(
        points[i].x,
        points[i].y,
        (points[i].x + points[i + 1].x) / 2,
        (points[i].y + points[i + 1].y) / 2,
      );
    }
    c.lineTo(points.at(-1).x, points.at(-1).y);
    c.stroke();
    c.restore();
  }

  drawDot(p, x, y, alpha) {
    if (x < -60 || x > this.w + 60) return;
    const c = this.ctx;
    c.save();
    c.globalAlpha = alpha;
    const size = this.reduced ? 26 : p.isMe ? 62 : 46;
    c.drawImage(this.glows.get(p.id), x - size / 2, y - size / 2, size, size);
    c.fillStyle = rgba(p.color, 0.45);
    c.beginPath();
    c.arc(x, y, p.isMe ? 3.6 : 3.0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = p.isMe ? "#fff2c9" : "#f1f2ef";
    c.beginPath();
    c.arc(x, y, p.isMe ? 2.1 : 1.8, 0, Math.PI * 2);
    c.fill();
    if (p.isMe) {
      c.lineWidth = 0.55;
      c.strokeStyle = rgba(p.color, 0.5);
      c.beginPath();
      c.moveTo(x - 6, y);
      c.lineTo(x + 6, y);
      c.moveTo(x, y - 6);
      c.lineTo(x, y + 6);
      c.stroke();
    }
    c.restore();
  }

  /** Labels find their own rows instead of needing hand-positioned offsets. */
  drawLabels(tips) {
    const c = this.ctx;
    const placed = [];
    const ordered = [...tips].sort((a, b) =>
      a.p.isMe ? -1 : b.p.isMe ? 1 : a.x - b.x,
    );
    c.save();
    for (const tip of ordered) {
      if (tip.alpha < 0.015) continue;
      const { p, x, y } = tip;
      const font = this.mobile ? (p.name.length > 13 ? 9 : 10.5) : 12;
      c.font = `400 ${font}px 'DM Sans'`;
      const width = c.measureText(p.name).width;
      const labelX = clamp(
        x,
        this.axisX + width / 2 + 7,
        this.w - width / 2 - 25,
      );
      let labelY = y - 20;
      for (let tries = 0; tries < 8; tries++) {
        const collides = placed.some(
          (rect) =>
            Math.abs(labelX - rect.x) < (width + rect.width) / 2 + 9 &&
            Math.abs(labelY - rect.y) < 16,
        );
        if (!collides) break;
        labelY -= 17;
      }
      c.globalAlpha = tip.alpha;
      if (y - labelY > 28) {
        c.strokeStyle = rgba(p.color, 0.21);
        c.lineWidth = 0.6;
        c.beginPath();
        c.moveTo(x, y - 7);
        c.lineTo(labelX, labelY + 7);
        c.stroke();
      }
      c.textAlign = "center";
      c.fillStyle = this.colors.get(p.id);
      c.fillText(p.name, labelX, labelY);
      placed.push({ x: labelX, y: labelY, width });
    }
    c.restore();
  }

  drawNarrative(age) {
    let index = CHAPTERS.findLastIndex((chapter) => age >= chapter.age);
    index = Math.max(0, index);
    const chapter = CHAPTERS[index];
    if (!chapter.lines.length) return;
    const next = CHAPTERS[index + 1];
    const incoming =
      index === 0 ? 1 : smooth(chapter.age, chapter.age + 1.6, age);
    const outgoing = next ? 1 - smooth(next.age - 1.7, next.age, age) : 1;
    // Give each ascent a moment of quiet. Once a dot has reached the sky,
    // the poem can return while that light rests and slowly fades.
    let departureFocus = 0;
    for (const person of PEOPLE) {
      if (person.endAge === null) continue;
      const arriving = smooth(person.endAge - 0.5, person.endAge + 0.45, age);
      const settled =
        1 -
        smooth(
          person.endAge + DEATH_RISE_YEARS - 0.25,
          person.endAge + DEATH_RISE_YEARS + 0.65,
          age,
        );
      departureFocus = Math.max(departureFocus, arriving * settled);
    }
    const alpha = incoming * outgoing * (1 - departureFocus);
    if (alpha < 0.001) return;
    const c = this.ctx;
    const x = this.mobile ? 48 : this.w * 0.11;
    const initial = index === 0;
    const shortPortrait = this.mobile && this.h < 680;
    const landscape = this.h < 520;
    const font = initial
      ? Math.min(
          this.w * (this.mobile ? 0.158 : 0.076),
          this.h * (shortPortrait ? 0.082 : 0.11),
          this.mobile ? 66 : 100,
        )
      : Math.min(this.w * (this.mobile ? 0.088 : 0.04), this.h * 0.06, 54);
    const kickerGap = shortPortrait ? 16 : initial ? 23 : 26;
    let baseline =
      this.h *
      (initial ? (this.mobile ? 0.225 : 0.235) : this.mobile ? 0.272 : 0.265);
    if (initial && shortPortrait && !landscape)
      baseline = Math.max(baseline, 84 + font * 0.98 + kickerGap);
    const lineHeight = font * (initial ? 0.9 : 1.02);
    c.save();
    c.globalAlpha = alpha;
    c.textAlign = "left";
    c.font = `${this.mobile ? 7 : 8}px 'DM Sans'`;
    c.fillStyle = "rgba(202,184,145,.75)";
    if (!landscape)
      this.tracked(
        `${chapter.number}  /  ${chapter.label.toUpperCase()}`,
        x,
        baseline - font * 0.98 - kickerGap,
        this.mobile ? 1.5 : 2,
      );
    chapter.lines.forEach((line, i) => {
      c.font = `${i === 1 ? "italic " : ""}400 ${font}px Cormorant`;
      c.fillStyle = i === 0 ? "#e8e6df" : "#d3d0c8";
      c.fillText(line, x, baseline + i * lineHeight);
    });
    const noteY =
      baseline +
      lineHeight +
      (initial
        ? font * (shortPortrait ? 0.36 : 0.46) + (shortPortrait ? 9 : 10)
        : shortPortrait
          ? 22
          : 32);
    c.font = `${this.mobile ? 10 : 11}px 'DM Sans'`;
    c.fillStyle = "rgba(172,181,197,.66)";
    if (!landscape)
      chapter.note.forEach((line, i) =>
        c.fillText(
          line,
          x + 1,
          noteY + i * (shortPortrait ? 16 : this.mobile ? 18 : 21),
        ),
      );
    c.restore();
  }

  drawEnding(age) {
    if (age < ENDING_REVEAL_AGE) return;
    const c = this.ctx;
    c.save();
    const title = "Life is a journey";
    let font = this.mobile
      ? Math.min(this.w * 0.117, 53)
      : Math.min(this.w * 0.075, 104);
    c.font = `400 ${font}px Cormorant`;
    let width = c.measureText(title).width;
    if (width > this.w * 0.88) {
      font *= (this.w * 0.88) / width;
      c.font = `400 ${font}px Cormorant`;
      width = c.measureText(title).width;
    }
    const baseline = this.h * 0.513;
    c.textAlign = "left";
    let x = (this.w - width) / 2;
    [...title].forEach((letter, index) => {
      c.globalAlpha = smooth(
        ENDING_REVEAL_AGE + 0.15 + index * 0.05,
        ENDING_REVEAL_AGE + 1.05 + index * 0.05,
        age,
      );
      c.fillStyle = "#ebe7dc";
      c.fillText(letter, x, baseline);
      x += c.measureText(letter).width;
    });
    c.globalAlpha =
      smooth(ENDING_REVEAL_AGE, ENDING_REVEAL_AGE + 1.2, age) * 0.7;
    c.font = `${this.mobile ? 7 : 8}px 'DM Sans'`;
    c.fillStyle = "#c2ad80";
    this.tracked(
      "THE LIGHT WE LEAVE BEHIND",
      this.w / 2,
      baseline - font - 27,
      this.mobile ? 1.5 : 2.4,
      true,
    );
    c.textAlign = "center";
    c.font = `italic 400 ${this.mobile ? 16 : 23}px Cormorant`;
    c.fillStyle = "#a9aebb";
    const lines = [
      "Some threads end. Their light never does.",
      "And somehow, we are still connected.",
    ];
    lines.forEach((line, i) => {
      c.globalAlpha =
        smooth(
          ENDING_REVEAL_AGE + 1.85 + i * 0.35,
          MAX_AGE - 0.45 + i * 0.45,
          age,
        ) * 0.85;
      c.fillText(
        line,
        this.w / 2,
        baseline + (this.mobile ? 39 : 51) + i * (this.mobile ? 25 : 31),
      );
    });
    c.restore();
  }

  tracked(text, x, y, spacing, centered = false) {
    const c = this.ctx;
    if (centered) {
      const width =
        [...text].reduce(
          (sum, letter) => sum + c.measureText(letter).width,
          0,
        ) +
        (text.length - 1) * spacing;
      x -= width / 2;
    }
    for (const letter of text) {
      c.fillText(letter, x, y);
      x += c.measureText(letter).width + spacing;
    }
  }
}
