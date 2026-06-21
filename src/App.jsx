import React, { useState } from 'react';
import { UserProvider, useUser } from './context/UserContext';

// Import Wizard Steps
import StepGoal from './components/wizard/StepGoal';
import StepDetails from './components/wizard/StepDetails';
import StepTarget from './components/wizard/StepTarget';
import StepLoading from './components/wizard/StepLoading';

// Import Results Components
import PlanSummary from './components/results/PlanSummary';
import MacroChart from './components/results/MacroChart';
import MilestoneTimeline from './components/results/MilestoneTimeline';
import AIInsight from './components/results/AIInsight';

// Import Tracker Components
import DayTracker from './components/tracker/DayTracker';

// Import Meals Components
import MealLogger from './components/meals/MealLogger';

// Import Chat Component
import NutritionChat from './components/chat/NutritionChat';

import { hasApiKey } from './services/gemini';

function MainAppContent() {
  const { 
    profile, 
    setProfile,
    currentStep, 
    setCurrentStep, 
    activeTab, 
    setActiveTab, 
    apiKey, 
    saveApiKey,
    isAiThinking,
    clearAllData 
  } = useUser();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingKey, setEditingKey] = useState(apiKey);
  
  const [tempProfile, setTempProfile] = useState({
    goal: 'lose_weight_slow',
    goalLabel: 'Steady Burn',
    age: '',
    gender: 'male',
    height: '',
    weight: '',
    activity: 'sedentary',
    targetWeight: '',
    timeframe: '',
    diet: 'standard'
  });

  const handleNextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handleBackStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleEditProfile = () => {
    // Populate tempProfile with existing details
    if (profile) {
      setTempProfile({
        goal: profile.goal,
        goalLabel: profile.goalLabel,
        age: profile.age,
        gender: profile.gender,
        height: profile.height,
        weight: profile.weight,
        activity: profile.activity,
        targetWeight: profile.targetWeight,
        timeframe: profile.timeframe,
        diet: profile.diet
      });
    }
    setProfile(null);
    setCurrentStep(1); // Skip welcome screen on edit profile
    setSettingsOpen(false);
  };

  const handleSaveApiKeySetting = (e) => {
    e.preventDefault();
    saveApiKey(editingKey);
    alert('API Key updated successfully.');
  };

  // 1. If no profile exists, render the onboarding flow
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col justify-between py-6">
        {/* Wizard Header */}
        <header className="max-w-4xl mx-auto w-full px-4 flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🍽️</span>
            <span className="font-black text-white text-lg tracking-tight">MealMind <span className="text-emerald-400">AI</span></span>
          </div>
          
          {currentStep > 0 && currentStep < 4 && (
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-mono">
              <span>Step</span>
              <span className="text-slate-300 font-bold">{currentStep}</span>
              <span>of</span>
              <span>3</span>
            </div>
          )}
        </header>

        {/* Wizard Body */}
        <main className="flex-1 flex items-center justify-center">
          {currentStep <= 1 && (
            <StepGoal 
              currentStep={currentStep}
              onNext={handleNextStep}
              tempProfile={tempProfile}
              setTempProfile={setTempProfile}
            />
          )}
          {currentStep === 2 && (
            <StepDetails 
              onNext={handleNextStep}
              onBack={handleBackStep}
              tempProfile={tempProfile}
              setTempProfile={setTempProfile}
            />
          )}
          {currentStep === 3 && (
            <StepTarget 
              onNext={handleNextStep}
              onBack={handleBackStep}
              tempProfile={tempProfile}
              setTempProfile={setTempProfile}
            />
          )}
          {currentStep === 4 && (
            <StepLoading tempProfile={tempProfile} />
          )}
        </main>

        {/* Wizard Footer */}
        <footer className="max-w-4xl mx-auto w-full px-4 text-center mt-6">
          <p className="text-[10px] text-slate-600 font-light">
            MealMind AI uses advanced formulations and Gemini models to design guidelines. Consult a medical professional before starting any calorie plan.
          </p>
        </footer>
      </div>
    );
  }

  const hasKey = hasApiKey();

  // 2. Render Main Workspace Tabs after Onboarding completes
  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col pb-24 text-slate-100 relative">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none z-0"></div>

      {/* Header Panel */}
      <header className="sticky top-0 bg-[#0b0f19]/80 backdrop-blur-md border-b border-slate-850 p-4 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🍽️</span>
            <span className="font-black text-white text-lg tracking-tight">MealMind <span className="text-emerald-400">AI</span></span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Thinking Status Indicator */}
            {isAiThinking && (
              <span className="flex items-center space-x-1.5 text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 animate-pulse-slow">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                <span>AI Thinking...</span>
              </span>
            )}

            {/* API key missing warning pill */}
            {!hasKey && (
              <span className="hidden md:inline-block text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                API Key Missing
              </span>
            )}

            {/* Gear Button */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 hover:bg-slate-850 border border-transparent hover:border-slate-800 rounded-xl transition-all text-slate-400 hover:text-slate-100 cursor-pointer"
              title="Open Workspace Settings"
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace container */}
      <main className="max-w-4xl mx-auto w-full p-4 flex-1 z-10">
        {activeTab === 'plan' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-white">Your Nutrition Plan</h2>
                <p className="text-slate-400 text-xs mt-0.5">Calculated macro splits and weight milestones.</p>
              </div>
            </div>
            
            <PlanSummary profile={profile} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MacroChart profile={profile} />
              <MilestoneTimeline profile={profile} />
            </div>
            <AIInsight />
          </div>
        )}

        {activeTab === 'tracker' && <DayTracker />}

        {activeTab === 'meals' && <MealLogger />}

        {activeTab === 'coach' && <NutritionChat />}
      </main>

      {/* Bottom Sticky Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0d1322]/90 backdrop-blur-md border-t border-slate-850 pt-3.5 pb-6 sm:pb-3.5 px-3.5 z-40">
        <div className="max-w-md mx-auto flex items-center justify-around gap-2">
          {/* Tab 1 - Plan */}
          <button
            onClick={() => setActiveTab('plan')}
            className={`flex-1 py-1 px-2.5 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'plan'
                ? 'text-emerald-400 font-extrabold bg-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-xl">📊</span>
            <span className="text-[9px] mt-1 font-bold uppercase tracking-wider">Plan</span>
          </button>

          {/* Tab 2 - Tracker */}
          <button
            onClick={() => setActiveTab('tracker')}
            className={`flex-1 py-1 px-2.5 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'tracker'
                ? 'text-emerald-400 font-extrabold bg-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-xl">📅</span>
            <span className="text-[9px] mt-1 font-bold uppercase tracking-wider">Tracker</span>
          </button>

          {/* Tab 3 - Meals */}
          <button
            onClick={() => setActiveTab('meals')}
            className={`flex-1 py-1 px-2.5 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'meals'
                ? 'text-emerald-400 font-extrabold bg-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-xl">🍽️</span>
            <span className="text-[9px] mt-1 font-bold uppercase tracking-wider">Log Meals</span>
          </button>

          {/* Tab 4 - Coach */}
          <button
            onClick={() => setActiveTab('coach')}
            className={`flex-1 py-1 px-2.5 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'coach'
                ? 'text-emerald-400 font-extrabold bg-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-xl">💬</span>
            <span className="text-[9px] mt-1 font-bold uppercase tracking-wider">AI Coach</span>
          </button>
        </div>
      </nav>

      {/* Settings Modal Sheet */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-slate-850 flex justify-between items-center bg-slate-950/30">
              <h3 className="text-md font-black text-white">Workspace Settings</h3>
              <button
                onClick={() => setSettingsOpen(false)}
                className="text-slate-500 hover:text-slate-300 p-2 hover:bg-slate-850 rounded-xl transition-all"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-6">
              {/* Profile Overview */}
              <div className="space-y-2">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Active Profile</span>
                <div className="bg-slate-950/30 border border-slate-850 rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <h4 className="font-extrabold text-slate-200 text-sm">{profile.goalLabel}</h4>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {profile.gender === 'male' ? 'Male' : 'Female'} • {profile.age} yrs • {profile.weight}kg • {profile.diet}
                    </p>
                  </div>
                  <button
                    onClick={handleEditProfile}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-lg text-[10px] border border-slate-700 transition-all cursor-pointer"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>

              {/* Gemini Configuration */}
              <div className="space-y-3">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Gemini API Configuration</span>
                
                <form onSubmit={handleSaveApiKeySetting} className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1.5">Google Gemini API Key</label>
                    <input
                      type="password"
                      placeholder="Enter your VITE_GEMINI_API_KEY..."
                      value={editingKey}
                      onChange={(e) => setEditingKey(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-3 px-3.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 transition-all font-mono"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-bold ${hasKey ? 'text-emerald-400' : 'text-amber-500'}`}>
                      {hasKey ? '✓ Active API Configuration' : '⚠️ Key Missing'}
                    </span>
                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-lg text-[10px] shadow-sm transition-all"
                    >
                      Save Key
                    </button>
                  </div>
                </form>
              </div>

              {/* Clear Workspace Data */}
              <div className="pt-4 border-t border-slate-850/60 space-y-2">
                <span className="text-rose-500 text-[10px] uppercase font-bold tracking-widest block">Danger Zone</span>
                <p className="text-slate-500 text-[10px] leading-relaxed">
                  Permanently deletes your profile, logging history, streak count, cache, and cached conversation threads. This action is irreversible.
                </p>
                <button
                  onClick={() => {
                    if (confirm("Are you absolutely sure you want to clear all data and reset?")) {
                      clearAllData();
                      setSettingsOpen(false);
                    }
                  }}
                  className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Wipe All Storage Data
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-850 bg-slate-950/30 flex justify-end">
              <button
                onClick={() => setSettingsOpen(false)}
                className="px-4 py-2 border border-slate-850 hover:bg-slate-850 text-slate-300 font-bold rounded-xl text-xs transition-all"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <UserProvider>
      <MainAppContent />
    </UserProvider>
  );
}
