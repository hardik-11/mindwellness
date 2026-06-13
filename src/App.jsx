// --------------------------------------------------------------------------------
// SECTION 1: Constants & Config
// --------------------------------------------------------------------------------

import { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";

const API_URL = "/api/generate";
const API_MODEL = "gemini-2.5-flash";
const MAX_TOKENS = 4000;

const MIN_JOURNAL_LENGTH = 10;
const MAX_JOURNAL_LENGTH = 1000;

const MOODS = [
  { label: "Great", emoji: "😊", score: 5 },
  { label: "Okay", emoji: "🙂", score: 4 },
  { label: "Meh", emoji: "😐", score: 3 },
  { label: "Low", emoji: "😟", score: 2 },
  { label: "Overwhelmed", emoji: "😰", score: 1 },
];

const EXAMS = [
  "NEET",
  "JEE",
  "CUET",
  "CAT",
  "GATE",
  "UPSC",
  "Board Exams",
  "Other",
];

const FEARS = [
  "Failing",
  "Disappointing Parents",
  "Not Getting Rank",
  "Blanking in Exam",
  "Other",
];

const SUPPORT_SYSTEMS = ["Family", "Friends", "Mentor", "None"];

const KEYFRAME_CSS = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

// --------------------------------------------------------------------------------
// SECTION 2: Helper / Utility Functions
// --------------------------------------------------------------------------------

/**
 * Sanitizes input text by removing HTML tags, dangerous characters,
 * trimming, and cutting to max length.
 * @param {string} value - Raw input.
 * @returns {string} Sanitized string.
 */
function sanitizeInput(value) {
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
function parseAIResponse(text) {
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
function calculateDaysRemaining(examDateStr) {
  if (!examDateStr) return 0;
  const examDate = new Date(examDateStr);
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
async function callGeminiAPI(systemPrompt, messages) {
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
async function analyzeJournalEntry(profile, entries, currentEntry) {
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
async function chatWithCompanion(profile, journalHistory, chatHistory, userMessage) {
  const systemPrompt =
    "You are MindEase, an empathetic mental wellness companion for Indian students.\n" +
    "You are aware of Indian exam stress (NEET, JEE, UPSC, Board Exams), pressure, and fears.\n" +
    "Adopt a warm, encouraging, supportive tone. Maintain student context.\n" +
    "Keep answers concise, therapeutic, and focused on wellness, study tips, or motivation.";

  const contextMessages = [];

  // Provide initial profile context in first assistant message setup
  const contextDesc = `I am a student named ${sanitizeInput(profile.name)} preparing for ${
    profile.exam
  }.
  My exam date is ${profile.examDate}. My biggest exam fear is ${profile.biggestFear}.
  My study hours are ${profile.studyHours}/day. My support system is ${profile.supportSystem.join(
    ", "
  )}.
  My recent journal moods have been: ${journalHistory.map((j) => j.mood).join(", ")}.`;

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

  // Load chat history
  chatHistory.forEach((chat) => {
    contextMessages.push({
      role: chat.sender === "user" ? "user" : "assistant",
      content: sanitizeInput(chat.text),
    });
  });

  // Push latest user message
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
async function generateMindfulnessExercises(profile, currentMood, energyLevel) {
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
async function analyzeEmotionalPatterns(profile, allEntries) {
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

// --------------------------------------------------------------------------------
// SECTION 3: Sub-Components
// --------------------------------------------------------------------------------

/**
 * Custom DatePicker component styled with pure CSS-in-JS.
 * Allows picking future dates from a beautiful calendar interface.
 */
function DatePicker(props) {
  const { value, onChange, min, error } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayIndex(year, month) {
    return new Date(year, month, 1).getDay();
  }

  function handlePrevMonth() {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }

  function handleNextMonth() {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }

  function handleSelectDay(day) {
    const selectedDate = new Date(currentYear, currentMonth, day);
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const dd = String(selectedDate.getDate()).padStart(2, "0");
    const formatted = `${yyyy}-${mm}-${dd}`;
    onChange(formatted);
    setIsOpen(false);
  }

  const totalDays = getDaysInMonth(currentYear, currentMonth);
  const firstDayIdx = getFirstDayIndex(currentYear, currentMonth);
  const minDate = min ? new Date(min) : null;
  if (minDate) {
    minDate.setHours(0, 0, 0, 0);
  }

  const daysGrid = [];
  for (let i = 0; i < firstDayIdx; i++) {
    daysGrid.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    daysGrid.push(d);
  }

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%" }}
    >
      <input
        type="text"
        readOnly
        placeholder="Select Date"
        value={value}
        onClick={() => setIsOpen(!isOpen)}
        style={error ? styles.inputError : styles.input}
      />
      {isOpen && (
        <div style={styles.calendarDropdown}>
          <div style={styles.calendarHeader}>
            <button
              type="button"
              onClick={handlePrevMonth}
              style={styles.calNavBtn}
            >
              ◀
            </button>
            <span style={styles.calTitle}>
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              style={styles.calNavBtn}
            >
              ▶
            </button>
          </div>

          <div style={styles.calDayNames}>
            {dayNames.map((d) => (
              <span key={d} style={styles.calDayNameLabel}>
                {d}
              </span>
            ))}
          </div>

          <div style={styles.calDaysGrid}>
            {daysGrid.map((day, idx) => {
              if (day === null) {
                return (
                  <span
                    key={`empty-${idx}`}
                    style={styles.calDayEmpty}
                  />
                );
              }

              const cellDate = new Date(currentYear, currentMonth, day);
              cellDate.setHours(0, 0, 0, 0);

              const isPast = minDate && cellDate < minDate;
              const paddedMonth = String(currentMonth + 1).padStart(
                2,
                "0"
              );
              const paddedDay = String(day).padStart(2, "0");
              const isSelected =
                value === `${currentYear}-${paddedMonth}-${paddedDay}`;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleSelectDay(day)}
                  style={{
                    ...styles.calDayCell,
                    ...(isPast ? styles.calDayDisabled : {}),
                    ...(isSelected ? styles.calDaySelected : {}),
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

DatePicker.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  min: PropTypes.string,
  error: PropTypes.string,
};

/**
 * OnboardingScreen collects student's profile settings.
 */
function OnboardingScreen(props) {
  const { profile, onUpdateProfile, onComplete } = props;
  const [localErrors, setLocalErrors] = useState({});

  function handleInputChange(field, val) {
    onUpdateProfile({ ...profile, [field]: val });
    if (localErrors[field]) {
      setLocalErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  }

  function handleCheckboxToggle(item) {
    const activeSystems = [...profile.supportSystem];
    if (item === "None") {
      if (activeSystems.includes("None")) {
        handleInputChange("supportSystem", []);
      } else {
        handleInputChange("supportSystem", ["None"]);
      }
      return;
    }

    const withoutNone = activeSystems.filter((s) => s !== "None");
    if (withoutNone.includes(item)) {
      handleInputChange(
        "supportSystem",
        withoutNone.filter((s) => s !== item)
      );
    } else {
      handleInputChange("supportSystem", [...withoutNone, item]);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errors = {};
    if (!profile.name.trim()) {
      errors.name = "Please enter your name";
    }
    if (!profile.examDate) {
      errors.examDate = "Please choose an exam date";
    }
    if (!profile.exam) {
      errors.exam = "Please select your target exam";
    }
    if (!profile.biggestFear) {
      errors.biggestFear = "Please select your primary fear";
    }

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
      return;
    }
    onComplete();
  }

  return (
    <div style={styles.onboardingCard}>
      <h2 style={styles.onboardingTitle}>Welcome, Exam Warrior 🎯</h2>
      <p style={styles.onboardingSubtitle}>
        High-stakes exams like JEE, NEET, and UPSC demand immense mental resilience.
        MindEase is your sanctuary. Let&apos;s personalize your companion.
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label htmlFor="student-name" style={styles.fieldLabel}>
            What is your name?
          </label>
          <input
            id="student-name"
            type="text"
            placeholder="Enter your name"
            value={profile.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            style={localErrors.name ? styles.inputError : styles.input}
          />
          {localErrors.name && <span style={styles.errorText}>{localErrors.name}</span>}
        </div>

        <div style={styles.formGrid}>
          <div style={styles.field}>
            <label htmlFor="target-exam" style={styles.fieldLabel}>
              Target Exam
            </label>
            <select
              id="target-exam"
              value={profile.exam}
              onChange={(e) => handleInputChange("exam", e.target.value)}
              style={localErrors.exam ? styles.selectError : styles.select}
            >
              <option value="">Select Exam</option>
              {EXAMS.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
            {localErrors.exam && <span style={styles.errorText}>{localErrors.exam}</span>}
          </div>

          <div style={styles.field}>
            <label htmlFor="exam-date" style={styles.fieldLabel}>
              Exam Date
            </label>
            <DatePicker
              value={profile.examDate}
              onChange={(val) => handleInputChange("examDate", val)}
              min={new Date().toISOString().split("T")[0]}
              error={localErrors.examDate}
            />
            {localErrors.examDate && (
              <span style={styles.errorText}>{localErrors.examDate}</span>
            )}
          </div>
        </div>

        <div style={styles.field}>
          <label htmlFor="study-hours" style={styles.fieldLabel}>
            Average Study Hours Per Day: {profile.studyHours} hours
          </label>
          <input
            id="study-hours"
            type="range"
            min="1"
            max="16"
            value={profile.studyHours}
            onChange={(e) => handleInputChange("studyHours", parseInt(e.target.value, 10))}
            style={styles.rangeInput}
          />
        </div>

        <div style={styles.field}>
          <label htmlFor="biggest-fear" style={styles.fieldLabel}>
            Your Biggest Fear
          </label>
          <select
            id="biggest-fear"
            value={profile.biggestFear}
            onChange={(e) => handleInputChange("biggestFear", e.target.value)}
            style={localErrors.biggestFear ? styles.selectError : styles.select}
          >
            <option value="">Select Primary Concern</option>
            {FEARS.map((fear) => (
              <option key={fear} value={fear}>
                {fear}
              </option>
            ))}
          </select>
          {localErrors.biggestFear && (
            <span style={styles.errorText}>{localErrors.biggestFear}</span>
          )}
        </div>

        <div style={styles.field}>
          <label style={styles.fieldLabel}>Who supports you in this phase?</label>
          <div style={styles.checkboxContainer}>
            {SUPPORT_SYSTEMS.map((sys) => {
              const isChecked = profile.supportSystem.includes(sys);
              return (
                <button
                  key={sys}
                  type="button"
                  onClick={() => handleCheckboxToggle(sys)}
                  style={isChecked ? styles.btnCheckboxActive : styles.btnCheckbox}
                  aria-pressed={isChecked}
                >
                  {sys}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          style={styles.btnPrimary}
          aria-label="Begin my wellness journey"
        >
          Begin My Journey 🚀
        </button>
      </form>
    </div>
  );
}

OnboardingScreen.propTypes = {
  profile: PropTypes.shape({
    name: PropTypes.string,
    exam: PropTypes.string,
    examDate: PropTypes.string,
    studyHours: PropTypes.number,
    biggestFear: PropTypes.string,
    supportSystem: PropTypes.array,
  }).isRequired,
  onUpdateProfile: PropTypes.func.isRequired,
  onComplete: PropTypes.func.isRequired,
};

/**
 * JournalTab allows logging daily mood and stress analysis.
 */
function JournalTab(props) {
  const {
    entries,
    onAddEntry,
    insightCard,
    setInsightCard,
    loading,
    setLoading,
    profile,
    currentMood,
    setCurrentMood,
    currentEnergy,
    setCurrentEnergy,
    journalText,
    setJournalText,
    onError,
  } = props;

  const [validationErrors, setValidationErrors] = useState({});
  const insightRef = useRef(null);

  function handleMoodSelect(moodLabel) {
    setCurrentMood(moodLabel);
    setValidationErrors((prev) => {
      const copy = { ...prev };
      delete copy.mood;
      return copy;
    });
  }

  function handleTextChange(e) {
    setJournalText(e.target.value);
    if (validationErrors.text && e.target.value.length >= MIN_JOURNAL_LENGTH) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy.text;
        return copy;
      });
    }
  }

  async function handleAnalyze(e) {
    e.preventDefault();
    const errors = {};
    if (!currentMood) {
      errors.mood = "Please select your current mood.";
    }
    if (journalText.trim().length < MIN_JOURNAL_LENGTH) {
      errors.text = `Please write at least ${MIN_JOURNAL_LENGTH} characters.`;
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading((prev) => ({ ...prev, journal: true }));
    onError(null);

    const newEntry = {
      timestamp: new Date().toLocaleString(),
      mood: currentMood,
      energy: currentEnergy,
      text: journalText,
    };

    try {
      const insight = await analyzeJournalEntry(profile, entries, newEntry);
      setInsightCard(insight);
      onAddEntry(newEntry);
      setJournalText("");
      setCurrentMood(null);
      setCurrentEnergy(5);
      setTimeout(() => {
        if (insightRef.current) {
          insightRef.current.focus();
        }
      }, 150);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading((prev) => ({ ...prev, journal: false }));
    }
  }

  return (
    <div style={styles.journalLayout}>
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>How are you feeling right now? 📓</h3>
        <form onSubmit={handleAnalyze} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.fieldLabel}>Current Mood</label>
            <div style={styles.moodButtonGroup}>
              {MOODS.map((m) => {
                const isSelected = currentMood === m.label;
                return (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => handleMoodSelect(m.label)}
                    style={isSelected ? styles.moodBtnActive : styles.moodBtn}
                    aria-label={`Select ${m.label} mood`}
                    aria-pressed={isSelected}
                  >
                    <span style={styles.moodEmoji}>{m.emoji}</span>
                    <span style={styles.moodLabel}>{m.label}</span>
                  </button>
                );
              })}
            </div>
            {validationErrors.mood && (
              <span style={styles.errorText}>{validationErrors.mood}</span>
            )}
          </div>

          <div style={styles.field}>
            <label htmlFor="journal-energy" style={styles.fieldLabel}>
              Energy Level: {currentEnergy} / 10
            </label>
            <input
              id="journal-energy"
              type="range"
              min="1"
              max="10"
              value={currentEnergy}
              onChange={(e) => setCurrentEnergy(parseInt(e.target.value, 10))}
              style={styles.rangeInput}
            />
          </div>

          <div style={styles.field}>
            <div style={styles.textareaHeader}>
              <label htmlFor="journal-textarea" style={styles.fieldLabel}>
                Pen down your thoughts
              </label>
              <span style={styles.charCounter}>
                {journalText.length} / {MAX_JOURNAL_LENGTH}
              </span>
            </div>
            <textarea
              id="journal-textarea"
              rows={5}
              maxLength={MAX_JOURNAL_LENGTH}
              placeholder="How was your study session today? What's on your mind? Write freely..."
              value={journalText}
              onChange={handleTextChange}
              style={validationErrors.text ? styles.textareaError : styles.textarea}
            />
            {validationErrors.text && (
              <span style={styles.errorText}>{validationErrors.text}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading.journal}
            style={loading.journal ? styles.btnPrimaryDisabled : styles.btnPrimary}
          >
            {loading.journal ? "Analyzing Stress..." : "Analyze & Get Support ✨"}
          </button>
        </form>
      </div>

      {loading.journal && (
        <div style={styles.spinnerWrapper} role="status" aria-live="polite">
          <div style={styles.spinner} />
          <p style={styles.spinnerText}>Evaluating journal dynamics...</p>
        </div>
      )}

      {insightCard && !loading.journal && (
        <div
          ref={insightRef}
          tabIndex={-1}
          style={{
            ...styles.insightCard,
            borderLeftColor:
              insightCard.urgencyLevel === "high"
                ? "#f472b6"
                : insightCard.urgencyLevel === "medium"
                ? "#fbbf24"
                : "#4ade80",
          }}
        >
          <div style={styles.insightHeader}>
            <h4 style={styles.insightTitle}>AI Support Insight</h4>
            <span
              style={
                insightCard.urgencyLevel === "high"
                  ? styles.badgeHigh
                  : insightCard.urgencyLevel === "medium"
                  ? styles.badgeMed
                  : styles.badgeLow
              }
            >
              Urgency: {insightCard.urgencyLevel}
            </span>
          </div>

          <p style={styles.insightText}>
            <strong>Emotional State:</strong> {insightCard.emotionalState}
          </p>

          <div style={styles.triggersSection}>
            <strong>Stress Triggers:</strong>
            <div style={styles.tagGroup}>
              {insightCard.stressTriggers?.map((trig, idx) => (
                <span key={idx} style={styles.triggerTag}>
                  ⚠️ {trig}
                </span>
              ))}
            </div>
          </div>

          <div style={styles.copingGrid}>
            {insightCard.copingStrategies?.map((cop, idx) => (
              <div key={idx} style={styles.copingCard}>
                <h5 style={styles.copingCardTitle}>{cop.title}</h5>
                <p style={styles.copingCardDesc}>{cop.description}</p>
                <div style={styles.copingFooter}>
                  <span>⏱️ {cop.duration}</span>
                  <span>🎓 {cop.examContext}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.affirmationBox}>
            <p style={styles.affirmationText}>&ldquo;{insightCard.affirmation}&rdquo;</p>
          </div>

          {insightCard.followUpQuestion && (
            <div style={styles.followUpBox}>
              <p style={styles.followUpText}>
                <strong>Reflect:</strong> {insightCard.followUpQuestion}
              </p>
            </div>
          )}
        </div>
      )}

      {entries.length > 0 && (
        <div style={styles.pastEntriesSection}>
          <h4 style={styles.subHeading}>Past Journal Entries</h4>
          <div style={styles.entriesList}>
            {entries.map((ent, idx) => {
              const moodMatch = MOODS.find((m) => m.label === ent.mood);
              return (
                <div key={idx} style={styles.entryRow}>
                  <div style={styles.entryRowMeta}>
                    <span style={styles.entryRowEmoji}>
                      {moodMatch ? moodMatch.emoji : "📝"}
                    </span>
                    <div style={styles.entryRowDetails}>
                      <strong style={styles.entryRowMood}>{ent.mood}</strong>
                      <span style={styles.entryRowTime}>{ent.timestamp}</span>
                    </div>
                    <span style={styles.entryRowEnergy}>Energy: {ent.energy}/10</span>
                  </div>
                  <p style={styles.entryRowText}>{ent.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

JournalTab.propTypes = {
  entries: PropTypes.array.isRequired,
  onAddEntry: PropTypes.func.isRequired,
  insightCard: PropTypes.object,
  setInsightCard: PropTypes.func.isRequired,
  loading: PropTypes.object.isRequired,
  setLoading: PropTypes.func.isRequired,
  profile: PropTypes.object.isRequired,
  currentMood: PropTypes.string,
  setCurrentMood: PropTypes.func.isRequired,
  currentEnergy: PropTypes.number.isRequired,
  setCurrentEnergy: PropTypes.func.isRequired,
  journalText: PropTypes.string.isRequired,
  setJournalText: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

/**
 * CompanionTab provides multi-turn empathetic text conversations.
 */
function CompanionTab(props) {
  const {
    profile,
    entries,
    chatHistory,
    onAddChatMessage,
    chatInput,
    setChatInput,
    loading,
    setLoading,
    onError,
  } = props;

  const chatEndRef = useRef(null);

  useEffect(() => {
    // Generate initial greeting if chat is empty
    if (chatHistory.length === 0) {
      const greeting =
        `Hello ${profile.name}! I am MindEase, your companion. ` +
        `I know preparing for ${profile.exam} can be stressful. ` +
        "How can I support you today?";
      onAddChatMessage({
        sender: "companion",
        text: greeting,
        time: new Date().toLocaleTimeString(),
      });
    }
  }, [chatHistory, profile, onAddChatMessage]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, loading.chat]);

  async function handleSend(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    onError(null);

    const newChatMsg = {
      sender: "user",
      text: userMsg,
      time: new Date().toLocaleTimeString(),
    };
    onAddChatMessage(newChatMsg);

    setLoading((prev) => ({ ...prev, chat: true }));

    try {
      const assistantText = await chatWithCompanion(
        profile,
        entries,
        [...chatHistory, newChatMsg],
        userMsg
      );
      onAddChatMessage({
        sender: "companion",
        text: assistantText,
        time: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading((prev) => ({ ...prev, chat: false }));
    }
  }

  return (
    <div style={styles.chatContainer}>
      <div style={styles.chatHeader}>
        <div style={styles.chatTitleGroup}>
          <span style={styles.companionIndicator}>●</span>
          <h3 style={styles.chatHeading}>MindEase Companion</h3>
        </div>
        <span style={styles.companionDesc}>Ask study strategies, venting, or relaxation tips</span>
      </div>

      <div style={styles.chatWindow}>
        {chatHistory.map((chat, idx) => {
          const isUser = chat.sender === "user";
          return (
            <div
              key={idx}
              style={isUser ? styles.chatRowUser : styles.chatRowCompanion}
            >
              <div style={isUser ? styles.bubbleUser : styles.bubbleCompanion}>
                <p style={styles.chatText}>{chat.text}</p>
                <span style={styles.chatTime}>{chat.time}</span>
              </div>
            </div>
          );
        })}

        {loading.chat && (
          <div style={styles.chatRowCompanion}>
            <div style={styles.bubbleCompanion}>
              <div style={styles.typingIndicator} role="status" aria-live="polite">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSend} style={styles.chatInputArea}>
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Message your wellness companion..."
          aria-label="Message your wellness companion"
          style={styles.chatInput}
        />
        <button
          type="submit"
          disabled={loading.chat || !chatInput.trim()}
          style={chatInput.trim() ? styles.btnSend : styles.btnSendDisabled}
        >
          Send 📤
        </button>
      </form>
    </div>
  );
}

CompanionTab.propTypes = {
  profile: PropTypes.object.isRequired,
  entries: PropTypes.array.isRequired,
  chatHistory: PropTypes.array.isRequired,
  onAddChatMessage: PropTypes.func.isRequired,
  chatInput: PropTypes.string.isRequired,
  setChatInput: PropTypes.func.isRequired,
  loading: PropTypes.object.isRequired,
  setLoading: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

/**
 * MindfulnessTab provides generated relaxation exercises.
 */
function MindfulnessTab(props) {
  const { profile, entries, exercises, setExercises, loading, setLoading, onError } = props;

  const fetchExercises = useCallback(async () => {
    setLoading((prev) => ({ ...prev, exercises: true }));
    onError(null);
    const lastEntry = entries[entries.length - 1];
    const currentMood = lastEntry ? lastEntry.mood : "Meh";
    const currentEnergy = lastEntry ? lastEntry.energy : 5;

    try {
      const data = await generateMindfulnessExercises(profile, currentMood, currentEnergy);
      setExercises(data.exercises);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading((prev) => ({ ...prev, exercises: false }));
    }
  }, [profile, entries, setExercises, setLoading, onError]);

  useEffect(() => {
    if (!exercises) {
      fetchExercises();
    }
  }, [exercises, fetchExercises]);

  return (
    <div style={styles.mindfulnessLayout}>
      <div style={styles.mindfulnessHeader}>
        <h3 style={styles.tabHeading}>🌿 Adaptive Mindfulness Sanctuary</h3>
        <button
          onClick={fetchExercises}
          disabled={loading.exercises}
          style={loading.exercises ? styles.btnSecondaryDisabled : styles.btnSecondary}
        >
          {loading.exercises ? "Crafting Exercises..." : "Refresh Exercises 🔄"}
        </button>
      </div>

      {loading.exercises && (
        <div style={styles.spinnerWrapper} role="status" aria-live="polite">
          <div style={styles.spinner} />
          <p style={styles.spinnerText}>Curating calming flows...</p>
        </div>
      )}

      {!loading.exercises && exercises && (
        <div style={styles.exerciseGrid}>
          {exercises.map((ex, idx) => (
            <div key={idx} style={styles.exerciseCard}>
              <div style={styles.exerciseHeader}>
                <span style={styles.exerciseEmoji}>{ex.emoji || "🧘‍♀️"}</span>
                <div>
                  <h4 style={styles.exerciseName}>{ex.name}</h4>
                  <span style={styles.exerciseDuration}>⏱️ {ex.duration}</span>
                </div>
              </div>
              <div style={styles.exerciseSteps}>
                <strong>Steps:</strong>
                <ol style={styles.stepsList}>
                  {ex.steps?.map((step, sIdx) => (
                    <li key={sIdx} style={styles.stepItem}>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              <div style={styles.whyBox}>
                <p style={styles.whyText}>
                  <strong>Why it helps:</strong> {ex.whyItHelps}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

MindfulnessTab.propTypes = {
  profile: PropTypes.object.isRequired,
  entries: PropTypes.array.isRequired,
  exercises: PropTypes.array,
  setExercises: PropTypes.func.isRequired,
  loading: PropTypes.object.isRequired,
  setLoading: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

/**
 * PatternsTab displays analytical breakdowns across entries.
 */
function PatternsTab(props) {
  const { profile, entries, patterns, setPatterns, loading, setLoading, onError } = props;

  const runAnalysis = useCallback(async () => {
    setLoading((prev) => ({ ...prev, patterns: true }));
    onError(null);
    try {
      const data = await analyzeEmotionalPatterns(profile, entries);
      setPatterns(data);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading((prev) => ({ ...prev, patterns: false }));
    }
  }, [profile, entries, setPatterns, setLoading, onError]);

  useEffect(() => {
    if (entries.length >= 2 && !patterns) {
      runAnalysis();
    }
  }, [entries, patterns, runAnalysis]);

  if (entries.length < 2) {
    return (
      <div style={styles.patternsHoldState}>
        <span style={styles.holdEmoji}>📊</span>
        <h3 style={styles.tabHeading}>Patterns locked</h3>
        <p style={styles.holdText}>
          Please add at least 2 journal entries to unlock trend tracking and trigger analytics.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.patternsLayout}>
      <div style={styles.patternsHeader}>
        <h3 style={styles.tabHeading}>📊 Emotional Patterns & Stress Analysis</h3>
        <button
          onClick={runAnalysis}
          disabled={loading.patterns}
          style={loading.patterns ? styles.btnSecondaryDisabled : styles.btnSecondary}
        >
          {loading.patterns ? "Re-analyzing..." : "Re-analyze Patterns 🔄"}
        </button>
      </div>

      {/* CSS Mood Bar Chart */}
      <div style={styles.chartCard}>
        <h4 style={styles.chartTitle}>Mood Score Trends</h4>
        <div style={styles.chartWrapper}>
          <div style={styles.chartAxisY}>
            <span>Great</span>
            <span>Okay</span>
            <span>Meh</span>
            <span>Low</span>
            <span>Overwhelmed</span>
          </div>
          <div style={styles.chartArea}>
            {entries.map((entry, idx) => {
              const moodObj = MOODS.find((m) => m.label === entry.mood);
              const score = moodObj ? moodObj.score : 3;
              // Map score 1-5 to height percentage
              const heightPercent = score * 20;

              return (
                <div key={idx} style={styles.chartBarCol}>
                  <div
                    style={{
                      ...styles.chartBar,
                      height: `${heightPercent}%`,
                      backgroundColor:
                        score >= 4 ? "#4ade80" : score === 3 ? "#fbbf24" : "#f472b6",
                    }}
                    title={`${entry.mood} (Score: ${score}/5)`}
                  />
                  <span style={styles.chartBarLabel}>{idx + 1}</span>
                </div>
              );
            })}
          </div>
        </div>
        <p style={styles.chartCaption}>X-axis represents journal log index chronologically.</p>
      </div>

      {loading.patterns && (
        <div style={styles.spinnerWrapper} role="status" aria-live="polite">
          <div style={styles.spinner} />
          <p style={styles.spinnerText}>Synthesizing behavioral trends...</p>
        </div>
      )}

      {!loading.patterns && patterns && (
        <div style={styles.patternsGrid}>
          <div style={styles.card}>
            <h4 style={styles.cardTitle}>Top Stress Triggers</h4>
            <div style={styles.triggerStack}>
              {patterns.topTriggers?.map((item, idx) => (
                <div key={idx} style={styles.triggerPatternRow}>
                  <div style={styles.triggerPatternMeta}>
                    <strong style={styles.triggerPatternTitle}>{item.trigger}</strong>
                    <span style={styles.triggerPatternFreq}>{item.frequency}</span>
                  </div>
                  <p style={styles.triggerPatternExplain}>{item.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <h4 style={styles.cardTitle}>Stress Trend Analysis</h4>
            <div
              style={
                patterns.trend === "improving"
                  ? styles.trendBoxGreen
                  : patterns.trend === "fluctuating"
                  ? styles.trendBoxYellow
                  : styles.trendBoxRed
              }
            >
              <h5 style={styles.trendValue}>Trend: {patterns.trend?.toUpperCase()}</h5>
              <p style={styles.trendDesc}>{patterns.trendReasoning}</p>
            </div>
            <div style={styles.hiddenPatternBox}>
              <h5 style={styles.hiddenPatternTitle}>💡 Unnoticed Insight</h5>
              <p style={styles.hiddenPatternText}>{patterns.hiddenPattern}</p>
            </div>
          </div>

          <div style={{ ...styles.card, gridColumn: "1 / -1" }}>
            <h4 style={styles.cardTitle}>7-Day Action Plan</h4>
            <div style={styles.actionPlanList}>
              {patterns.actionPlan?.map((act, idx) => (
                <div key={idx} style={styles.actionPlanCard}>
                  <span style={styles.actionStepNum}>{idx + 1}</span>
                  <p style={styles.actionStepText}>{act}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

PatternsTab.propTypes = {
  profile: PropTypes.object.isRequired,
  entries: PropTypes.array.isRequired,
  patterns: PropTypes.object,
  setPatterns: PropTypes.func.isRequired,
  loading: PropTypes.object.isRequired,
  setLoading: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

// --------------------------------------------------------------------------------
// SECTION 4: Main App Component
// --------------------------------------------------------------------------------

/**
 * App main shell managing layout switching and core global states.
 */
function App() {
  const [screen, setScreen] = useState("onboarding");
  const [profile, setProfile] = useState({
    name: "",
    exam: "",
    examDate: "",
    studyHours: 8,
    biggestFear: "",
    supportSystem: [],
  });

  const [activeTab, setActiveTab] = useState(0);
  const [journalEntries, setJournalEntries] = useState([]);
  const [currentMood, setCurrentMood] = useState(null);
  const [currentEnergy, setCurrentEnergy] = useState(5);
  const [journalText, setJournalText] = useState("");
  const [insightCard, setInsightCard] = useState(null);

  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");

  const [exercises, setExercises] = useState(null);
  const [patterns, setPatterns] = useState(null);

  const [loading, setLoading] = useState({
    journal: false,
    chat: false,
    exercises: false,
    patterns: false,
  });
  const [error, setError] = useState(null);

  function handleCompleteOnboarding() {
    setScreen("dashboard");
  }

  function handleAddEntry(newEntry) {
    setJournalEntries((prev) => [...prev, newEntry]);
    setPatterns(null); // Clear patterns so they recalculate with the new entry
    setExercises(null); // Clear exercises so they refresh with the latest mood
  }

  function handleAddChatMessage(newMsg) {
    setChatHistory((prev) => [...prev, newMsg]);
  }

  function handleReset() {
    setScreen("onboarding");
    setProfile({
      name: "",
      exam: "",
      examDate: "",
      studyHours: 8,
      biggestFear: "",
      supportSystem: [],
    });
    setActiveTab(0);
    setJournalEntries([]);
    setCurrentMood(null);
    setCurrentEnergy(5);
    setJournalText("");
    setInsightCard(null);
    setChatHistory([]);
    setChatInput("");
    setExercises(null);
    setPatterns(null);
    setError(null);
  }

  const daysLeft = calculateDaysRemaining(profile.examDate);

  // Focus tracking/restoration hook for accessibility
  const dashRef = useRef(null);
  useEffect(() => {
    if (screen === "dashboard" && dashRef.current) {
      dashRef.current.focus();
    }
  }, [screen]);

  return (
    <div style={styles.appShell}>
      <style>{KEYFRAME_CSS}</style>

      {/* Global Header */}
      <header style={styles.header}>
        <div style={styles.headerTitleArea}>
          <h1 style={styles.logo}>MindEase 🌿</h1>
          <span style={styles.subtitle}>Exam Warrior Sanctuary</span>
        </div>

        {screen === "dashboard" && (
          <div style={styles.countdownBadge}>
            <span style={styles.badgeText}>
              📅 {daysLeft > 0 ? `${daysLeft} days to ${profile.exam}` : `${profile.exam} today`}
            </span>
          </div>
        )}
      </header>

      {/* Error banner */}
      {error && (
        <div style={styles.errorBanner}>
          <span style={styles.errorBannerText}>⚠️ {error}</span>
          <button
            onClick={() => setError(null)}
            style={styles.errorDismissBtn}
            aria-label="Dismiss error notification"
          >
            ✕
          </button>
        </div>
      )}

      <main style={styles.mainContent}>
        {screen === "onboarding" ? (
          <OnboardingScreen
            profile={profile}
            onUpdateProfile={setProfile}
            onComplete={handleCompleteOnboarding}
          />
        ) : (
          <div ref={dashRef} tabIndex={-1} style={styles.dashboardLayout}>
            {/* Top Navigation Tabs */}
            <div style={styles.tabList} role="tablist">
              {[
                "📓 Journal & Mood Log",
                "💬 AI Companion Chat",
                "🌿 Mindfulness Exercises",
                "📊 Emotional Patterns",
              ].map((tabLabel, idx) => {
                const isSelected = activeTab === idx;
                return (
                  <button
                    key={idx}
                    role="tab"
                    id={`tab-control-${idx}`}
                    aria-selected={isSelected}
                    aria-controls={`tabpanel-${idx}`}
                    onClick={() => setActiveTab(idx)}
                    style={isSelected ? styles.tabBtnActive : styles.tabBtn}
                  >
                    {tabLabel}
                  </button>
                );
              })}
            </div>

            {/* Tab content panel */}
            <div
              role="tabpanel"
              id={`tabpanel-${activeTab}`}
              aria-labelledby={`tab-control-${activeTab}`}
              style={styles.tabContentPanel}
            >
              {activeTab === 0 && (
                <JournalTab
                  entries={journalEntries}
                  onAddEntry={handleAddEntry}
                  insightCard={insightCard}
                  setInsightCard={setInsightCard}
                  loading={loading}
                  setLoading={setLoading}
                  profile={profile}
                  currentMood={currentMood}
                  setCurrentMood={setCurrentMood}
                  currentEnergy={currentEnergy}
                  setCurrentEnergy={setCurrentEnergy}
                  journalText={journalText}
                  setJournalText={setJournalText}
                  onError={setError}
                />
              )}

              {activeTab === 1 && (
                <CompanionTab
                  profile={profile}
                  entries={journalEntries}
                  chatHistory={chatHistory}
                  onAddChatMessage={handleAddChatMessage}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  loading={loading}
                  setLoading={setLoading}
                  onError={setError}
                />
              )}

              {activeTab === 2 && (
                <MindfulnessTab
                  profile={profile}
                  entries={journalEntries}
                  exercises={exercises}
                  setExercises={setExercises}
                  loading={loading}
                  setLoading={setLoading}
                  onError={setError}
                />
              )}

              {activeTab === 3 && (
                <PatternsTab
                  profile={profile}
                  entries={journalEntries}
                  patterns={patterns}
                  setPatterns={setPatterns}
                  loading={loading}
                  setLoading={setLoading}
                  onError={setError}
                />
              )}
            </div>

            <div style={styles.resetFooter}>
              <button
                onClick={handleReset}
                style={styles.btnSecondary}
                aria-label="Start over onboarding configuration"
              >
                Reset & Restart Journey 🔄
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

// --------------------------------------------------------------------------------
// SECTION 5: Styles Object
// --------------------------------------------------------------------------------

const styles = {
  appShell: {
    backgroundColor: "#0f1724",
    color: "#e2e8f0",
    minHeight: "100vh",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    backgroundColor: "#1a2744",
    padding: "16px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  headerTitleArea: {
    display: "flex",
    flexDirection: "column",
  },
  logo: {
    fontFamily: "'Georgia', serif",
    fontSize: "24px",
    color: "#4ade80",
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: "12px",
    color: "#94a3b8",
  },
  countdownBadge: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    border: "1px solid #fbbf24",
    borderRadius: "20px",
    padding: "6px 16px",
  },
  badgeText: {
    color: "#fbbf24",
    fontSize: "14px",
    fontWeight: "600",
  },
  mainContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "24px",
    maxWidth: "1100px",
    width: "100%",
    margin: "0 auto",
  },
  onboardingCard: {
    backgroundColor: "#1a2744",
    borderRadius: "16px",
    padding: "32px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
    maxWidth: "600px",
    width: "100%",
    margin: "40px auto",
    animation: "fadeIn 0.4s ease-out",
  },
  onboardingTitle: {
    fontFamily: "'Georgia', serif",
    fontSize: "28px",
    color: "#4ade80",
    marginBottom: "12px",
  },
  onboardingSubtitle: {
    fontSize: "14px",
    color: "#94a3b8",
    lineHeight: "1.6",
    marginBottom: "24px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  fieldLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#e2e8f0",
  },
  input: {
    backgroundColor: "#0f1724",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    color: "#e2e8f0",
    padding: "10px 14px",
    fontSize: "14px",
    outline: "none",
  },
  inputError: {
    backgroundColor: "#0f1724",
    border: "1px solid #f472b6",
    borderRadius: "8px",
    color: "#e2e8f0",
    padding: "10px 14px",
    fontSize: "14px",
    outline: "none",
  },
  select: {
    backgroundColor: "#0f1724",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    color: "#e2e8f0",
    padding: "10px 14px",
    fontSize: "14px",
    outline: "none",
    cursor: "pointer",
  },
  selectError: {
    backgroundColor: "#0f1724",
    border: "1px solid #f472b6",
    borderRadius: "8px",
    color: "#e2e8f0",
    padding: "10px 14px",
    fontSize: "14px",
    outline: "none",
    cursor: "pointer",
  },
  rangeInput: {
    cursor: "pointer",
    accentColor: "#4ade80",
    width: "100%",
  },
  checkboxContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  btnCheckbox: {
    backgroundColor: "transparent",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "20px",
    color: "#94a3b8",
    padding: "6px 14px",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  btnCheckboxActive: {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
    border: "1.5px solid #4ade80",
    borderRadius: "20px",
    color: "#4ade80",
    padding: "6px 14px",
    fontSize: "13px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  btnPrimary: {
    backgroundColor: "#fbbf24",
    color: "#0f1724",
    border: "none",
    borderRadius: "8px",
    padding: "12px 24px",
    fontSize: "15px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    textAlign: "center",
  },
  btnPrimaryDisabled: {
    backgroundColor: "#60a5fa",
    color: "#0f1724",
    border: "none",
    borderRadius: "8px",
    padding: "12px 24px",
    fontSize: "15px",
    fontWeight: "bold",
    cursor: "not-allowed",
    opacity: 0.7,
    textAlign: "center",
  },
  btnSecondary: {
    backgroundColor: "transparent",
    color: "#94a3b8",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "8px",
    padding: "10px 20px",
    fontSize: "13px",
    cursor: "pointer",
  },
  btnSecondaryDisabled: {
    backgroundColor: "transparent",
    color: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "8px",
    padding: "10px 20px",
    fontSize: "13px",
    cursor: "not-allowed",
  },
  errorText: {
    color: "#f472b6",
    fontSize: "12px",
    marginTop: "2px",
  },
  dashboardLayout: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    outline: "none",
  },
  tabList: {
    display: "flex",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    overflowX: "auto",
    gap: "8px",
  },
  tabBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "#94a3b8",
    padding: "12px 20px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    borderBottom: "3px solid transparent",
    whiteSpace: "nowrap",
  },
  tabBtnActive: {
    backgroundColor: "transparent",
    border: "none",
    color: "#4ade80",
    padding: "12px 20px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    borderBottom: "3px solid #4ade80",
    whiteSpace: "nowrap",
  },
  tabContentPanel: {
    minHeight: "450px",
    animation: "fadeIn 0.3s ease-out",
  },
  card: {
    backgroundColor: "#1a2744",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
  },
  cardTitle: {
    fontFamily: "'Georgia', serif",
    fontSize: "20px",
    color: "#e2e8f0",
    marginBottom: "18px",
  },
  moodButtonGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  moodBtn: {
    backgroundColor: "#0f1724",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    color: "#e2e8f0",
    padding: "10px 14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "transform 0.2s ease",
  },
  moodBtnActive: {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
    border: "2px solid #4ade80",
    borderRadius: "12px",
    color: "#4ade80",
    padding: "10px 14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transform: "scale(1.05)",
  },
  moodEmoji: {
    fontSize: "20px",
  },
  moodLabel: {
    fontSize: "13px",
    fontWeight: "600",
  },
  textareaHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  charCounter: {
    fontSize: "12px",
    color: "#94a3b8",
  },
  textarea: {
    backgroundColor: "#0f1724",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    color: "#e2e8f0",
    fontFamily: "'Georgia', serif",
    fontSize: "15px",
    lineHeight: "1.7",
    padding: "12px",
    outline: "none",
    resize: "vertical",
  },
  textareaError: {
    backgroundColor: "#0f1724",
    border: "1px solid #f472b6",
    borderRadius: "8px",
    color: "#e2e8f0",
    fontFamily: "'Georgia', serif",
    fontSize: "15px",
    lineHeight: "1.7",
    padding: "12px",
    outline: "none",
    resize: "vertical",
  },
  spinnerWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "24px",
    gap: "12px",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid rgba(255,255,255,0.1)",
    borderTopColor: "#4ade80",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  spinnerText: {
    color: "#94a3b8",
    fontSize: "14px",
  },
  insightCard: {
    backgroundColor: "#1a2744",
    borderRadius: "16px",
    borderLeft: "6px solid",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
    animation: "fadeIn 0.3s ease-out",
    outline: "none",
  },
  insightHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  insightTitle: {
    fontFamily: "'Georgia', serif",
    fontSize: "18px",
    color: "#4ade80",
  },
  badgeLow: {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
    border: "1px solid #4ade80",
    color: "#4ade80",
    borderRadius: "20px",
    padding: "4px 10px",
    fontSize: "11px",
    fontWeight: "bold",
  },
  badgeMed: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    border: "1px solid #fbbf24",
    color: "#fbbf24",
    borderRadius: "20px",
    padding: "4px 10px",
    fontSize: "11px",
    fontWeight: "bold",
  },
  badgeHigh: {
    backgroundColor: "rgba(244, 114, 182, 0.15)",
    border: "1px solid #f472b6",
    color: "#f472b6",
    borderRadius: "20px",
    padding: "4px 10px",
    fontSize: "11px",
    fontWeight: "bold",
  },
  insightText: {
    fontSize: "14px",
    lineHeight: "1.5",
  },
  triggersSection: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "14px",
  },
  tagGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  triggerTag: {
    backgroundColor: "#0f1724",
    borderRadius: "6px",
    padding: "4px 8px",
    fontSize: "12px",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  copingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
  },
  copingCard: {
    backgroundColor: "#0f1724",
    borderRadius: "12px",
    padding: "14px",
    border: "1px solid rgba(255,255,255,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  copingCardTitle: {
    color: "#60a5fa",
    fontSize: "14px",
    fontWeight: "bold",
  },
  copingCardDesc: {
    fontSize: "12px",
    color: "#94a3b8",
    lineHeight: "1.4",
  },
  copingFooter: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    color: "#94a3b8",
    marginTop: "auto",
  },
  affirmationBox: {
    borderTop: "1px solid rgba(255,255,255,0.08)",
    paddingTop: "12px",
  },
  affirmationText: {
    fontFamily: "'Georgia', serif",
    fontStyle: "italic",
    fontSize: "14px",
    color: "#fbbf24",
    textAlign: "center",
  },
  followUpBox: {
    backgroundColor: "rgba(96, 165, 250, 0.08)",
    padding: "10px 14px",
    borderRadius: "8px",
    borderLeft: "4px solid #60a5fa",
  },
  followUpText: {
    fontSize: "13px",
    color: "#e2e8f0",
  },
  pastEntriesSection: {
    marginTop: "24px",
  },
  subHeading: {
    fontFamily: "'Georgia', serif",
    fontSize: "18px",
    marginBottom: "12px",
  },
  entriesList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  entryRow: {
    backgroundColor: "#1a2744",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  entryRowMeta: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    paddingBottom: "8px",
  },
  entryRowEmoji: {
    fontSize: "24px",
  },
  entryRowDetails: {
    display: "flex",
    flexDirection: "column",
  },
  entryRowMood: {
    fontSize: "14px",
  },
  entryRowTime: {
    fontSize: "11px",
    color: "#94a3b8",
  },
  entryRowEnergy: {
    marginLeft: "auto",
    fontSize: "12px",
    color: "#fbbf24",
    fontWeight: "bold",
  },
  entryRowText: {
    fontSize: "13px",
    lineHeight: "1.6",
    color: "#94a3b8",
  },
  chatContainer: {
    backgroundColor: "#1a2744",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    height: "550px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
    overflow: "hidden",
  },
  chatHeader: {
    backgroundColor: "#0f1724",
    padding: "16px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  chatTitleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
  },
  companionIndicator: {
    color: "#4ade80",
    fontSize: "10px",
  },
  chatHeading: {
    fontFamily: "'Georgia', serif",
    fontSize: "16px",
  },
  companionDesc: {
    fontSize: "11px",
    color: "#94a3b8",
  },
  chatWindow: {
    flex: 1,
    padding: "16px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  chatRowUser: {
    display: "flex",
    justifyContent: "flex-end",
  },
  chatRowCompanion: {
    display: "flex",
    justifyContent: "flex-start",
  },
  bubbleUser: {
    backgroundColor: "#fbbf24",
    color: "#0f1724",
    borderRadius: "16px 16px 2px 16px",
    padding: "10px 14px",
    maxWidth: "75%",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },
  bubbleCompanion: {
    backgroundColor: "#0f1724",
    color: "#e2e8f0",
    borderRadius: "16px 16px 16px 2px",
    padding: "10px 14px",
    maxWidth: "75%",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  chatText: {
    fontSize: "14px",
    lineHeight: "1.5",
  },
  chatTime: {
    fontSize: "10px",
    color: "rgba(0,0,0,0.4)",
    display: "block",
    textAlign: "right",
    marginTop: "4px",
  },
  typingIndicator: {
    display: "flex",
    gap: "4px",
    padding: "4px 8px",
  },
  chatInputArea: {
    backgroundColor: "#0f1724",
    padding: "12px",
    display: "flex",
    gap: "8px",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#1a2744",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    color: "#e2e8f0",
    padding: "10px 14px",
    outline: "none",
  },
  btnSend: {
    backgroundColor: "#fbbf24",
    color: "#0f1724",
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  btnSendDisabled: {
    backgroundColor: "#1a2744",
    color: "#94a3b8",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "8px",
    padding: "10px 16px",
    cursor: "not-allowed",
  },
  mindfulnessLayout: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  mindfulnessHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tabHeading: {
    fontFamily: "'Georgia', serif",
    fontSize: "20px",
  },
  exerciseGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
  },
  exerciseCard: {
    backgroundColor: "#1a2744",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid rgba(255,255,255,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  exerciseHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  exerciseEmoji: {
    fontSize: "32px",
  },
  exerciseName: {
    fontFamily: "'Georgia', serif",
    fontSize: "16px",
    color: "#4ade80",
  },
  exerciseDuration: {
    fontSize: "12px",
    color: "#94a3b8",
  },
  exerciseSteps: {
    fontSize: "13px",
  },
  stepsList: {
    paddingLeft: "20px",
    marginTop: "6px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  stepItem: {
    color: "#e2e8f0",
  },
  whyBox: {
    backgroundColor: "rgba(74, 222, 128, 0.08)",
    padding: "8px 12px",
    borderRadius: "8px",
    marginTop: "auto",
  },
  whyText: {
    fontSize: "12px",
    color: "#4ade80",
    lineHeight: "1.4",
  },
  patternsHoldState: {
    textAlign: "center",
    padding: "48px 24px",
    backgroundColor: "#1a2744",
    borderRadius: "16px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
  },
  holdEmoji: {
    fontSize: "48px",
    display: "block",
    marginBottom: "16px",
  },
  holdText: {
    color: "#94a3b8",
    fontSize: "14px",
    marginTop: "8px",
  },
  patternsLayout: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  patternsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chartCard: {
    backgroundColor: "#1a2744",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
  },
  chartTitle: {
    fontFamily: "'Georgia', serif",
    fontSize: "16px",
    marginBottom: "16px",
  },
  chartWrapper: {
    display: "flex",
    height: "180px",
    gap: "12px",
  },
  chartAxisY: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    fontSize: "11px",
    color: "#94a3b8",
    textAlign: "right",
    paddingRight: "8px",
  },
  chartArea: {
    flex: 1,
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
    borderLeft: "1px solid rgba(255,255,255,0.1)",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    paddingLeft: "8px",
    paddingBottom: "4px",
    overflowX: "auto",
  },
  chartBarCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
    minWidth: "24px",
    height: "100%",
    justifyContent: "flex-end",
  },
  chartBar: {
    width: "100%",
    borderRadius: "4px 4px 0 0",
    transition: "height 0.3s ease",
  },
  chartBarLabel: {
    fontSize: "11px",
    color: "#94a3b8",
    marginTop: "4px",
  },
  chartCaption: {
    fontSize: "11px",
    color: "#94a3b8",
    marginTop: "10px",
    textAlign: "center",
  },
  patternsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "16px",
  },
  triggerStack: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  triggerPatternRow: {
    backgroundColor: "#0f1724",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  triggerPatternMeta: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "4px",
  },
  triggerPatternTitle: {
    fontSize: "14px",
    color: "#fbbf24",
  },
  triggerPatternFreq: {
    fontSize: "11px",
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    padding: "2px 6px",
    borderRadius: "4px",
    color: "#fbbf24",
  },
  triggerPatternExplain: {
    fontSize: "12px",
    color: "#94a3b8",
    lineHeight: "1.4",
  },
  trendBoxGreen: {
    backgroundColor: "rgba(74, 222, 128, 0.08)",
    border: "1px solid #4ade80",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "16px",
  },
  trendBoxYellow: {
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    border: "1px solid #fbbf24",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "16px",
  },
  trendBoxRed: {
    backgroundColor: "rgba(244, 114, 182, 0.08)",
    border: "1px solid #f472b6",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "16px",
  },
  trendValue: {
    fontSize: "14px",
    fontWeight: "bold",
    marginBottom: "4px",
  },
  trendDesc: {
    fontSize: "12px",
    color: "#e2e8f0",
  },
  hiddenPatternBox: {
    backgroundColor: "#0f1724",
    borderRadius: "8px",
    padding: "12px",
  },
  hiddenPatternTitle: {
    fontSize: "13px",
    color: "#60a5fa",
    marginBottom: "4px",
  },
  hiddenPatternText: {
    fontSize: "12px",
    color: "#94a3b8",
    lineHeight: "1.4",
  },
  actionPlanList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  actionPlanCard: {
    backgroundColor: "#0f1724",
    borderRadius: "8px",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  actionStepNum: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: "rgba(74, 222, 128, 0.15)",
    color: "#4ade80",
    fontWeight: "bold",
    fontSize: "12px",
  },
  actionStepText: {
    fontSize: "13px",
    color: "#e2e8f0",
  },
  resetFooter: {
    display: "flex",
    justifyContent: "center",
    marginTop: "24px",
  },
  errorBanner: {
    backgroundColor: "rgba(244, 114, 182, 0.15)",
    border: "1px solid #f472b6",
    borderRadius: "8px",
    padding: "12px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  errorBannerText: {
    color: "#f472b6",
    fontSize: "14px",
  },
  errorDismissBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "#f472b6",
    cursor: "pointer",
    fontSize: "14px",
  },
  journalLayout: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  calendarDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    width: "280px",
    backgroundColor: "#1a2744",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "12px",
    padding: "12px",
    zIndex: 1000,
    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
    marginTop: "6px",
    animation: "fadeIn 0.2s ease-out",
  },
  calendarHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  calNavBtn: {
    background: "transparent",
    border: "none",
    color: "#4ade80",
    fontSize: "12px",
    cursor: "pointer",
    padding: "4px 8px",
  },
  calTitle: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#e2e8f0",
  },
  calDayNames: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    textAlign: "center",
    marginBottom: "6px",
  },
  calDayNameLabel: {
    fontSize: "11px",
    color: "#94a3b8",
    fontWeight: "bold",
  },
  calDaysGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "4px",
  },
  calDayEmpty: {
    height: "28px",
  },
  calDayCell: {
    height: "28px",
    background: "transparent",
    border: "none",
    borderRadius: "6px",
    color: "#e2e8f0",
    fontSize: "12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s ease",
  },
  calDayDisabled: {
    color: "rgba(255,255,255,0.15)",
    cursor: "not-allowed",
  },
  calDaySelected: {
    backgroundColor: "#4ade80",
    color: "#0f1724",
    fontWeight: "bold",
  },
};
