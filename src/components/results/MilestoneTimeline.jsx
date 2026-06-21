import React from 'react';

export default function MilestoneTimeline({ profile }) {
  const plan = profile?.plan || {};
  const milestones = plan.milestones || [];
  const startWeight = profile?.weight || 0;
  const targetWeight = profile?.targetWeight || 0;

  if (milestones.length === 0) return null;

  return (
    <div className="glass p-6 rounded-2xl border border-slate-800 bg-slate-900/40">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-100">Weight Projections</h3>
        <span className="text-xs text-slate-400">
          Start: {startWeight} kg → Target: {targetWeight} kg
        </span>
      </div>

      <div className="relative pl-6 space-y-6">
        {/* Vertical line connector */}
        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-800"></div>

        {milestones.map((m, index) => {
          return (
            <div key={index} className="relative flex items-start space-x-4">
              {/* Dot */}
              <div className="absolute -left-6 top-1.5 w-4.5 h-4.5 rounded-full bg-slate-950 border-2 border-emerald-500 flex items-center justify-center z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
              </div>

              <div className="flex-1 bg-slate-950/20 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-100">{m.label}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Projected timeline: Week {m.week}</p>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-extrabold text-lg block">{m.weight} <span className="text-xs font-normal text-slate-500">kg</span></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
