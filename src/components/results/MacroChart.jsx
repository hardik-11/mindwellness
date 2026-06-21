import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function MacroChart({ profile }) {
  const plan = profile?.plan || {};
  const protein = plan.protein || 100;
  const carbs = plan.carbs || 200;
  const fat = plan.fat || 60;

  // Compute total calories from macros for percentage visualization
  const proteinCalories = protein * 4;
  const carbsCalories = carbs * 4;
  const fatCalories = fat * 9;
  const totalCalories = proteinCalories + carbsCalories + fatCalories;

  const proteinPct = Math.round((proteinCalories / totalCalories) * 100) || 20;
  const carbsPct = Math.round((carbsCalories / totalCalories) * 100) || 50;
  const fatPct = Math.round((fatCalories / totalCalories) * 100) || 30;

  const data = {
    labels: ['Protein', 'Carbs', 'Fat'],
    datasets: [
      {
        data: [protein, carbs, fat],
        backgroundColor: [
          'rgba(16, 185, 129, 0.85)', // Emerald for Protein
          'rgba(56, 189, 248, 0.85)', // Sky blue for Carbs
          'rgba(245, 158, 11, 0.85)'   // Amber for Fat
        ],
        borderColor: [
          '#10b981',
          '#38bdf8',
          '#f59e0b'
        ],
        borderWidth: 1.5,
        hoverOffset: 4,
        cutout: '75%'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false // Using custom legends below for cleaner look
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            return ` ${label}: ${value}g`;
          }
        },
        backgroundColor: '#0f172a',
        titleColor: '#94a3b8',
        bodyColor: '#f8fafc',
        borderColor: '#1e293b',
        borderWidth: 1
      }
    }
  };

  return (
    <div className="glass p-6 rounded-2xl border border-slate-800 bg-slate-900/40">
      <h3 className="text-lg font-bold text-slate-100 mb-6">Macro Allocation</h3>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
        {/* Doughnut Chart Container */}
        <div className="relative w-40 h-40">
          <Doughnut data={data} options={options} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-slate-400 text-xs uppercase tracking-wider">Macros</span>
            <span className="text-xl font-black text-slate-200">{plan.calories}</span>
            <span className="text-[10px] text-slate-500">kcal</span>
          </div>
        </div>

        {/* Legend list */}
        <div className="space-y-4 flex-1 max-w-[280px] sm:max-w-[200px] w-full mt-4 sm:mt-0">
          {/* Protein */}
          <div className="flex items-center justify-between border-b border-slate-850 pb-2">
            <div className="flex items-center space-x-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500/30"></span>
              <span className="font-semibold text-slate-300 text-sm">Protein</span>
            </div>
            <div className="text-right">
              <span className="text-slate-100 font-extrabold text-sm block">{protein}g</span>
              <span className="text-[10px] text-emerald-400 font-medium block">{proteinPct}% ({protein * 4} kcal)</span>
            </div>
          </div>

          {/* Carbs */}
          <div className="flex items-center justify-between border-b border-slate-850 pb-2">
            <div className="flex items-center space-x-2.5">
              <span className="w-3 h-3 rounded-full bg-sky-400 inline-block shadow-sm shadow-sky-500/30"></span>
              <span className="font-semibold text-slate-300 text-sm">Carbs</span>
            </div>
            <div className="text-right">
              <span className="text-slate-100 font-extrabold text-sm block">{carbs}g</span>
              <span className="text-[10px] text-sky-400 font-medium block">{carbsPct}% ({carbs * 4} kcal)</span>
            </div>
          </div>

          {/* Fat */}
          <div className="flex items-center justify-between border-b border-slate-850 pb-2">
            <div className="flex items-center space-x-2.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-sm shadow-amber-500/30"></span>
              <span className="font-semibold text-slate-300 text-sm">Fat</span>
            </div>
            <div className="text-right">
              <span className="text-slate-100 font-extrabold text-sm block">{fat}g</span>
              <span className="text-[10px] text-amber-400 font-medium block">{fatPct}% ({fat * 9} kcal)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
