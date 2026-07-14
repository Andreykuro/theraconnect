// Lightweight, dependency-free intent matcher for the FAQ chatbot.
// Deliberately rule-based (no ML/NLP library) - it's fast, fully explainable,
// has zero training-data requirements, and covers a fixed, known FAQ set.
// That trade-off is worth calling out explicitly in your defense: it's a
// scoped, defensible design choice, not a placeholder for "real AI".

const faqs = require("../data/faq.json");

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreEntry(entry, normalizedMessage) {
  let score = 0;
  for (const kw of entry.keywords) {
    if (normalizedMessage.includes(kw)) {
      score += kw.split(" ").length; // multi-word keyword matches score higher
    }
  }
  return score;
}

function ask(message) {
  const normalized = normalize(message || "");
  const fallback = faqs.find((f) => f.id === "fallback");

  let best = null;
  let bestScore = 0;

  for (const entry of faqs) {
    if (entry.id === "fallback") continue;
    const score = scoreEntry(entry, normalized);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (best && bestScore > 0) {
    return { matched: best.id, answer: best.answer };
  }
  return { matched: "fallback", answer: fallback.answer };
}

module.exports = { ask };
