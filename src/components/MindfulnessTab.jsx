import { useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { styles } from "../styles/styles.js";
import { generateMindfulnessExercises } from "../utils/api.js";

/**
 * MindfulnessTab provides generated relaxation exercises.
 */
function MindfulnessTab(props) {
  const {
    profile,
    entries,
    exercises,
    setExercises,
    loading,
    setLoading,
    onError,
  } = props;

  const fetchExercises = useCallback(async () => {
    setLoading((prev) => ({ ...prev, exercises: true }));
    onError(null);
    const lastEntry = entries[entries.length - 1];
    const currentMood = lastEntry ? lastEntry.mood : "Meh";
    const currentEnergy = lastEntry ? lastEntry.energy : 5;

    try {
      const data = await generateMindfulnessExercises(
        profile,
        currentMood,
        currentEnergy
      );
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
        <h3 style={styles.tabHeading}>
          🌿 Adaptive Mindfulness Sanctuary
        </h3>
        <button
          onClick={fetchExercises}
          disabled={loading.exercises}
          style={
            loading.exercises
              ? styles.btnSecondaryDisabled
              : styles.btnSecondary
          }
        >
          {loading.exercises
            ? "Crafting Exercises..."
            : "Refresh Exercises 🔄"}
        </button>
      </div>

      {loading.exercises && (
        <div
          style={styles.spinnerWrapper}
          role="status"
          aria-live="polite"
        >
          <div style={styles.spinner} />
          <p style={styles.spinnerText}>Curating calming flows...</p>
        </div>
      )}

      {!loading.exercises && exercises && (
        <div style={styles.exerciseGrid}>
          {exercises.map((ex, idx) => (
            <div key={idx} style={styles.exerciseCard}>
              <div style={styles.exerciseHeader}>
                <span style={styles.exerciseEmoji}>
                  {ex.emoji || "🧘‍♀️"}
                </span>
                <div>
                  <h4 style={styles.exerciseName}>{ex.name}</h4>
                  <span style={styles.exerciseDuration}>
                    ⏱️ {ex.duration}
                  </span>
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

export default MindfulnessTab;
