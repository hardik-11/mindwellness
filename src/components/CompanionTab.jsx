import { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { styles } from "../styles/styles.js";
import { chatWithCompanion } from "../utils/api.js";

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
        <span style={styles.companionDesc}>
          Ask study strategies, venting, or relaxation tips
        </span>
      </div>

      <div style={styles.chatWindow}>
        {chatHistory.map((chat, idx) => {
          const isUser = chat.sender === "user";
          return (
            <div
              key={idx}
              style={isUser ? styles.chatRowUser : styles.chatRowCompanion}
            >
              <div
                style={isUser ? styles.bubbleUser : styles.bubbleCompanion}
              >
                <p style={styles.chatText}>{chat.text}</p>
                <span style={styles.chatTime}>{chat.time}</span>
              </div>
            </div>
          );
        })}

        {loading.chat && (
          <div style={styles.chatRowCompanion}>
            <div style={styles.bubbleCompanion}>
              <div
                style={styles.typingIndicator}
                role="status"
                aria-live="polite"
              >
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
          style={
            chatInput.trim() ? styles.btnSend : styles.btnSendDisabled
          }
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

export default CompanionTab;
