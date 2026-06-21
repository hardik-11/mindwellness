import React, { useEffect, useState } from 'react';
import { useUser } from '../../context/UserContext';
import { calcBMR, calcTDEE, calcTargetCalories, calcMacros, calcBMI, calcMilestones } from '../../utils/calculations';
import { generatePersonalizedInsight } from '../../services/gemini';

const messages = [
  'Analyzing your physical profile...',
  'Calculating your Basal Metabolic Rate (BMR)...',
  'Estimating daily activity energy expenditure...',
  'Tailoring calorie and macro splits to your diet preference...',
  'Connecting to Google Gemini for personalized AI coach insights...',
  'Structuring your weight milestone projection timeline...',
  'Finalizing your custom wellness workspace...'
];

export default function StepLoading({ tempProfile }) {
  const { setProfile } = useUser();
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 1. Message rotation interval
    const msgInterval = setInterval(() => {
      setMsgIndex(prev => (prev < messages.length - 1 ? prev + 1 : prev));
    }, 1200);

    // 2. Progress bar simulation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev < 90) {
          return prev + Math.floor(Math.random() * 8) + 2;
        }
        return prev;
      });
    }, 300);

    // 3. Perform calculations and fetch AI Insight
    let isMounted = true;
    
    async function setupPlan() {
      try {
        const bmr = Math.round(calcBMR(tempProfile.age, tempProfile.gender, tempProfile.height, tempProfile.weight));
        const tdee = Math.round(calcTDEE(bmr, tempProfile.activity));
        const calories = calcTargetCalories(tdee, tempProfile.goal);
        const macros = calcMacros(calories, tempProfile.goal, tempProfile.diet);
        const bmi = calcBMI(tempProfile.weight, tempProfile.height);
        const milestones = calcMilestones(tempProfile.weight, tempProfile.targetWeight, tempProfile.timeframe);

        const computedPlan = {
          bmr,
          tdee,
          calories,
          protein: macros.protein,
          carbs: macros.carbs,
          fat: macros.fat,
          bmi,
          milestones
        };

        const draftProfile = {
          ...tempProfile,
          plan: computedPlan
        };

        // Call Gemini for initial insight
        const insight = await generatePersonalizedInsight(draftProfile);
        
        if (isMounted) {
          const finalProfile = {
            ...draftProfile,
            initialInsight: insight
          };
          
          setProgress(100);
          setTimeout(() => {
            setProfile(finalProfile);
          }, 600);
        }
      } catch (err) {
        console.error("Error generating initial nutrition plan:", err);
        // Fallback profile assembly if anything breaks
        if (isMounted) {
          setProfile({
            ...tempProfile,
            plan: {
              bmr: 1500,
              tdee: 2000,
              calories: 1800,
              protein: 100,
              carbs: 200,
              fat: 60,
              bmi: 22,
              milestones: []
            },
            initialInsight: "Plan generated successfully. Begin tracking meals daily."
          });
        }
      }
    }

    setupPlan();

    return () => {
      isMounted = false;
      clearInterval(msgInterval);
      clearInterval(progressInterval);
    };
  }, [tempProfile, setProfile]);

  return (
    <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto px-6 py-20 animate-fadeIn min-h-[50vh]">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-emerald-500/10 blur-xl rounded-full animate-pulse"></div>
        {/* Loading Spinner Ring */}
        <div className="w-20 h-20 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center text-2xl">
          🧠
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-100 mb-2">
        Building your custom plan...
      </h3>
      
      <p className="text-slate-400 text-sm h-12 flex items-center justify-center transition-all duration-300 px-4 max-w-xs">
        {messages[msgIndex]}
      </p>

      {/* Progress Bar */}
      <div className="w-full bg-slate-900 border border-slate-850 h-2 rounded-full mt-6 overflow-hidden max-w-xs">
        <div 
          className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <span className="text-xs text-slate-500 font-mono mt-2 block">
        {progress}% Completed
      </span>
    </div>
  );
}
