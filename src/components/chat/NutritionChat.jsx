import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../../context/UserContext';
import { chatWithCoach, hasApiKey } from '../../services/gemini';

const starterChips = [
  "What should I eat for breakfast?",
  "Is my calorie target right for me?",
  "What foods are high in protein?",
  "Can I have cheat meals?"
];

export default function NutritionChat() {
  const { profile, chatHistory, setChatHistory, aiCooldown, triggerAiCooldown } = useUser();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const chatEndRef = useRef(null);

  // Initialize coach welcome message if history is empty
  useEffect(() => {
    if (chatHistory.length === 0) {
      setChatHistory([
        {
          id: 'welcome',
          sender: 'coach',
          text: `Hi there! I am your AI Nutrition Coach. Based on your profile, your daily budget is ${profile?.plan?.calories || 2000} kcal to support your ${profile?.goalLabel?.toLowerCase() || 'wellness'} journey. How can I help you today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [chatHistory, profile, setChatHistory]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const handleSendMessage = async (textToSend) => {
    if (!textToSend.trim() || loading || aiCooldown) return;

    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Update state synchronously for user message
    const updatedHistory = [...chatHistory, userMessage];
    setChatHistory(updatedHistory);
    setInput('');
    setLoading(true);
    setErrorMsg('');
    triggerAiCooldown();

    try {
      // Call Gemini chat
      const responseText = await chatWithCoach(profile, updatedHistory, textToSend);
      
      const coachMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'coach',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setChatHistory(prev => [...prev, coachMessage]);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to reach AI Coach. Check settings key.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setChatHistory([]);
  };

  const hasKey = hasApiKey();

  return (
    <div className="flex flex-col h-[75vh] max-w-4xl mx-auto border border-slate-800 bg-slate-900/40 rounded-3xl overflow-hidden shadow-2xl animate-fadeIn">
      {/* Chat header */}
      <div className="p-4 border-b border-slate-850 flex justify-between items-center bg-slate-950/40">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl relative">
            💬
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full"></span>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-100 text-sm">AI Nutrition Coach</h3>
            <span className="text-[10px] text-emerald-400 font-medium">Online • Powered by Gemini</span>
          </div>
        </div>

        <button
          onClick={handleClearHistory}
          className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-rose-500/10 text-xs transition-all font-semibold"
          title="Reset conversation logs"
        >
          Reset Chat
        </button>
      </div>

      {/* Warning banner */}
      {!hasKey && (
        <div className="bg-amber-500/5 border-b border-amber-500/20 px-4 py-2.5 text-[10px] text-amber-400 flex items-center justify-between">
          <span>💡 Coach is currently running using pre-programmed fallbacks. Set your Gemini API Key in settings to enable dynamic coaching.</span>
        </div>
      )}

      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/15">
        {chatHistory.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
              <div className={`max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed border relative shadow ${
                isUser
                  ? 'bg-slate-850 border-slate-750 text-slate-100 rounded-tr-none'
                  : 'glass border-slate-800 text-slate-200 rounded-tl-none bg-slate-900/60'
              }`}>
                {msg.text}
                <span className="text-[9px] text-slate-500 block mt-2 font-mono text-right select-none">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {/* Typing indicator bubble */}
        {loading && (
          <div className="flex justify-start animate-fadeIn">
            <div className="glass border-slate-800 rounded-2xl rounded-tl-none p-4 max-w-xs shadow bg-slate-900/60">
              <div className="flex items-center space-x-1 py-1">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="flex justify-center">
            <span className="text-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-1.5 rounded-lg font-medium">
              ⚠️ {errorMsg}
            </span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested chips panel (rendered only when user input is empty and not loading) */}
      {input.trim() === '' && !loading && (
        <div className="px-4 py-2 border-t border-slate-850/40 bg-slate-950/10 overflow-x-auto flex space-x-2 select-none scrollbar-none">
          {starterChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip)}
              className="whitespace-nowrap px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-300 text-[10px] font-medium rounded-full cursor-pointer transition-all active:scale-95 shrink-0"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(input);
        }}
        className="p-4 border-t border-slate-850 bg-slate-950/40 flex items-center space-x-3.5"
      >
        <input
          type="text"
          placeholder="Ask Coach anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 bg-slate-950 border border-slate-850 rounded-xl py-3 px-4 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder-slate-600"
        />
        
        <button
          type="submit"
          disabled={!input.trim() || loading || aiCooldown}
          className={`p-3 rounded-xl transition-all cursor-pointer ${
            !input.trim() || loading || aiCooldown
              ? 'bg-slate-850 text-slate-600 border border-slate-800 cursor-not-allowed'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/10 hover:scale-105 active:scale-95'
          }`}
          title="Send message"
        >
          <svg className="w-4 h-4 fill-current transform rotate-45" viewBox="0 0 24 24">
            <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
