import { useState, useRef, useCallback, memo } from "react";
import PropTypes from "prop-types";
import { MOODS, styles } from "../styles/styles.js";
import {
  MIN_JOURNAL_LENGTH,
  MAX_JOURNAL_LENGTH,
  analyzeJournalEntry,
} from "../utils/api.js";

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

  const handleMoodSelect = useCallback((moodLabel) => {
    setCurrentMood(moodLabel);
    setValidationErrors((prev) => {
      const copy = { ...prev };
      delete copy.mood;
      return copy;
    });
  }, [setCurrentMood]);

  const moodRefs = useRef([]);

  const handleMoodKeyDown = useCallback((e, idx) => {
    let newIdx = idx;
    if (e.key === "ArrowRight") {
      newIdx = (idx + 1) % MOODS.length;
    } else if (e.key === "ArrowLeft") {
      newIdx = (idx - 1 + MOODS.length) % MOODS.length;
    } else {
      return;
    }
    e.preventDefault();
    handleMoodSelect(MOODS[newIdx].label);
    setTimeout(() => {
      moodRefs.current[newIdx]?.focus();
    }, 0);
  }, [handleMoodSelect]);

  function handleTextChange(e) {
    setJournalText(e.target.value);
    if (
      validationErrors.text &&
      e.target.value.length >= MIN_JOURNAL_LENGTH
    ) {
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
      const insight = await analyzeJournalEntry(
        profile,
        entries,
        newEntry
      );
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
            <div
              style={styles.moodButtonGroup}
              role="radiogroup"
              aria-label="Current Mood"
            >
              {MOODS.map((m, idx) => {
                const isSelected = currentMood === m.label;
                const isFocusable =
                  isSelected || (!currentMood && idx === 0);
                return (
                  <button
                    key={m.label}
                    ref={(el) => (moodRefs.current[idx] = el)}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={isFocusable ? 0 : -1}
                    onClick={() => handleMoodSelect(m.label)}
                    onKeyDown={(e) => handleMoodKeyDown(e, idx)}
                    style={
                      isSelected ? styles.moodBtnActive : styles.moodBtn
                    }
                    aria-label={`${m.label} mood`}
                  >
                    <span style={styles.moodEmoji}>{m.emoji}</span>
                    <span style={styles.moodLabel}>{m.label}</span>
                  </button>
                );
              })}
            </div>
            {validationErrors.mood && (
              <span style={styles.errorText}>
                {validationErrors.mood}
              </span>
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
              onChange={(e) =>
                setCurrentEnergy(parseInt(e.target.value, 10))
              }
              style={styles.rangeInput}
            />
          </div>

          <div style={styles.field}>
            <div style={styles.textareaHeader}>
              <label htmlFor="journal-textarea" style={styles.fieldLabel}>
                Pen down your thoughts
              </label>
              <span
                id="char-count"
                style={styles.charCounter}
                aria-live="polite"
              >
                {journalText.length} / {MAX_JOURNAL_LENGTH} characters
              </span>
            </div>
            <textarea
              id="journal-textarea"
              rows={5}
              maxLength={MAX_JOURNAL_LENGTH}
              placeholder="How was your study session today? What's on your mind? Write freely..."
              value={journalText}
              onChange={handleTextChange}
              aria-describedby="char-count"
              style={
                validationErrors.text
                  ? styles.textareaError
                  : styles.textarea
              }
            />
            {validationErrors.text && (
              <span style={styles.errorText}>
                {validationErrors.text}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading.journal}
            style={
              loading.journal
                ? styles.btnPrimaryDisabled
                : styles.btnPrimary
            }
          >
            {loading.journal
              ? "Analyzing Stress..."
              : "Analyze & Get Support ✨"}
          </button>
        </form>
      </div>

      {loading.journal && (
        <div
          style={styles.spinnerWrapper}
          role="status"
          aria-live="polite"
        >
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
            <strong>Emotional State:</strong>{" "}
            {insightCard.emotionalState}
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
            <p style={styles.affirmationText}>
              &ldquo;{insightCard.affirmation}&rdquo;
            </p>
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
          <div style={styles.entriesList} role="list">
            {entries.map((ent, idx) => {
              const moodMatch = MOODS.find((m) => m.label === ent.mood);
              return (
                <div key={idx} style={styles.entryRow} role="listitem">
                  <div style={styles.entryRowMeta}>
                    <span style={styles.entryRowEmoji}>
                      {moodMatch ? moodMatch.emoji : "📝"}
                    </span>
                    <div style={styles.entryRowDetails}>
                      <strong style={styles.entryRowMood}>
                        {ent.mood}
                      </strong>
                      <span style={styles.entryRowTime}>
                        {ent.timestamp}
                      </span>
                    </div>
                    <span style={styles.entryRowEnergy}>
                      Energy: {ent.energy}/10
                    </span>
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
  entries: PropTypes.arrayOf(
    PropTypes.shape({
      timestamp: PropTypes.string.isRequired,
      mood: PropTypes.string.isRequired,
      energy: PropTypes.number.isRequired,
      text: PropTypes.string.isRequired,
    })
  ).isRequired,
  onAddEntry: PropTypes.func.isRequired,
  insightCard: PropTypes.shape({
    emotionalState: PropTypes.string.isRequired,
    stressTriggers: PropTypes.arrayOf(PropTypes.string).isRequired,
    copingStrategies: PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        duration: PropTypes.string.isRequired,
        examContext: PropTypes.string.isRequired,
      })
    ).isRequired,
    affirmation: PropTypes.string.isRequired,
    urgencyLevel: PropTypes.string.isRequired,
    followUpQuestion: PropTypes.string,
  }),
  setInsightCard: PropTypes.func.isRequired,
  loading: PropTypes.shape({
    journal: PropTypes.bool.isRequired,
    chat: PropTypes.bool.isRequired,
    exercises: PropTypes.bool.isRequired,
    patterns: PropTypes.bool.isRequired,
  }).isRequired,
  setLoading: PropTypes.func.isRequired,
  profile: PropTypes.shape({
    name: PropTypes.string.isRequired,
    exam: PropTypes.string.isRequired,
    examDate: PropTypes.string.isRequired,
    studyHours: PropTypes.number.isRequired,
    biggestFear: PropTypes.string.isRequired,
    supportSystem: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  currentMood: PropTypes.string,
  setCurrentMood: PropTypes.func.isRequired,
  currentEnergy: PropTypes.number.isRequired,
  setCurrentEnergy: PropTypes.func.isRequired,
  journalText: PropTypes.string.isRequired,
  setJournalText: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default memo(JournalTab);
