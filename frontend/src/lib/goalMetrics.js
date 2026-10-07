// resultHint = placeholder for "Today's result" in the session note.
// Plain-language descriptions of the five ways a treatment goal can be measured.
// Shared by the "Add goal" form and the session-note form so both use the same wording.

export const ASSISTANCE_SCALE = [
  { value: 1, label: "1 - Full help (hand-over-hand)" },
  { value: 2, label: "2 - Moderate help" },
  { value: 3, label: "3 - Minimal help (a cue or reminder)" },
  { value: 4, label: "4 - Independent (no help)" },
];

export const METRICS = [
  {
    value: "accuracy",
    short: "Accuracy (% correct)",
    label: "Accuracy - % of correct tries",
    unit: "%",
    lockedUnit: true,
    explain: "Out of all the tries in a session, how many were correct. Example: 14 correct out of 20 tries = 70%.",
    resultHint: "e.g. 70 (14 of 20)",
    example: { baseline: 40, target: 80 },
  },
  {
    value: "frequency",
    short: "Count (number of times)",
    label: "Count - how many times it happened",
    unit: "times",
    unitOptions: ["times", "words", "requests", "turns", "tantrums"],
    explain: "Count how many times the child did the behavior during the session. Example: said 5 words on his own. For things you want less of (e.g. tantrums), set a target lower than the start.",
    resultHint: "e.g. 5",
    example: { baseline: 2, target: 10 },
  },
  {
    value: "duration",
    short: "Time (how long)",
    label: "Time - how long it lasted",
    unit: "minutes",
    unitOptions: ["minutes", "seconds"],
    explain: "How long the child kept doing the behavior. Example: sat and paid attention for 5 minutes.",
    resultHint: "e.g. 3",
    example: { baseline: 2, target: 10 },
  },
  {
    value: "rating",
    short: "Rating (1-5)",
    label: "Rating - score on a 1 to 5 scale",
    unit: "points (1-5)",
    lockedUnit: true,
    explain: "Your own judgement on a 1 to 5 scale: 1 = not yet, 3 = sometimes, 5 = mastered.",
    resultHint: "1 to 5",
    example: { baseline: 1, target: 5 },
  },
  {
    value: "assistance",
    short: "Help level (1-4)",
    label: "Help level - how much help was needed",
    unit: "level (1-4)",
    lockedUnit: true,
    explain: "How much help the child needed: 1 = full help, 2 = moderate, 3 = minimal, 4 = independent.",
    resultHint: "",
    example: { baseline: 1, target: 4 },
  },
];

export function metricFor(type) {
  return METRICS.find((metric) => metric.value === type) || METRICS[0];
}

// The number only needs a word after it when the unit is not "%".
export function withUnit(value, unit) {
  if (value === null || value === undefined || value === "") return "-";
  return unit === "%" ? `${value}%` : `${value} ${unit}`;
}

// Same formula the server uses: how far the child has moved from the start
// toward the target, as a percent (0-100).
export function progressFor(baseline, target, current) {
  const b = Number(baseline);
  const t = Number(target);
  const c = Number(current);
  if (![b, t, c].every(Number.isFinite)) return null;
  if (b === t) return c === t ? 100 : 0;
  return Math.round(Math.min(Math.max(((c - b) / (t - b)) * 100, 0), 100));
}
