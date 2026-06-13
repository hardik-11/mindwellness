import { useState } from "react";
import PropTypes from "prop-types";
import { EXAMS, FEARS, SUPPORT_SYSTEMS, styles } from "../styles/styles.js";
import DatePicker from "./DatePicker.jsx";

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

export default OnboardingScreen;
