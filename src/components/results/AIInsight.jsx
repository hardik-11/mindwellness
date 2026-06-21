import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { generatePersonalizedInsight, hasApiKey } from '../../services/gemini';

export default function AIInsight() {
  const { profile, setProfile, aiCooldown, triggerAiCooldown, isAiThinking } = useUser();
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState(profile?.initialInsight || '');
  const [errorMsg, setErrorMsg] = useState('');

  const handleRefresh = async () => {
    if (aiCooldown || loading) return;
    
    if (!hasApiKey()) {
      setErrorMsg('Please add your Gemini API Key in Settings to generate AI insights.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    triggerAiCooldown();

    try {
      const text = await generatePersonalizedInsight(profile);
      setInsight(text);
      // Sync with profile
      setProfile(prev => ({
        ...prev,
        initialInsight: text
      }));
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to update insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasKey = hasApiKey();

  return (
    <div className="glass p-6 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/60 to-emerald-950/10 relative overflow-hidden shadow-xl">
      {/* Background ambient light */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full pointer-events-none"></div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-xl text-emerald-400 animate-pulse">✨</span>
          <h3 className="font-extrabold text-slate-100 text-sm uppercase tracking-wider">AI Coach Insight</h3>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={loading || aiCooldown || !hasKey}
          className={`px-3 py-1.5 rounded-lg border font-semibold text-xs transition-all flex items-center space-x-1 ${
            loading || aiCooldown || !hasKey
              ? 'border-slate-800 text-slate-500 bg-slate-950/20 cursor-not-allowed'
              : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/5 hover:border-emerald-500/40 active:scale-95'
          }`}
          title={aiCooldown ? "Cooldown active (3s)" : "Regenerate Insight"}
        >
          <span>{loading ? 'Refreshing...' : aiCooldown ? 'Hold...' : 'Regenerate'}</span>
        </button>
      </div>

      {/* Warning if API key is missing */}
      {!hasKey && (
        <div className="mb-4 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400">
          💡 Add your Gemini API key in the settings panel (gear icon) to unlock real-time personalized AI tips.
        </div>
      )}

      {errorMsg && (
        <p className="text-xs text-rose-400 mb-3 font-medium bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-lg">
          ⚠️ {errorMsg}
        </p>
      )}

      {loading ? (
        // Skeleton loader
        <div className="space-y-2.5 py-2 animate-pulse">
          <div className="h-4 bg-slate-800/80 rounded w-full"></div>
          <div className="h-4 bg-slate-800/80 rounded w-11/12"></div>
          <div className="h-4 bg-slate-800/80 rounded w-4/5"></div>
        </div>
      ) : (
        <p className="text-slate-300 text-sm leading-relaxed font-light italic">
          "{insight || 'No insight available. Try regenerating!'}"
        </p>
      )}

      {/* AI is thinking tiny tag */}
      {isAiThinking && (
        <div className="absolute bottom-2 right-4 text-[10px] text-emerald-500/60 font-mono italic animate-pulse">
          AI is thinking...
        </div>
      )}
    </div>
  );
}
