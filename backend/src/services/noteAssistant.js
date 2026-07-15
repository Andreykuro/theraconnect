function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_DEFAULT_MODEL = "gpt-5.6-luna";

const NOTE_DRAFT_SCHEMA = {
  type: "object",
  properties: {
    subjective: { type: "string" },
    intervention: { type: "string" },
    assessment: { type: "string" },
    plan: { type: "string" },
    parent_summary: { type: "string" },
    suggested_measurements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          goal_id: { type: "integer" },
          value: { type: "number" },
          observation: { type: "string" },
        },
        required: ["goal_id", "value", "observation"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "subjective",
    "intervention",
    "assessment",
    "plan",
    "parent_summary",
    "suggested_measurements",
  ],
  additionalProperties: false,
};

function sentencesFrom(rawNotes) {
  return clean(rawNotes)
    .split(/(?:\r?\n|(?<=[.!?])\s+)/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function findMeasurement(sentence) {
  const ratio = sentence.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (ratio && Number(ratio[2]) > 0) {
    return { value: (Number(ratio[1]) / Number(ratio[2])) * 100, source: ratio[0] };
  }
  const percentage = sentence.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentage) return { value: Number(percentage[1]), source: percentage[0] };
  return null;
}

function goalKeywords(goal) {
  return clean(`${goal.title} ${goal.description || ""}`)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !["with", "from", "will", "child"].includes(word));
}

function measurementSuggestions(sentences, goals) {
  const suggestions = [];
  const usedSentences = new Set();

  for (const goal of goals) {
    const keywords = goalKeywords(goal);
    let matchedIndex = sentences.findIndex((sentence, index) => {
      if (usedSentences.has(index)) return false;
      const lower = sentence.toLowerCase();
      return keywords.some((keyword) => lower.includes(keyword)) && findMeasurement(sentence);
    });

    if (matchedIndex < 0 && goals.length === 1) {
      matchedIndex = sentences.findIndex(
        (sentence, index) => !usedSentences.has(index) && findMeasurement(sentence)
      );
    }
    if (matchedIndex < 0) continue;

    const found = findMeasurement(sentences[matchedIndex]);
    if (!found) continue;
    usedSentences.add(matchedIndex);
    suggestions.push({
      goal_id: goal.id,
      value: Number(found.value.toFixed(1)),
      observation: `Suggested from therapist entry: ${sentences[matchedIndex]}`,
    });
  }
  return suggestions;
}

function localDraft(rawNotes, goals) {
  const sentences = sentencesFrom(rawNotes);
  const interventionSentences = sentences.filter((sentence) =>
    /practi[cs]|worked|activity|exercise|task|target|session|used|completed/i.test(sentence)
  );
  const assessmentSentences = sentences.filter((sentence) =>
    /independent|prompt|assist|accuracy|improv|difficulty|respond|tolerat|\d+\s*\/\s*\d+|\d+\s*%/i.test(
      sentence
    )
  );
  const activeGoalNames = goals.slice(0, 3).map((goal) => goal.title);

  const intervention =
    interventionSentences.join(" ") || sentences.slice(0, Math.max(1, Math.ceil(sentences.length / 2))).join(" ");
  const assessment =
    assessmentSentences.join(" ") ||
    "The therapist recorded the session activities. Add the child's response and level of assistance before approving.";
  const nextFocus = activeGoalNames.length
    ? `Continue the current plan with emphasis on ${activeGoalNames.join(", ")}.`
    : "Continue the current treatment plan and record a measurable outcome next session.";

  return {
    subjective: sentences[0] || "",
    intervention,
    assessment,
    plan: nextFocus,
    parent_summary: activeGoalNames.length
      ? `Today's session worked on ${activeGoalNames.join(", ")}. The therapist will continue monitoring progress in upcoming sessions.`
      : "Today's session followed the current treatment plan. The therapist will continue monitoring progress in upcoming sessions.",
    suggested_measurements: measurementSuggestions(sentences, goals),
  };
}

function normalizeExternalDraft(data, fallback) {
  const draft = data?.draft || data;
  if (!draft || typeof draft !== "object") return fallback;
  return {
    subjective: clean(draft.subjective) || fallback.subjective,
    intervention: clean(draft.intervention) || fallback.intervention,
    assessment: clean(draft.assessment) || fallback.assessment,
    plan: clean(draft.plan) || fallback.plan,
    parent_summary: clean(draft.parent_summary) || fallback.parent_summary,
    suggested_measurements: Array.isArray(draft.suggested_measurements)
      ? draft.suggested_measurements
      : fallback.suggested_measurements,
  };
}

function openAIOutputText(data) {
  if (data?.status === "incomplete") {
    throw new Error("OpenAI returned an incomplete response");
  }

  const message = data?.output?.find((item) => item.type === "message");
  const refusal = message?.content?.find((item) => item.type === "refusal");
  if (refusal) throw new Error("OpenAI declined to draft this note");

  const output = message?.content?.find((item) => item.type === "output_text");
  if (!output?.text) throw new Error("OpenAI returned no note content");
  return output.text;
}

function noteInput(rawNotes, goals) {
  return JSON.stringify({
    task: "Draft a pediatric therapy session note for therapist review.",
    deidentified_raw_notes: rawNotes,
    treatment_goals: goals.map(({ id, title, description, metric_type, unit }) => ({
      id,
      title,
      description,
      metric_type,
      unit,
    })),
  });
}

async function generateOpenAIDraft({ rawNotes, goals }) {
  const model = clean(process.env.OPENAI_MODEL) || OPENAI_DEFAULT_MODEL;
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 1200,
      input: [
        {
          role: "system",
          content:
            "You assist licensed pediatric therapists with documentation. Use only the supplied de-identified facts. Do not diagnose, invent observations, change treatment, or imply that AI output is clinically approved. Keep the parent summary plain, neutral, and free of internal clinical speculation. Suggested measurements must use only supplied goal IDs and values explicitly supported by the raw notes. A therapist must review every field before it is saved.",
        },
        { role: "user", content: noteInput(rawNotes, goals) },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "pediatric_therapy_note_draft",
          schema: NOTE_DRAFT_SCHEMA,
          strict: true,
        },
      },
    }),
  });

  if (!response.ok) throw new Error(`OpenAI returned ${response.status}`);
  const data = await response.json();
  return { draft: JSON.parse(openAIOutputText(data)), model };
}

async function generateConfiguredDraft({ endpoint, rawNotes, goals }) {
  const headers = { "Content-Type": "application/json" };
  if (process.env.AI_NOTES_API_KEY) {
    headers.Authorization = `Bearer ${process.env.AI_NOTES_API_KEY}`;
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      task: "draft_pediatric_therapy_session_note",
      raw_notes: rawNotes,
      goals: goals.map(({ id, title, description, metric_type, unit }) => ({
        id,
        title,
        description,
        metric_type,
        unit,
      })),
      requirements: {
        return_json: true,
        require_human_approval: true,
        do_not_diagnose: true,
      },
    }),
  });
  if (!response.ok) throw new Error(`AI note service returned ${response.status}`);
  return response.json();
}

async function generateNoteDraft({ rawNotes, goals }) {
  const fallback = localDraft(rawNotes, goals);
  if (process.env.OPENAI_API_KEY) {
    try {
      const { draft, model } = await generateOpenAIDraft({ rawNotes, goals });
      return {
        draft: normalizeExternalDraft(draft, fallback),
        provider: `openai:${model}`,
        status: "completed",
      };
    } catch (error) {
      return { draft: fallback, provider: "local-fallback", status: "fallback" };
    }
  }

  const endpoint = process.env.AI_NOTES_ENDPOINT;
  if (!endpoint) return { draft: fallback, provider: "local", status: "completed" };

  try {
    const data = await generateConfiguredDraft({ endpoint, rawNotes, goals });
    return {
      draft: normalizeExternalDraft(data, fallback),
      provider: "configured",
      status: "completed",
    };
  } catch (error) {
    return { draft: fallback, provider: "local-fallback", status: "fallback" };
  }
}

module.exports = { generateNoteDraft };
