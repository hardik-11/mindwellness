import React, { useState } from 'react';

const activityLevels = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Desk job, little to no weekly exercise.' },
  { id: 'lightly_active', label: 'Lightly Active', desc: 'Light exercise or active hobbies 1–3 days/week.' },
  { id: 'moderately_active', label: 'Moderately Active', desc: 'Moderate workout session 3–5 days/week.' },
  { id: 'very_active', label: 'Very Active', desc: 'Intense workouts or athletic activities 6–7 days/week.' }
];

export default function StepDetails({ onNext, onBack, tempProfile, setTempProfile }) {
  const [age, setAge] = useState(tempProfile.age || '');
  const [gender, setGender] = useState(tempProfile.gender || 'male');
  const [height, setHeight] = useState(tempProfile.height || '');
  const [weight, setWeight] = useState(tempProfile.weight || '');
  const [activity, setActivity] = useState(tempProfile.activity || 'sedentary');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!age || age <= 0 || age > 120) errs.age = 'Please enter a valid age (1-120).';
    if (!height || height <= 50 || height > 280) errs.height = 'Please enter a valid height (50-280 cm).';
    if (!weight || weight <= 20 || weight > 400) errs.weight = 'Please enter a valid weight (20-400 kg).';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setTempProfile(prev => ({
      ...prev,
      age: parseInt(age),
      gender,
      height: parseFloat(height),
      weight: parseFloat(weight),
      activity
    }));
    onNext();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 animate-fadeIn">
      <div className="mb-6 text-center">
        <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase bg-emerald-500/10 px-3 py-1 rounded-full">
          Step 2 of 3
        </span>
        <h2 className="text-3xl font-extrabold text-white mt-3">
          Tell us about yourself
        </h2>
        <p className="text-slate-400 mt-1">
          These details are required to calculate your metabolic rate and caloric needs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Gender Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Gender</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setGender('male')}
              className={`py-3 rounded-xl border font-medium text-center transition-all ${
                gender === 'male'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-md shadow-emerald-500/5'
                  : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              🙋‍♂️ Male
            </button>
            <button
              type="button"
              onClick={() => setGender('female')}
              className={`py-3 rounded-xl border font-medium text-center transition-all ${
                gender === 'female'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-md shadow-emerald-500/5'
                  : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              🙋‍♀️ Female
            </button>
          </div>
        </div>

        {/* Physical Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Age</label>
            <input
              type="number"
              placeholder="e.g. 28"
              value={age}
              onChange={e => setAge(e.target.value)}
              className={`w-full bg-slate-900/60 border rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all ${
                errors.age ? 'border-rose-500/80 focus:border-rose-500' : 'border-slate-800 focus:border-emerald-500'
              }`}
            />
            {errors.age && <p className="text-rose-400 text-xs mt-1.5">{errors.age}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Height (cm)</label>
            <input
              type="number"
              placeholder="e.g. 175"
              value={height}
              onChange={e => setHeight(e.target.value)}
              className={`w-full bg-slate-900/60 border rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all ${
                errors.height ? 'border-rose-500/80 focus:border-rose-500' : 'border-slate-800 focus:border-emerald-500'
              }`}
            />
            {errors.height && <p className="text-rose-400 text-xs mt-1.5">{errors.height}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 74.5"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              className={`w-full bg-slate-900/60 border rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all ${
                errors.weight ? 'border-rose-500/80 focus:border-rose-500' : 'border-slate-800 focus:border-emerald-500'
              }`}
            />
            {errors.weight && <p className="text-rose-400 text-xs mt-1.5">{errors.weight}</p>}
          </div>
        </div>

        {/* Activity Level Selector */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Weekly Activity Level</label>
          <div className="space-y-3">
            {activityLevels.map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={() => setActivity(act.id)}
                className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all ${
                  activity === act.id
                    ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30'
                    : 'border-slate-850 bg-slate-900/20 hover:border-slate-850 hover:bg-slate-900/30'
                }`}
              >
                <div>
                  <h4 className="font-semibold text-slate-200 text-sm">{act.label}</h4>
                  <p className="text-slate-400 text-xs mt-0.5">{act.desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  activity === act.id ? 'border-emerald-500 bg-emerald-500' : 'border-slate-700'
                }`}>
                  {activity === act.id && <span className="text-[10px] text-slate-950 font-bold">✓</span>}
                </div>
              </button>
            ))}
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
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
