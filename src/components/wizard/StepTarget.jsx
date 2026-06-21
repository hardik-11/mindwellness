import React, { useState } from 'react';

const dietTypes = [
  { id: 'standard', name: 'Balanced Standard', desc: '50% Carbs, 20% Protein, 30% Fat. Standard diet.', emoji: '🥑' },
  { id: 'high-protein', name: 'High Protein', desc: '35% Carbs, 35% Protein, 30% Fat. Best for athletic recovery.', emoji: '🍗' },
  { id: 'low-carb', name: 'Low Carb', desc: '15% Carbs, 35% Protein, 50% Fat. Slower carbs, higher fats.', emoji: '🍳' },
  { id: 'keto', name: 'Ketogenic (Keto)', desc: '5% Carbs, 25% Protein, 70% Fat. Ultra low-carb, fat adapted.', emoji: '🥓' }
];

export default function StepTarget({ onNext, onBack, tempProfile, setTempProfile }) {
  const [targetWeight, setTargetWeight] = useState(tempProfile.targetWeight || '');
  const [timeframe, setTimeframe] = useState(tempProfile.timeframe || '');
  const [diet, setDiet] = useState(tempProfile.diet || 'standard');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!targetWeight || targetWeight <= 20 || targetWeight > 400) {
      errs.targetWeight = 'Please enter a target weight between 20 and 400 kg.';
    }
    if (!timeframe || timeframe < 1 || timeframe > 24) {
      errs.timeframe = 'Please specify a timeline of 1 to 24 months.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setTempProfile(prev => ({
      ...prev,
      targetWeight: parseFloat(targetWeight),
      timeframe: parseInt(timeframe),
      diet
    }));
    onNext();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 animate-fadeIn">
      <div className="mb-6 text-center">
        <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase bg-emerald-500/10 px-3 py-1 rounded-full">
          Step 3 of 3
        </span>
        <h2 className="text-3xl font-extrabold text-white mt-3">
          Target & Diet Preference
        </h2>
        <p className="text-slate-400 mt-1">
          Define your target milestones and select your preferred nutritional layout.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Targets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Target Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              placeholder={`Current: ${tempProfile.weight || 70}kg`}
              value={targetWeight}
              onChange={e => setTargetWeight(e.target.value)}
              className={`w-full bg-slate-900/60 border rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all ${
                errors.targetWeight ? 'border-rose-500/80 focus:border-rose-500' : 'border-slate-800 focus:border-emerald-500'
              }`}
            />
            {errors.targetWeight && <p className="text-rose-400 text-xs mt-1.5">{errors.targetWeight}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Timeframe (months)</label>
            <input
              type="number"
              placeholder="e.g. 3"
              value={timeframe}
              onChange={e => setTimeframe(e.target.value)}
              className={`w-full bg-slate-900/60 border rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all ${
                errors.timeframe ? 'border-rose-500/80 focus:border-rose-500' : 'border-slate-800 focus:border-emerald-500'
              }`}
            />
            {errors.timeframe && <p className="text-rose-400 text-xs mt-1.5">{errors.timeframe}</p>}
          </div>
        </div>

        {/* Diet Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-3">Dietary Approach</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dietTypes.map((dt) => {
              const isSelected = diet === dt.id;
              return (
                <button
                  key={dt.id}
                  type="button"
                  onClick={() => setDiet(dt.id)}
                  className={`glass glass-hover p-4 rounded-xl border text-left flex items-start space-x-3 transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30'
                      : 'border-slate-800 bg-slate-900/40'
                  }`}
                >
                  <span className="text-2xl mt-1">{dt.emoji}</span>
                  <div>
                    <h4 className={`font-bold text-sm ${isSelected ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {dt.name}
                    </h4>
                    <p className="text-slate-400 text-xs mt-1 leading-snug">
                      {dt.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-4 gap-4">
          <button
            type="button"
            onClick={onBack}
            className="w-1/3 py-3 border border-slate-800 hover:border-slate-750 hover:bg-slate-900/40 text-slate-300 font-bold rounded-xl transition-all"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-emerald-500/10"
          >
            Generate My Plan
          </button>
        </div>
      </form>
    </div>
  );
}
