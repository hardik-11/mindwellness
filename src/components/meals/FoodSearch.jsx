import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import { searchFoodCalories, hasApiKey } from '../../services/gemini';

export default function FoodSearch({ onAddFood }) {
  const { profile, aiCooldown, triggerAiCooldown } = useUser();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('Breakfast');

  const diet = profile?.diet || 'standard';

  // 1. Debounce logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  // 2. Fetch search results
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const fetchFood = async () => {
      setLoading(true);
      setError('');

      const cacheKey = `nutri_foodsearch_${diet}_${trimmed.toLowerCase()}`;
      
      // Check sessionStorage cache first
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          setResults(JSON.parse(cached));
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error("Session storage read error", e);
      }

      try {
        const data = await searchFoodCalories(trimmed, diet);
        setResults(data);

        // Store to sessionStorage cache
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (e) {
          console.error("Session storage write error", e);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to search food items.');
      } finally {
        setLoading(false);
      }
    };

    fetchFood();
  }, [debouncedQuery, diet]);

  const handleSelectFood = (food) => {
    onAddFood(selectedMealType, food);
    // Show a small feedback alert or clear input
    setQuery('');
  };

  const hasKey = hasApiKey();

  return (
    <div className="space-y-4">
      {/* Header with Search and Category Select */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Category Picker */}
        <div className="w-full sm:w-1/3">
          <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Add To Category</label>
          <select
            value={selectedMealType}
            onChange={(e) => setSelectedMealType(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-3 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 transition-all font-semibold"
          >
            <option value="Breakfast">🍳 Breakfast</option>
            <option value="Lunch">🥗 Lunch</option>
            <option value="Dinner">🍖 Dinner</option>
            <option value="Snack">🍌 Snack</option>
          </select>
        </div>

        {/* Input Bar */}
        <div className="flex-1">
          <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">AI Food Search</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Type a food (e.g. 2 boiled eggs, grilled salmon 150g...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
            />
            <span className="absolute left-3.5 top-3.5 text-slate-500 text-sm">🔍</span>
            
            {loading && (
              <span className="absolute right-3.5 top-3.5 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
              </span>
            )}
          </div>
        </div>
      </div>

      {!hasKey && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-[10px] text-amber-400">
          💡 Gemini key is missing. Food search is running in mock mode and returning portion estimates.
        </div>
      )}

      {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

      {/* Clickable Results Cards */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 animate-fadeIn">
          {results.map((food, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectFood(food)}
              className="glass glass-hover p-3.5 rounded-xl border border-slate-850 text-left hover:border-emerald-500/40 relative overflow-hidden transition-all group cursor-pointer"
            >
              <h5 className="font-extrabold text-slate-200 text-xs group-hover:text-emerald-400 transition-colors truncate pr-6">
                {food.name}
              </h5>
              
              <div className="flex justify-between items-center mt-2.5">
                <span className="text-md font-bold text-slate-100 font-mono">
                  {food.calories} <span className="text-[10px] text-slate-500 font-normal">kcal</span>
                </span>
                
                <div className="flex space-x-2 text-[9px] text-slate-400 font-mono">
                  <span>P: {food.protein}g</span>
                  <span>C: {food.carbs}g</span>
                  <span>F: {food.fat}g</span>
                </div>
              </div>

              {/* Log Badge */}
              <span className="absolute right-2.5 top-2.5 opacity-0 group-hover:opacity-100 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 transition-opacity">
                + Log
              </span>
            </button>
          ))}
        </div>
      )}

      {query.trim().length >= 2 && !loading && results.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-4 italic">
          No food options generated. Try searching for another ingredient.
        </p>
      )}
    </div>
  );
}
