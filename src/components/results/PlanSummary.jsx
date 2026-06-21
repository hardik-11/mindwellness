import React from 'react';

export default function PlanSummary({ profile }) {
  const plan = profile?.plan || {};
  const currentWeight = profile?.weight || 0;
  const targetWeight = profile?.targetWeight || 0;
  const height = profile?.height || 0;
  const age = profile?.age || 0;
  const gender = profile?.gender || 'male';
  const goalLabel = profile?.goalLabel || 'Goal';

  // Get BMI category and color
  const bmi = plan.bmi || 0;
  let bmiCategory = 'Healthy Weight';
  let bmiColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

  if (bmi < 18.5) {
    bmiCategory = 'Underweight';
    bmiColor = 'text-sky-400 bg-sky-500/10 border-sky-500/20';
  } else if (bmi >= 25 && bmi < 30) {
    bmiCategory = 'Overweight';
    bmiColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  } else if (bmi >= 30) {
    bmiCategory = 'Obese';
    bmiColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  }

  return (
    <div className="space-y-6">
      {/* Target Calorie Hero Card */}
      <div className="relative overflow-hidden glass p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/5 blur-3xl rounded-full pointer-events-none"></div>
        
        <div className="text-center sm:text-left space-y-2">
          <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Daily Budget
          </span>
          <h1 className="text-5xl font-black text-white tracking-tight pt-1">
            {plan.calories} <span className="text-lg font-medium text-slate-400">kcal</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-sm">
            Target allowance for <span className="text-slate-200 font-semibold">{goalLabel.toLowerCase()}</span>, adjusted for your activity level.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full sm:w-auto text-center">
          <div className="bg-slate-950/40 border border-slate-850 px-4 py-3 rounded-xl min-w-[110px]">
            <span className="text-xs text-slate-500 block">BMR</span>
            <span className="text-md font-bold text-slate-200">{plan.bmr}</span>
            <span className="text-[10px] text-slate-400 block font-light">Basal Rate</span>
          </div>
          <div className="bg-slate-950/40 border border-slate-850 px-4 py-3 rounded-xl min-w-[110px]">
            <span className="text-xs text-slate-500 block">TDEE</span>
            <span className="text-md font-bold text-slate-200">{plan.tdee}</span>
            <span className="text-[10px] text-slate-400 block font-light">Active Burn</span>
          </div>
        </div>
      </div>

      {/* User Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Height Weight age */}
        <div className="glass p-4 rounded-xl border border-slate-850 text-center">
          <span className="text-xs text-slate-500 block">Current Weight</span>
          <span className="text-2xl font-extrabold text-slate-100 mt-1 block">{currentWeight} kg</span>
          <span className="text-xs text-slate-400 mt-0.5 block">Height: {height} cm</span>
        </div>

        <div className="glass p-4 rounded-xl border border-slate-850 text-center">
          <span className="text-xs text-slate-500 block">Target Weight</span>
          <span className="text-2xl font-extrabold text-teal-400 mt-1 block">{targetWeight} kg</span>
          <span className="text-xs text-slate-400 mt-0.5 block">Timeframe: {profile?.timeframe} months</span>
        </div>

        <div className="glass p-4 rounded-xl border border-slate-850 text-center">
          <span className="text-xs text-slate-500 block">Age & Gender</span>
          <span className="text-2xl font-extrabold text-slate-100 mt-1 block">
            {age} yrs
          </span>
          <span className="text-xs text-slate-400 mt-0.5 block capitalize">
            {gender === 'male' ? '🙋‍♂️ Male' : '🙋‍♀️ Female'}
          </span>
        </div>

        <div className="glass p-4 rounded-xl border border-slate-850 text-center">
          <span className="text-xs text-slate-500 block">BMI & Category</span>
          <span className="text-2xl font-extrabold text-slate-100 mt-1 block">
            {bmi}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 inline-block uppercase tracking-wider ${bmiColor}`}>
            {bmiCategory}
          </span>
        </div>
      </div>
    </div>
  );
}
