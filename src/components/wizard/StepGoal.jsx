import React from 'react';

const goals = [
  {
    id: 'lose_weight_slow',
    label: 'Steady Burn',
    desc: 'Lose weight steadily and sustainably (350 kcal deficit). Best for long-term health.',
    icon: '🔥',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'lose_weight_fast',
    label: 'Fast Track',
    desc: 'Higher deficit (750 kcal deficit) for faster weight loss. Requires discipline.',
    icon: '⚡',
    color: 'from-amber-500 to-orange-600'
  },
  {
    id: 'gain_muscle',
    label: 'Lean Bulk',
    desc: 'Build muscle with a moderate calorie surplus (350 kcal surplus) and high protein.',
    icon: '💪',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'maintain',
    label: 'Balanced Life',
    desc: 'Maintain your current weight. Focus on healthy habits and energy stabilization.',
    icon: '🥗',
    color: 'from-purple-500 to-pink-600'
  }
];

export default function StepGoal({ currentStep, onNext, tempProfile, setTempProfile }) {
  const handleSelectGoal = (goalId, goalLabel) => {
    setTempProfile(prev => ({
      ...prev,
      goal: goalId,
      goalLabel: goalLabel
    }));
    onNext();
  };

  if (currentStep === 0) {
    return (
      <div className="flex flex-col items-center text-center max-w-2xl mx-auto px-4 py-8 animate-fadeIn">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full"></div>
          <div className="relative text-7xl bg-slate-900 border border-slate-700 p-6 rounded-3xl shadow-xl">
            🥗
          </div>
        </div>
        
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-4 sm:text-5xl">
          Meet <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">MealMind AI</span>
        </h1>
        <p className="text-lg text-slate-300 mb-8 max-w-lg leading-relaxed">
          Your personal AI-powered nutritionist and calorie tracker. We design customized plans, suggest delicious meals, and coach you daily using Google Gemini.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-8 text-left">
          <div className="glass p-4 rounded-xl border border-slate-800 flex items-start space-x-3">
            <span className="text-2xl text-emerald-400">📊</span>
            <div>
              <h3 className="font-semibold text-slate-100">Smart Plans</h3>
              <p className="text-xs text-slate-400">Tailored calories and macro splits.</p>
            </div>
          </div>
          <div className="glass p-4 rounded-xl border border-slate-800 flex items-start space-x-3">
            <span className="text-2xl text-teal-400">🍽️</span>
            <div>
              <h3 className="font-semibold text-slate-100">AI Meal Ideas</h3>
              <p className="text-xs text-slate-400">7-day plans matching your diet type.</p>
            </div>
          </div>
          <div className="glass p-4 rounded-xl border border-slate-800 flex items-start space-x-3">
            <span className="text-2xl text-amber-400">💬</span>
            <div>
              <h3 className="font-semibold text-slate-100">24/7 AI Coach</h3>
              <p className="text-xs text-slate-400">Ask any questions, anytime.</p>
            </div>
          </div>
        </div>

        <button
          onClick={onNext}
          className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-2xl shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-lg"
        >
          Let's Build Your Plan
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 animate-fadeIn">
      <div className="mb-8 text-center">
        <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase bg-emerald-500/10 px-3 py-1 rounded-full">
          Step 1 of 3
        </span>
        <h2 className="text-3xl font-extrabold text-white mt-3">
          What is your primary goal?
        </h2>
        <p className="text-slate-400 mt-2">
          Select a path. We'll build calorie targets and nutrition splits around this.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((g) => {
          const isSelected = tempProfile.goal === g.id;
          return (
            <button
              key={g.id}
              onClick={() => handleSelectGoal(g.id, g.label)}
              className={`glass glass-hover p-6 rounded-2xl border text-left flex items-start space-x-4 cursor-pointer relative overflow-hidden transition-all group ${
                isSelected 
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-slate-800/80 shadow-xl' 
                  : 'border-slate-800 bg-slate-900/40'
              }`}
            >
              <div className={`text-4xl p-3 bg-gradient-to-br ${g.color} rounded-2xl text-white shadow-md transform group-hover:scale-110 transition-transform duration-300`}>
                {g.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                  {g.label}
                </h3>
                <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                  {g.desc}
                </p>
              </div>
              
              {isSelected && (
                <div className="absolute right-4 top-4 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md text-xs border border-emerald-500/20">
                  Selected
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
