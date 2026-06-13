export const API_URL = "/api/generate";
export const API_MODEL = "gemini-2.5-flash";
export const MAX_TOKENS = 4000;

export const MIN_JOURNAL_LENGTH = 10;
export const MAX_JOURNAL_LENGTH = 1000;

/**
 * Sanitizes input text by removing HTML tags, dangerous characters,
 * trimming, and cutting to max length.
 * @param {string} value - Raw input.
 * @returns {string} Sanitized string.
 */
export function sanitizeInput(value) {
  if (typeof value !== "string") {
    return value;
  }
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[<>"'`]/g, "")
    .trim()
    .slice(0, MAX_JOURNAL_LENGTH);
}

/**
 * Parses JSON response from Google Gemini, stripping markdown code blocks.
 * @param {string} text - Raw model response.
 * @returns {object} Parsed JSON.
 */
export function parseAIResponse(text) {
  let cleaned = (text || "").trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "");
  cleaned = cleaned.replace(/\n?```\s*$/i, "");
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Fallback: extract first {...} block
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (innerErr) {
        // no-op
      }
    }
  }
  throw new Error("Could not parse AI response");
}

/**
 * Calculates countdown in days from exam date.
 * @param {string} examDateStr - Date input string.
 * @returns {number} Days remaining.
 */
export function calculateDaysRemaining(examDateStr) {
  if (!examDateStr) return 0;
  const [year, month, day] = examDateStr.split("-").map(Number);
  const examDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = examDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Sends messages to Google Gemini via fetch.
 * @param {string} systemPrompt - System constraints.
 * @param {Array} messages - Chat logs.
 * @returns {Promise<string>} Gemini response text.
 */
export async function callGeminiAPI(systemPrompt, messages) {
  const contents = messages.map((msg) => {
    const role = msg.role === "assistant" ? "model" : "user";
    return {
      role: role,
      parts: [{ text: msg.content }],
    };
  });

  const payload = {
    contents: contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      maxOutputTokens: MAX_TOKENS,
      temperature: 0.7,
    },
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 400) {
      throw new Error(
        "API key missing or invalid. Check GEMINI_API_KEY in .env.local"
      );
    }
    if (status === 429) {
      throw new Error(
        "Rate limit reached. Please wait a minute and try again."
      );
    }
    throw new Error(
      `API error (${status}). Please check server connection.`
    );
  }

  const data = await response.json();
  if (
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    data.candidates[0].content.parts[0]
  ) {
    return data.candidates[0].content.parts[0].text;
  }
  throw new Error("Invalid API response format");
}

/**
 * Analyzes a single journal entry using Gemini.
 * @param {object} profile - Student onboarding details.
 * @param {Array} entries - Previous journal entries.
 * @param {object} currentEntry - The current entry being submitted.
 * @returns {Promise<object>} Coping and sentiment insights.
 */
export async function analyzeJournalEntry(profile, entries, currentEntry) {
  const systemPrompt = "You are a professional wellness companion. Return ONLY valid JSON.";
  const prompt = `
    Student profile:
    - Name: ${sanitizeInput(profile.name)}
    - Target Exam: ${profile.exam}
    - Biggest Fear: ${profile.biggestFear}
    - Daily Study Hours: ${profile.studyHours}
    - Support: ${profile.supportSystem.join(", ")}

    New journal entry:
    - Mood: ${currentEntry.mood}
    - Energy Level: ${currentEntry.energy}/10
    - Text: "${sanitizeInput(currentEntry.text)}"

    Past Moods/Journal logs:
    ${entries
      .slice(-3)
      .map((e) => `- Mood: ${e.mood}, Text: "${sanitizeInput(e.text)}"`)
      .join("\n")}

    Generate analysis matching this exact JSON schema:
    {
      "emotionalState": "string — empathetic 1-sentence summary",
      "stressTriggers": ["string", "string"],
      "copingStrategies": [
        {
          "title": "string",
          "description": "string",
          "duration": "string",
          "examContext": "string"
        }
      ],
      "affirmation": "string — personalized motivational message using student name and exam",
      "urgencyLevel": "low|medium|high",
      "followUpQuestion": "string — one gentle follow-up question to deepen reflection"
    }
  `;

  const messages = [{ role: "user", content: prompt }];
  const responseText = await callGeminiAPI(systemPrompt, messages);
  return parseAIResponse(responseText);
}

/**
 * Interacts with AI companion using full multi-turn context.
 * @param {object} profile - Student profile.
 * @param {Array} journalHistory - Journal entries context.
 * @param {Array} chatHistory - Interactive chat logs.
 * @param {string} userMessage - The last user text.
 * @returns {Promise<string>} empathetic plain text response.
 */
export async function chatWithCompanion(
  profile,
  journalHistory,
  chatHistory,
  userMessage
) {
  const systemPrompt =
    "You are MindEase, an empathetic mental wellness companion for Indian students.\n" +
    "You are aware of Indian exam stress (NEET, JEE, UPSC, Board Exams), pressure, and fears.\n" +
    "Adopt a warm, encouraging, supportive tone. Maintain student context.\n" +
    "Keep answers concise, therapeutic, and focused on wellness, study tips, or motivation.";

  const contextMessages = [];

  const contextDesc =
    `I am a student named ${sanitizeInput(profile.name)} preparing for ${profile.exam}.\n` +
    `My exam date is ${profile.examDate}. My biggest exam fear is ${profile.biggestFear}.\n` +
    `My study hours are ${profile.studyHours}/day. My support system is ${profile.supportSystem.join(
      ", "
    )}.\n` +
    `My recent journal moods have been: ${journalHistory.map((j) => j.mood).join(", ")}.`;

  contextMessages.push({
    role: "user",
    content: `Hello! ${contextDesc}`,
  });
  contextMessages.push({
    role: "assistant",
    content:
      `Hello ${profile.name}! I am MindEase, your companion. ` +
      `I know preparing for ${profile.exam} can be stressful. ` +
      "How can I support you today?",
  });

  chatHistory.forEach((chat) => {
    contextMessages.push({
      role: chat.sender === "user" ? "user" : "assistant",
      content: sanitizeInput(chat.text),
    });
  });

  contextMessages.push({
    role: "user",
    content: sanitizeInput(userMessage),
  });

  return await callGeminiAPI(systemPrompt, contextMessages);
}

/**
 * Generates 3 personalized mindfulness exercises.
 * @param {object} profile - Student profile.
 * @param {string} currentMood - Latest mood string.
 * @param {number} energyLevel - Latest energy score.
 * @returns {Promise<object>} Mindfulness suggestions.
 */
export async function generateMindfulnessExercises(
  profile,
  currentMood,
  energyLevel
) {
  const systemPrompt = "You are a meditation expert. Return ONLY valid JSON.";
  const prompt = `
    Student info:
    - Name: ${sanitizeInput(profile.name)}
    - Target Exam: ${profile.exam}
    - Mood: ${currentMood}
    - Energy Level: ${energyLevel}/10

    Provide exactly 3 custom mindfulness exercises appropriate for their mood and stress level.
    Schema:
    {
      "exercises": [
        {
          "name": "string",
          "emoji": "string",
          "duration": "string",
          "steps": ["string", "string", "string"],
          "whyItHelps": "string (exam-context specific)"
        }
      ]
    }
  `;

  const messages = [{ role: "user", content: prompt }];
  const responseText = await callGeminiAPI(systemPrompt, messages);
  return parseAIResponse(responseText);
}

/**
 * Analyzes overall emotional patterns across multiple entries.
 * @param {object} profile - Student profile.
 * @param {Array} allEntries - List of all journal entries.
 * @returns {Promise<object>} Patterns analysis payload.
 */
export async function analyzeEmotionalPatterns(profile, allEntries) {
  const systemPrompt = "You are a data analyst and psychologist. Return ONLY valid JSON.";
  const prompt = `
    Analyze emotional patterns for student ${sanitizeInput(profile.name)} preparing for ${
    profile.exam
  }.
    Journal logs:
    ${allEntries
      .map(
        (e, i) =>
          `Entry ${i + 1}: Mood: ${e.mood}, Energy: ${e.energy}/10, Text: "${sanitizeInput(
            e.text
          )}"`
      )
      .join("\n")}

    Generate trend and trigger analysis. JSON Schema:
    {
      "topTriggers": [
        { "trigger": "string", "frequency": "string", "explanation": "string" }
      ],
      "trend": "improving|declining|fluctuating",
      "trendReasoning": "string",
      "hiddenPattern": "string",
      "actionPlan": ["string", "string", "string"]
    }
  `;

  const messages = [{ role: "user", content: prompt }];
  const responseText = await callGeminiAPI(systemPrompt, messages);
  return parseAIResponse(responseText);
}
