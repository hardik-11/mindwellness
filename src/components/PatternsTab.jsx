import { useEffect, useCallback, memo } from "react";
import PropTypes from "prop-types";
import { MOODS, styles } from "../styles/styles.js";
import { analyzeEmotionalPatterns } from "../utils/api.js";

/**
 * PatternsTab displays analytical breakdowns across entries.
 */
function PatternsTab(props) {
  const {
    profile,
    entries,
    patterns,
    setPatterns,
    loading,
    setLoading,
    onError,
  } = props;

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
          Please add at least 2 journal entries to unlock trend tracking
          and trigger analytics.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.patternsLayout}>
      <div style={styles.patternsHeader}>
        <h3 style={styles.tabHeading}>
          📊 Emotional Patterns & Stress Analysis
        </h3>
        <button
          onClick={runAnalysis}
          disabled={loading.patterns}
          style={
            loading.patterns
              ? styles.btnSecondaryDisabled
              : styles.btnSecondary
          }
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
          <div
            style={styles.chartArea}
            role="img"
            aria-label="Mood score trend bar chart"
          >
            {entries.map((entry, idx) => {
              const moodObj = MOODS.find((m) => m.label === entry.mood);
              const score = moodObj ? moodObj.score : 3;
              const heightPercent = score * 20;

              return (
                <div key={idx} style={styles.chartBarCol}>
                  <div
                    style={{
                      ...styles.chartBar,
                      height: `${heightPercent}%`,
                      backgroundColor:
                        score >= 4
                          ? "#4ade80"
                          : score === 3
                          ? "#fbbf24"
                          : "#f472b6",
                    }}
                    role="img"
                    aria-label={
                      `Entry ${idx + 1}: Mood: ${entry.mood}, ` +
                      `Score: ${score} out of 5`
                    }
                  />
                  <span style={styles.chartBarLabel}>{idx + 1}</span>
                </div>
              );
            })}
          </div>
        </div>
        <p style={styles.chartCaption}>
          X-axis represents journal log index chronologically.
        </p>
      </div>

      {loading.patterns && (
        <div
          style={styles.spinnerWrapper}
          role="status"
          aria-live="polite"
        >
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
                    <strong style={styles.triggerPatternTitle}>
                      {item.trigger}
                    </strong>
                    <span style={styles.triggerPatternFreq}>
                      {item.frequency}
                    </span>
                  </div>
                  <p style={styles.triggerPatternExplain}>
                    {item.explanation}
                  </p>
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
              <h5 style={styles.trendValue}>
                Trend: {patterns.trend?.toUpperCase()}
              </h5>
              <p style={styles.trendDesc}>{patterns.trendReasoning}</p>
            </div>
            <div style={styles.hiddenPatternBox}>
              <h5 style={styles.hiddenPatternTitle}>
                💡 Unnoticed Insight
              </h5>
              <p style={styles.hiddenPatternText}>
                {patterns.hiddenPattern}
              </p>
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
  profile: PropTypes.shape({
    name: PropTypes.string.isRequired,
    exam: PropTypes.string.isRequired,
    examDate: PropTypes.string.isRequired,
    studyHours: PropTypes.number.isRequired,
    biggestFear: PropTypes.string.isRequired,
    supportSystem: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  entries: PropTypes.arrayOf(
    PropTypes.shape({
      timestamp: PropTypes.string.isRequired,
      mood: PropTypes.string.isRequired,
      energy: PropTypes.number.isRequired,
      text: PropTypes.string.isRequired,
    })
  ).isRequired,
  patterns: PropTypes.shape({
    topTriggers: PropTypes.arrayOf(
      PropTypes.shape({
        trigger: PropTypes.string.isRequired,
        frequency: PropTypes.string.isRequired,
        explanation: PropTypes.string.isRequired,
      })
    ).isRequired,
    trend: PropTypes.string.isRequired,
    trendReasoning: PropTypes.string.isRequired,
    hiddenPattern: PropTypes.string.isRequired,
    actionPlan: PropTypes.arrayOf(PropTypes.string).isRequired,
  }),
  setPatterns: PropTypes.func.isRequired,
  loading: PropTypes.shape({
    journal: PropTypes.bool.isRequired,
    chat: PropTypes.bool.isRequired,
    exercises: PropTypes.bool.isRequired,
    patterns: PropTypes.bool.isRequired,
  }).isRequired,
  setLoading: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default memo(PatternsTab);
