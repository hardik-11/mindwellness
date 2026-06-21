import React from 'react';

export default function StreakBadge({ streak }) {
  const isHighStreak = streak >= 5;

  return (
    <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all ${
      streak > 0
        ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 animate-pulse'
        : 'bg-slate-900/40 border-slate-800 text-slate-500'
    }`}>
      <span className={`text-lg transform transition-transform ${streak > 0 ? 'scale-110' : 'scale-100'}`}>
        {streak > 0 ? '🔥' : '❄️'}
      </span>
      <span className="text-xs font-bold font-mono">
        {streak} {streak === 1 ? 'Day Streak' : 'Days Streak'}
      </span>
      {isHighStreak && (
        <span className="text-[10px] bg-orange-500 text-slate-950 font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider scale-90 animate-bounce">
          Unstoppable
        </span>
      )}
    </div>
  );
}
