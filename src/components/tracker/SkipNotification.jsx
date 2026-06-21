import React, { useEffect, useState } from 'react';
import { useUser } from '../../context/UserContext';
import { generateRecoveryPlan, hasApiKey } from '../../services/gemini';
import { KEYS } from '../../utils/storage';
import { format } from 'date-fns';

export default function SkipNotification() {
  const { profile, missedDays } = useUser();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recoveryPlan, setRecoveryPlan] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Check if recovery banner should be shown
    if (missedDays < 2) {
      setVisible(false);
      return;
    }

    // Check if user dismissed it today
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const dismissedDate = localStorage.getItem(KEYS.DISMISS_RECOVERY);
    if (dismissedDate === todayStr) {
      setVisible(false);
      return;
    }

    setVisible(true);

    // Fetch the recovery plan
    let isMounted = true;
    async function fetchPlan() {
      setLoading(true);
      setErrorMsg('');
      try {
        const text = await generateRecoveryPlan(profile, missedDays);
        if (isMounted) {
          setRecoveryPlan(text);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setErrorMsg('Could not fetch recovery tips.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchPlan();

    return () => {
      isMounted = false;
    };
  }, [missedDays, profile]);

  const handleDismiss = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    localStorage.setItem(KEYS.DISMISS_RECOVERY, todayStr);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/20 rounded-2xl p-5 shadow-lg relative overflow-hidden animate-fadeIn mb-6">
      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full pointer-events-none"></div>

      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3.5">
          <span className="text-3xl mt-0.5">🌱</span>
          <div>
            <h4 className="font-extrabold text-amber-400 text-sm tracking-wide uppercase">
              Welcome Back! (Missed {missedDays} {missedDays === 1 ? 'Day' : 'Days'})
            </h4>
            <p className="text-slate-300 text-xs mt-0.5 max-w-lg leading-relaxed">
              No worries about missing days. Every day is a clean slate. Let's ease back into your habit with this quick AI checklist:
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-slate-500 hover:text-slate-300 text-xs px-2.5 py-1 bg-slate-950/20 hover:bg-slate-950/40 rounded-lg border border-slate-800 transition-all font-semibold"
        >
          Dismiss
        </button>
      </div>

      {/* Recovery Steps */}
      <div className="mt-4 pl-12">
        {loading ? (
          <div className="space-y-2 animate-pulse max-w-md">
            <div className="h-3 bg-slate-800 rounded w-full"></div>
            <div className="h-3 bg-slate-800 rounded w-11/12"></div>
            <div className="h-3 bg-slate-800 rounded w-5/6"></div>
          </div>
        ) : errorMsg ? (
          <p className="text-xs text-rose-400 italic font-mono">{errorMsg}</p>
        ) : (
          <div className="text-xs text-slate-300 space-y-2 whitespace-pre-line leading-relaxed font-light font-sans">
            {recoveryPlan}
          </div>
        )}
      </div>
    </div>
  );
}
