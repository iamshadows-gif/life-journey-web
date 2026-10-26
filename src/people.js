/**
 * THE ENTIRE CAST. Edit names, colors, ages, or positions here.
 *
 * Ages are the age of “Me”, not the age of the other person.
 * A negative startAge means they are already here when our story begins.
 * endAge: null = this person remains alive through the story and stays on the now line.
 * At endAge (or leaveAge when a sky target is given) the dot rises to skyX/skyY
 * and remains there as a persistent star — no fading away.
 * leaveAge is a passing connection that also rises to a star when skyX/skyY is set.
 * divergeAge / divergeLaneX creates an independent path that stays on-screen.
 * laneX and sky positions are normalized coordinates (0…1).
 * enterFrom sweeps a new thread in from an edge. origin makes a birth branch
 * from another person's thread instead. Nothing is individually keyframed.
 */
export const PEOPLE = [
  {
    id: "grandma",
    name: "Grandma",
    color: "#b9a6dc",
    startAge: -63,
    endAge: 14,
    laneX: 0.12,
    enterFrom: null,
    skyX: 0.59,
    skyY: 0.13,
  },
  {
    id: "mom",
    name: "Mom",
    color: "#d5969b",
    startAge: -27,
    endAge: 58,
    laneX: 0.3,
    enterFrom: null,
    skyX: 0.38,
    skyY: 0.11,
  },
  {
    id: "me",
    name: "Me",
    color: "#dfbd76",
    startAge: 0,
    endAge: null,
    laneX: 0.49,
    enterFrom: null,
    isMe: true,
  },
  {
    id: "dad",
    name: "Dad",
    color: "#8ca9d8",
    startAge: -30,
    endAge: 51,
    laneX: 0.68,
    enterFrom: null,
    skyX: 0.78,
    skyY: 0.17,
  },
  {
    id: "grandpa",
    name: "Grandpa",
    color: "#b3cbc8",
    startAge: -66,
    endAge: 8,
    laneX: 0.87,
    enterFrom: null,
    skyX: 0.84,
    skyY: 0.2,
  },

  {
    id: "school-friend",
    name: "Kindergarten friend",
    color: "#8fc6b1",
    startAge: 4,
    endAge: null,
    leaveAge: 10,
    leaveTo: "left",
    laneX: 0.59,
    enterFrom: "right",
    skyX: 0.18,
    skyY: 0.14,
  },
  {
    id: "childhood-friend",
    name: "Childhood friend",
    color: "#91bcb0",
    startAge: 10,
    endAge: null,
    leaveAge: 23,
    leaveTo: "right",
    laneX: 0.6,
    enterFrom: "left",
    skyX: 0.71,
    skyY: 0.18,
  },
  {
    id: "first-love",
    name: "First love",
    color: "#cc9eb4",
    startAge: 18,
    endAge: null,
    leaveAge: 24,
    leaveTo: "right",
    laneX: 0.57,
    enterFrom: "right",
    skyX: 0.29,
    skyY: 0.16,
  },
  {
    id: "university-friend",
    name: "University friend",
    color: "#b0a7ce",
    startAge: 20,
    endAge: null,
    leaveAge: 33,
    leaveTo: "left",
    laneX: 0.28,
    enterFrom: "left",
    skyX: 0.22,
    skyY: 0.12,
  },
  {
    id: "wife",
    name: "Wife",
    color: "#83bdb5",
    startAge: 28,
    endAge: 78,
    laneX: 0.61,
    enterFrom: "right",
    enterYears: 3.5,
    skyX: 0.62,
    skyY: 0.09,
  },
  {
    id: "child",
    name: "Child",
    color: "#d9acbd",
    startAge: 32,
    endAge: null,
    laneX: 0.76,
    enterFrom: null,
    origin: "wife",
    enterYears: 3,
    // An independent route, not an exit: the child never leaves the canvas.
    // Stays parallel but distinctly farther from Me.
    divergeAge: 68,
    divergeYears: 10,
    divergeLaneX: 0.92,
  },
  {
    id: "coworker",
    name: "Coworker",
    color: "#9db9c9",
    startAge: 36,
    endAge: null,
    leaveAge: 49,
    leaveTo: "left",
    laneX: 0.23,
    enterFrom: "left",
    skyX: 0.15,
    skyY: 0.19,
  },
  {
    id: "old-friend",
    name: "An old friend",
    color: "#b6acd4",
    startAge: 55,
    endAge: null,
    leaveAge: 68,
    leaveTo: "left",
    laneX: 0.29,
    enterFrom: "left",
    skyX: 0.88,
    skyY: 0.14,
  },
];

export const CHAPTERS = [
  {
    age: 0,
    number: "01",
    label: "The beginning",
    lines: ["A life,", "interwoven."],
    note: ["Some stay. Some pass through.", "All leave a little light."],
  },
  {
    age: 6.5,
    number: "02",
    label: "Our first connections",
    lines: ["Our worlds", "begin to meet."],
    note: ["A familiar face. A shared secret.", "The first threads we choose."],
  },
  {
    age: 18,
    number: "03",
    label: "Crossing paths",
    lines: ["Not every thread", "is meant to stay."],
    note: ["Some people are a season.", "They matter all the same."],
  },
  {
    age: 28,
    number: "04",
    label: "A little fuller",
    lines: ["And then, a life", "becomes our life."],
    note: ["A hand to hold. A new beginning.", "More than we were before."],
  },
  {
    age: 36,
    number: "05",
    label: "A new thread",
    lines: ["A new thread", "begins."],
    note: ["A child arrives. The world grows wider.", "Love learns a new shape."],
  },
  {
    age: 49,
    number: "06",
    label: "The light that stays",
    lines: ["Love changes shape.", "Not its meaning."],
    note: ["What leaves our hands", "does not leave our hearts."],
  },
  {
    age: 56,
    number: "07",
    label: "What we carry",
    lines: ["We carry them", "with us."],
    note: ["Not gone — just above.", "A quieter kind of near."],
  },
  {
    age: 66,
    number: "08",
    label: "A parallel road",
    lines: ["A parallel road", "appears."],
    note: ["A little farther now, still beside us.", "Their own way forward."],
  },
  {
    age: 76,
    number: "09",
    label: "Still here",
    lines: ["Still here.", "Still connected."],
    note: ["Every light remains.", "And we meet them all again."],
  },
  { age: 82, number: "10", label: "The journey", lines: [], note: [] },
];

export const MAX_AGE = 85;
export const SCROLL_DISTANCE = 9000;
// Rise is visible and unhurried; after rising the star stays permanently.
export const DEATH_RISE_YEARS = 4;
export const DEATH_HOLD_YEARS = 1;
export const DEATH_FADE_YEARS = 3;
export const DEATH_YEARS =
  DEATH_RISE_YEARS + DEATH_HOLD_YEARS + DEATH_FADE_YEARS;
// The final message begins after the last stars have settled.
export const ENDING_REVEAL_AGE = 82;
export const LEAVE_YEARS = 4;
