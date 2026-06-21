import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import StreakBadge from './StreakBadge';
import SkipNotification from './SkipNotification';
import { generateWeeklyReport, hasApiKey } from '../../services/gemini';
import { subDays, format, parseISO } from 'date-fns';

export default function DayTracker() {
  const { profile, logs, streak, aiCooldown, triggerAiCooldown } = useUser();
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [copied, setCopied] = useState(false);

  const plan = profile?.plan || { calories: 2000, protein: 120, carbs: 200, fat: 65 };
  
  // Get active log for selected date
  const dayLog = logs[selectedDate] || {
    totalCal: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    meals: { Breakfast: [], Lunch: [], Dinner: [], Snack: [] }
  };

  // Calorie percentages
  const targetCal = plan.calories;
  const eatenCal = dayLog.totalCal || 0;
  const calPercent = Math.min(100, Math.round((eatenCal / targetCal) * 100));
  const calRemaining = targetCal - eatenCal;

  // Macro progress
  const proteinPercent = Math.min(100, Math.round((dayLog.totalProtein / plan.protein) * 100)) || 0;
  const carbsPercent = Math.min(100, Math.round((dayLog.totalCarbs / plan.carbs) * 100)) || 0;
  const fatPercent = Math.min(100, Math.round((dayLog.totalFat / plan.fat) * 100)) || 0;

  // Date list (last 7 days)
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), i);
    return {
      str: format(d, 'yyyy-MM-dd'),
      label: format(d, 'EEE d'),
      isToday: i === 0
    };
  }).reverse();

  // Generate weekly report
  const handleGetWeeklyReport = async () => {
    if (reportLoading || aiCooldown) return;
    
    setReportError('');
    setReportLoading(true);
    setReportModalOpen(true);
    triggerAiCooldown();

    // Compile logs from the last 7 days
    const weekLogs = last7Days.map(day => {
      const log = logs[day.str] || { totalCal: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
      return {
        date: day.str,
        day: day.label,
        calories: log.totalCal,
        protein: log.totalProtein,
        carbs: log.totalCarbs,
        fat: log.totalFat
      };
    });

    try {
      const report = await generateWeeklyReport(profile, weekLogs);
      setReportText(report);
    } catch (e) {
      console.error(e);
      setReportError('Failed to generate weekly report. Please check your API configuration.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Ring styling configurations
  const radius = 60;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (calPercent / 100) * circumference;

  const hasKey = hasApiKey();

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn px-2 sm:px-4 py-4">
      {/* Recovery Plan SkipNotification */}
      <SkipNotification />

      {/* Header bar (Streak & Report Button) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Daily Tracker</h2>
          <p className="text-slate-400 text-xs mt-0.5">Track and check your daily habits.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StreakBadge streak={streak} />
          
          <button
            onClick={handleGetWeeklyReport}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center space-x-1.5"
            title="Analyze your logs for the past 7 days"
          >
            <span>📊</span>
            <span>AI Weekly Report</span>
          </button>
        </div>
      </div>

      {/* 7-Day Quick Date Selector */}
      <div className="flex justify-between items-center bg-slate-900/40 border border-slate-850 p-2 rounded-2xl gap-2 overflow-x-auto">
        {last7Days.map((day) => {
          const isSelected = selectedDate === day.str;
          const logForDay = logs[day.str];
          const hasLogged = logForDay && logForDay.totalCal > 0;
          return (
            <button
              key={day.str}
              onClick={() => setSelectedDate(day.str)}
              className={`flex-1 min-w-[65px] py-2 px-1 rounded-xl text-center flex flex-col items-center justify-between border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-extrabold ring-1 ring-emerald-500/20'
                  : 'bg-slate-950/20 border-transparent text-slate-400 hover:bg-slate-950/40 hover:text-slate-200'
              }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider">{day.label.split(' ')[0]}</span>
              <span className="text-sm font-extrabold mt-1">{day.label.split(' ')[1]}</span>
              
              {/* Log dot indicator */}
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                hasLogged ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-800'
              }`}></span>
            </button>
          );
        })}
      </div>

      {/* Progress Cards Split */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Calorie Ring Card */}
        <div className="glass p-6 rounded-2xl border border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center text-center">
          <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Calorie Intake</h3>
          
          <div className="relative flex items-center justify-center mb-4">
            <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
              <circle
                stroke="rgba(30, 41, 59, 0.4)"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <circle
                stroke={calRemaining < 0 ? '#f43f5e' : '#10b981'}
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-100">{eatenCal}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">of {targetCal}</span>
            </div>
          </div>

          <div>
            <h4 className={`text-md font-extrabold ${calRemaining < 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
              {calRemaining < 0 
                ? `${Math.abs(calRemaining)} kcal Over Target` 
                : `${calRemaining} kcal Remaining`}
            </h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Updated in real-time as you log meals.</p>
          </div>
        </div>

        {/* Macro Budgets Progress Bars */}
        <div className="glass p-6 rounded-2xl border border-slate-800 bg-slate-900/40 md:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Macro Balance Progress</h3>
            
            <div className="space-y-4">
              {/* Protein */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-slate-300">🍗 Protein ({dayLog.totalProtein}g / {plan.protein}g)</span>
                  <span className="font-bold text-emerald-400">{proteinPercent}%</span>
                </div>
                <div className="w-full bg-slate-950/60 h-3 rounded-full overflow-hidden border border-slate-850">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${proteinPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Carbs */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-slate-300">🥑 Carbs ({dayLog.totalCarbs}g / {plan.carbs}g)</span>
                  <span className="font-bold text-sky-400">{carbsPercent}%</span>
                </div>
                <div className="w-full bg-slate-950/60 h-3 rounded-full overflow-hidden border border-slate-850">
                  <div 
                    className="bg-sky-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${carbsPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Fat */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-slate-300">🥓 Fat ({dayLog.totalFat}g / {plan.fat}g)</span>
                  <span className="font-bold text-amber-500">{fatPercent}%</span>
                </div>
                <div className="w-full bg-slate-950/60 h-3 rounded-full overflow-hidden border border-slate-850">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${fatPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-850/60 flex items-center justify-between text-xs text-slate-500">
            <span>Selected day: <b className="text-slate-300 font-mono">{selectedDate}</b></span>
            <span>Total grams logged: <b className="text-slate-300">{(dayLog.totalProtein || 0) + (dayLog.totalCarbs || 0) + (dayLog.totalFat || 0)}g</b></span>
          </div>
        </div>
      </div>

      {/* Logged Meals Details for selected date */}
      <div className="glass p-6 rounded-2xl border border-slate-800 bg-slate-900/40">
        <h3 className="text-slate-300 text-sm font-bold mb-4">Logged Items Overview ({selectedDate})</h3>
        {eatenCal === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs font-light">
            No items logged for this date. Go to the "🍽️ Log Meals" tab to add food logs.
          </div>
        ) : (
          <div className="divide-y divide-slate-850">
            {Object.keys(dayLog.meals).map((mealType) => {
              const items = dayLog.meals[mealType] || [];
              if (items.length === 0) return null;
              return (
                <div key={mealType} className="py-3 flex justify-between items-start text-xs gap-3">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-slate-850 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                      {mealType}
                    </span>
                    <div className="mt-1.5 space-y-1 pl-1">
                      {items.map((item) => (
                        <div key={item.id} className="text-slate-200">
                          • {item.name} <span className="text-slate-400 font-mono">({item.calories} kcal — P: {item.protein}g C: {item.carbs}g F: {item.fat}g)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Weekly Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-850 flex justify-between items-center bg-slate-950/30">
              <div className="flex items-center space-x-2">
                <span className="text-xl">📊</span>
                <div>
                  <h3 className="text-lg font-black text-white">AI Weekly Progress Report</h3>
                  <p className="text-[10px] text-slate-500">Calculated over your last 7 days of logs</p>
                </div>
              </div>
              <button
                onClick={() => setReportModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 p-2 hover:bg-slate-850 rounded-xl transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {!hasKey && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400">
                  💡 You are running using fallback mocks. Configure your Google Gemini API Key in Settings to get real-time tailored summaries.
                </div>
              )}

              {reportLoading ? (
                <div className="space-y-3.5 py-10 animate-pulse text-center">
                  <div className="w-12 h-12 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
                  <div className="h-4 bg-slate-850 rounded w-3/4 mx-auto"></div>
                  <div className="h-4 bg-slate-850 rounded w-5/6 mx-auto"></div>
                  <div className="h-4 bg-slate-850 rounded w-2/3 mx-auto"></div>
                </div>
              ) : reportError ? (
                <div className="text-center py-10">
                  <span className="text-3xl">⚠️</span>
                  <p className="text-rose-400 text-sm font-semibold mt-3">{reportError}</p>
                </div>
              ) : (
                <div className="text-sm text-slate-200 whitespace-pre-line leading-relaxed border border-slate-850/80 p-5 rounded-2xl bg-slate-950/20 font-sans font-light">
                  {reportText}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-6 border-t border-slate-850 bg-slate-950/30 flex justify-end gap-3">
              <button
                onClick={() => setReportModalOpen(false)}
                className="px-4 py-2 border border-slate-850 hover:bg-slate-850 text-slate-300 font-bold rounded-xl text-xs transition-all"
              >
                Close
              </button>
              
              {!reportLoading && !reportError && reportText && (
                <button
                  onClick={handleCopyReport}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl text-xs transition-all flex items-center space-x-1.5"
                >
                  <span>{copied ? '✓ Copied' : '📋 Copy Report'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
