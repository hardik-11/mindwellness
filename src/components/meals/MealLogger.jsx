import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import FoodSearch from './FoodSearch';
import AIMealSuggestion from './AIMealSuggestion';
import { analyzeDay, hasApiKey } from '../../services/gemini';
import { format } from 'date-fns';

const mealCategories = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export default function MealLogger() {
  const { 
    profile, 
    logs, 
    logFoodItem, 
    removeFoodItem, 
    setDayAnalysis, 
    aiCooldown, 
    triggerAiCooldown 
  } = useUser();

  const [activeSubTab, setActiveSubTab] = useState('log'); // log, suggestions
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const plan = profile?.plan || { calories: 2000, protein: 120, carbs: 200, fat: 65 };
  
  // Get active log for today
  const todayLog = logs[todayStr] || {
    totalCal: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    meals: { Breakfast: [], Lunch: [], Dinner: [], Snack: [] },
    analysis: ''
  };

  const handleAddFood = (mealType, foodItem) => {
    logFoodItem(todayStr, mealType, foodItem);
  };

  const handleAnalyzeDay = async () => {
    if (analysisLoading || aiCooldown) return;
    
    setAnalysisError('');
    setAnalysisLoading(true);
    triggerAiCooldown();

    try {
      const text = await analyzeDay(profile, todayLog);
      setDayAnalysis(todayStr, text);
    } catch (e) {
      console.error(e);
      setAnalysisError('Could not generate AI analysis. Check API config.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const hasKey = hasApiKey();

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn px-2 sm:px-4 py-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Log Meals</h2>
          <p className="text-slate-400 text-xs mt-0.5">Search and log your nutrition or get meal plans.</p>
        </div>

        {/* Sub Navigation */}
        <div className="bg-slate-900/60 p-1 border border-slate-850 rounded-xl flex">
          <button
            onClick={() => setActiveSubTab('log')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'log'
                ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🍽️ Logger
          </button>
          <button
            onClick={() => setActiveSubTab('suggestions')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'suggestions'
                ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ✨ AI suggestions
          </button>
        </div>
      </div>

      {activeSubTab === 'suggestions' ? (
        <AIMealSuggestion />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Logging & Search */}
          <div className="md:col-span-2 space-y-6">
            {/* Food Search panel */}
            <div className="glass p-5 rounded-2xl border border-slate-800 bg-slate-900/40">
              <FoodSearch onAddFood={handleAddFood} />
            </div>

            {/* Logged List Panel */}
            <div className="glass p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider">Today's Meals Menu</h3>

              <div className="space-y-4">
                {mealCategories.map((cat) => {
                  const items = todayLog.meals[cat] || [];
                  return (
                    <div key={cat} className="bg-slate-950/20 border border-slate-850/60 rounded-xl p-4 space-y-2.5">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-850/40">
                        <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                          <span>{cat === 'Breakfast' ? '🍳' : cat === 'Lunch' ? '🥗' : cat === 'Dinner' ? '🍗' : '🍌'}</span>
                          <span>{cat}</span>
                        </h4>
                        
                        <span className="text-[10px] text-slate-500 font-mono">
                          {items.reduce((sum, item) => sum + item.calories, 0)} kcal total
                        </span>
                      </div>

                      {items.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic py-1 pl-1">No items logged yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-xs py-1.5 pl-1.5 border-l-2 border-emerald-500/20 bg-slate-950/10 rounded-r-md">
                              <div>
                                <span className="font-bold text-slate-200">{item.name}</span>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  {item.calories} kcal • P: {item.protein}g C: {item.carbs}g F: {item.fat}g
                                </div>
                              </div>
                              <button
                                onClick={() => removeFoodItem(todayStr, cat, item.id)}
                                className="text-slate-500 hover:text-rose-400 p-1.5 hover:bg-rose-500/5 rounded-lg transition-all text-xs"
                                title="Remove Log Item"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Daily Macro Status & AI Analysis */}
          <div className="space-y-6">
            {/* Calorie Stats Card */}
            <div className="glass p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nutrition Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Calories:</span>
                  <span className="font-bold font-mono text-slate-200">
                    {todayLog.totalCal} / {plan.calories} <span className="text-[10px] text-slate-500">kcal</span>
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-850">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${todayLog.totalCal > plan.calories ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, Math.round((todayLog.totalCal / plan.calories) * 100))}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px] text-center pt-2">
                  <div className="bg-slate-950/40 p-2 border border-slate-850 rounded-lg">
                    <span className="text-slate-500 block">Protein</span>
                    <span className="font-bold text-slate-300 font-mono mt-0.5 block">{todayLog.totalProtein}g</span>
                    <span className="text-[8px] text-slate-500 block">Target: {plan.protein}g</span>
                  </div>
                  <div className="bg-slate-950/40 p-2 border border-slate-850 rounded-lg">
                    <span className="text-slate-500 block">Carbs</span>
                    <span className="font-bold text-slate-300 font-mono mt-0.5 block">{todayLog.totalCarbs}g</span>
                    <span className="text-[8px] text-slate-500 block">Target: {plan.carbs}g</span>
                  </div>
                  <div className="bg-slate-950/40 p-2 border border-slate-850 rounded-lg">
                    <span className="text-slate-500 block">Fat</span>
                    <span className="font-bold text-slate-300 font-mono mt-0.5 block">{todayLog.totalFat}g</span>
                    <span className="text-[8px] text-slate-500 block">Target: {plan.fat}g</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Day Analysis Card */}
            <div className="glass p-5 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/60 to-teal-950/10 relative overflow-hidden shadow-xl space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-lg">✨</span>
                <h3 className="font-extrabold text-slate-100 text-xs uppercase tracking-wider">AI Day Analysis</h3>
              </div>

              {!hasKey && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-2.5 text-[10px] text-amber-400 leading-snug">
                  💡 Gemini API Key is missing. Live feedback is running in mock mode. Add your key in Settings.
                </div>
              )}

              {analysisError && (
                <p className="text-xs text-rose-400 bg-rose-500/5 border border-rose-500/10 p-2 rounded-lg">
                  ⚠️ {analysisError}
                </p>
              )}

              {todayLog.analysis ? (
                <p className="text-slate-300 text-xs leading-relaxed italic bg-slate-950/30 p-3 border border-slate-850 rounded-xl">
                  "{todayLog.analysis}"
                </p>
              ) : (
                <p className="text-slate-400 text-xs italic">
                  No analysis generated yet. Click below when you're finished logging for the day.
                </p>
              )}

              <button
                onClick={handleAnalyzeDay}
                disabled={analysisLoading || aiCooldown || todayLog.totalCal === 0}
                className={`w-full py-2.5 border rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                  analysisLoading || aiCooldown || todayLog.totalCal === 0
                    ? 'border-slate-800 text-slate-500 bg-slate-950/20 cursor-not-allowed'
                    : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/5 hover:border-emerald-500/40 active:scale-95'
                }`}
              >
                <span>{analysisLoading ? 'AI is analyzing...' : 'Analyze My Day'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
