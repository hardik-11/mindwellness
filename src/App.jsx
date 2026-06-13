import { useState, useEffect, useRef } from "react";
import { styles, KEYFRAME_CSS } from "./styles/styles.js";
import OnboardingScreen from "./components/OnboardingScreen.jsx";
import JournalTab from "./components/JournalTab.jsx";
import CompanionTab from "./components/CompanionTab.jsx";
import MindfulnessTab from "./components/MindfulnessTab.jsx";
import PatternsTab from "./components/PatternsTab.jsx";
import { calculateDaysRemaining, sanitizeInput } from "./utils/api.js";

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
    setPatterns(null);
    setExercises(null);
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
              📅{" "}
              {daysLeft > 0
                ? `${daysLeft} days to ${profile.exam}`
                : `${profile.exam} today`}
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
          <div
            ref={dashRef}
            tabIndex={-1}
            style={styles.dashboardLayout}
          >
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
