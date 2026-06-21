import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { generateMealPlan, hasApiKey } from '../../services/gemini';

export default function AIMealSuggestion() {
  const { profile, mealPlan, setMealPlan, aiCooldown, triggerAiCooldown } = useUser();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [openDay, setOpenDay] = useState(null); // Accordion active day index

  const handleGenerate = async () => {
    if (loading || aiCooldown) return;
    
    setLoading(true);
    setErrorMsg('');
    triggerAiCooldown();

    try {
      const plan = await generateMealPlan(profile, 7);
      setMealPlan(plan);
      setOpenDay(1); // Open day 1 by default
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to generate 7-day meal plan. Check your API settings.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day) => {
    setOpenDay(openDay === day ? null : day);
  };

  const hasKey = hasApiKey();

  return (
    <div className="glass p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-100 flex items-center space-x-1.5">
            <span>✨</span>
            <span>AI 7-Day Meal Plan</span>
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Personalized meal layouts targeted to match your calorie deficit/surplus limits.
          </p>
        </div>

        {mealPlan && (
          <button
            onClick={handleGenerate}
            disabled={loading || aiCooldown}
            className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all ${
              loading || aiCooldown
                ? 'border-slate-800 text-slate-500 bg-slate-950/20 cursor-not-allowed'
                : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/5 hover:border-emerald-500/40 active:scale-95'
            }`}
          >
            {loading ? 'Generating...' : 'Regenerate'}
          </button>
        )}
      </div>

      {!hasKey && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400">
          💡 Gemini key is missing. The meal plan generator will use local fallback structures.
        </div>
      )}

      {errorMsg && (
        <p className="text-xs text-rose-400 font-medium bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-lg">
          ⚠️ {errorMsg}
        </p>
      )}

      {loading ? (
        <div className="space-y-4 py-8 text-center animate-pulse">
          <div className="w-12 h-12 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xs text-slate-400">Gemini is compiling your weekly menu...</p>
          <div className="space-y-2 max-w-sm mx-auto">
            <div className="h-3 bg-slate-800 rounded w-full"></div>
            <div className="h-3 bg-slate-800 rounded w-5/6"></div>
          </div>
        </div>
      ) : !mealPlan ? (
        // Empty state
        <div className="text-center py-10 space-y-4 bg-slate-950/20 border border-dashed border-slate-850 rounded-2xl">
          <span className="text-4xl block">🥗</span>
          <div className="max-w-xs mx-auto">
            <h4 className="font-bold text-slate-200 text-sm">No Meal Plan Generated Yet</h4>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              We'll construct 7 full days of calorie-matched meals based on your {profile?.diet} diet rules.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={aiCooldown}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95"
          >
            Generate 7-Day Meal Plan
          </button>
        </div>
      ) : (
        // Accordion list
        <div className="space-y-3">
          {mealPlan.map((dayPlan) => {
            const isOpen = openDay === dayPlan.day;
            return (
              <div 
                key={dayPlan.day} 
                className={`border rounded-xl transition-all ${
                  isOpen 
                    ? 'border-emerald-500/30 bg-slate-950/20 shadow-md' 
                    : 'border-slate-850 bg-slate-950/10'
                }`}
              >
                {/* Accordion Trigger */}
                <button
                  onClick={() => toggleDay(dayPlan.day)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left cursor-pointer focus:outline-none"
                >
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">Day {dayPlan.day} Menu</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Target: {dayPlan.totalCalories} kcal</p>
                  </div>
                  <span className={`text-slate-400 text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
                    ▼
                  </span>
                </button>

                {/* Accordion Content */}
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-slate-850/60 divide-y divide-slate-850/60 animate-fadeIn">
                    {dayPlan.meals.map((meal, idx) => (
                      <div key={idx} className="py-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                              {meal.type}
                            </span>
                            <h5 className="font-bold text-slate-200 mt-1.5 text-xs">
                              {meal.name}
                            </h5>
                          </div>
                          
                          <div className="text-right">
                            <span className="font-mono font-extrabold text-sm text-slate-200 block">
                              {meal.calories} <span className="text-[10px] text-slate-500 font-normal">kcal</span>
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                              P: {meal.protein}g C: {meal.carbs}g F: {meal.fat}g
                            </span>
                          </div>
                        </div>

                        {/* Ingredients */}
                        {meal.ingredients && meal.ingredients.length > 0 && (
                          <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-850/40 mt-2">
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-semibold mb-1">Ingredients Checklist</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {meal.ingredients.map((ing, iIdx) => (
                                <span key={iIdx} className="text-[10px] text-slate-300 bg-slate-900 border border-slate-850 px-2 py-0.5 rounded-md font-light">
                                  {ing}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
