import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStorageItem, setStorageItem, KEYS, clearAllData } from '../utils/storage';
import { registerActiveStateListener } from '../services/gemini';
import { differenceInDays, parseISO, format, subDays } from 'date-fns';

const UserContext = createContext();

export function UserProvider({ children }) {
  // Navigation & Wizard State
  const [activeTab, setActiveTab] = useState('plan'); // plan, tracker, meals, coach
  const [currentStep, setCurrentStep] = useState(0); // 0: welcome, 1: goal, 2: details, 3: targets, 4: loading

  // Profile State
  const [profile, setProfile] = useState(() => getStorageItem(KEYS.PROFILE, null));

  // Logs State (keyed by date string 'yyyy-MM-dd')
  const [logs, setLogs] = useState(() => getStorageItem(KEYS.LOGS, {}));

  // AI Meal Plan suggestions state
  const [mealPlan, setMealPlan] = useState(() => getStorageItem(KEYS.MEALPLAN, null));

  // Chat Coach History
  const [chatHistory, setChatHistory] = useState(() => getStorageItem(KEYS.CHAT, []));

  // Settings
  const [apiKey, setApiKey] = useState(() => {
    try {
      const stored = localStorage.getItem(KEYS.API_KEY);
      return stored ? JSON.parse(stored) : '';
    } catch {
      return '';
    }
  });

  // AI Active state from service
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiCooldown, setAiCooldown] = useState(false);

  // Sync state with storage
  useEffect(() => {
    if (profile) {
      setStorageItem(KEYS.PROFILE, profile);
    }
  }, [profile]);

  useEffect(() => {
    setStorageItem(KEYS.LOGS, logs);
  }, [logs]);

  useEffect(() => {
    if (mealPlan) {
      setStorageItem(KEYS.MEALPLAN, mealPlan);
    }
  }, [mealPlan]);

  useEffect(() => {
    setStorageItem(KEYS.CHAT, chatHistory);
  }, [chatHistory]);

  useEffect(() => {
    registerActiveStateListener((active) => {
      setIsAiThinking(active);
    });
  }, []);

  // Update localStorage for API key when updated
  const saveApiKey = (key) => {
    setApiKey(key);
    try {
      localStorage.setItem(KEYS.API_KEY, JSON.stringify(key));
    } catch (e) {
      console.error(e);
    }
  };

  // Cooldown logic for buttons
  const triggerAiCooldown = () => {
    setAiCooldown(true);
    setTimeout(() => {
      setAiCooldown(false);
    }, 3000);
  };

  // Log meals helper
  const logFoodItem = (dateStr, mealType, foodItem) => {
    setLogs((prev) => {
      const dayLog = prev[dateStr] || {
        date: dateStr,
        meals: { Breakfast: [], Lunch: [], Dinner: [], Snack: [] },
        totalCal: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        analysis: ''
      };

      const meals = { ...dayLog.meals };
      meals[mealType] = [...(meals[mealType] || []), {
        id: Date.now() + Math.random().toString(36).substring(2, 5),
        name: foodItem.name,
        calories: Math.round(foodItem.calories || 0),
        protein: Math.round(foodItem.protein || 0),
        carbs: Math.round(foodItem.carbs || 0),
        fat: Math.round(foodItem.fat || 0)
      }];

      // Recalculate totals
      let totalCal = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;

      Object.values(meals).forEach(mealList => {
        mealList.forEach(item => {
          totalCal += item.calories;
          totalProtein += item.protein;
          totalCarbs += item.carbs;
          totalFat += item.fat;
        });
      });

      return {
        ...prev,
        [dateStr]: {
          ...dayLog,
          meals,
          totalCal,
          totalProtein,
          totalCarbs,
          totalFat
        }
      };
    });
  };

  // Remove meal item helper
  const removeFoodItem = (dateStr, mealType, itemId) => {
    setLogs((prev) => {
      const dayLog = prev[dateStr];
      if (!dayLog) return prev;

      const meals = { ...dayLog.meals };
      meals[mealType] = (meals[mealType] || []).filter(item => item.id !== itemId);

      // Recalculate totals
      let totalCal = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;

      Object.values(meals).forEach(mealList => {
        mealList.forEach(item => {
          totalCal += item.calories;
          totalProtein += item.protein;
          totalCarbs += item.carbs;
          totalFat += item.fat;
        });
      });

      return {
        ...prev,
        [dateStr]: {
          ...dayLog,
          meals,
          totalCal,
          totalProtein,
          totalCarbs,
          totalFat
        }
      };
    });
  };

  // Set AI analysis for a specific day
  const setDayAnalysis = (dateStr, analysisText) => {
    setLogs((prev) => {
      const dayLog = prev[dateStr] || {
        date: dateStr,
        meals: { Breakfast: [], Lunch: [], Dinner: [], Snack: [] },
        totalCal: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        analysis: ''
      };
      return {
        ...prev,
        [dateStr]: {
          ...dayLog,
          analysis: analysisText
        }
      };
    });
  };

  // Compute Streak
  const computeStreak = () => {
    const logKeys = Object.keys(logs);
    if (logKeys.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStr = format(today, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');

    const hasToday = logs[todayStr] && logs[todayStr].totalCal > 0;
    const hasYesterday = logs[yesterdayStr] && logs[yesterdayStr].totalCal > 0;

    if (!hasToday && !hasYesterday) {
      return 0;
    }

    let checkDate = hasToday ? today : subDays(today, 1);

    while (true) {
      const checkStr = format(checkDate, 'yyyy-MM-dd');
      if (logs[checkStr] && logs[checkStr].totalCal > 0) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }

    return streak;
  };

  // Get missed days count
  const getMissedDays = () => {
    const logKeys = Object.keys(logs).filter(k => logs[k].totalCal > 0);
    if (logKeys.length === 0) return 0;

    // Find the latest logged day
    const dates = logKeys.map(k => parseISO(k));
    const latestLogged = new Date(Math.max(...dates));
    latestLogged.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diff = differenceInDays(today, latestLogged);
    // If they logged today or yesterday, missed days is 0. Otherwise, difference - 1.
    return diff > 1 ? diff - 1 : 0;
  };

  const handleClearAllData = () => {
    clearAllData();
    setProfile(null);
    setLogs({});
    setMealPlan(null);
    setChatHistory([]);
    setApiKey('');
    setCurrentStep(0);
    setActiveTab('plan');
  };

  return (
    <UserContext.Provider
      value={{
        activeTab,
        setActiveTab,
        currentStep,
        setCurrentStep,
        profile,
        setProfile,
        logs,
        setLogs,
        mealPlan,
        setMealPlan,
        chatHistory,
        setChatHistory,
        apiKey,
        saveApiKey,
        isAiThinking,
        aiCooldown,
        triggerAiCooldown,
        logFoodItem,
        removeFoodItem,
        setDayAnalysis,
        streak: computeStreak(),
        missedDays: getMissedDays(),
        clearAllData: handleClearAllData
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
