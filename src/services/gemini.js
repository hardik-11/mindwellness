import { GoogleGenerativeAI } from "@google/generative-ai";

// In-memory throttling tracker
let lastCallTime = 0;
const THROTTLE_MS = 3000;

function checkThrottle() {
  const now = Date.now();
  const diff = now - lastCallTime;
  if (diff < THROTTLE_MS) {
    const wait = Math.ceil((THROTTLE_MS - diff) / 1000);
    throw new Error(`Throttled. Please wait ${wait}s before making another AI request.`);
  }
  lastCallTime = now;
}

function getApiKey() {
  // 1. Read from VITE_GEMINI_API_KEY
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey !== 'your_gemini_api_key_here' && envKey.trim() !== '') {
    return envKey;
  }
  
  // 2. Read from localStorage fallback
  try {
    const localVal = localStorage.getItem('nutri_gemini_key');
    if (localVal) {
      const parsed = JSON.parse(localVal);
      if (parsed && parsed.trim() !== '') {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to read key from localStorage", e);
  }
  return null;
}

export function hasApiKey() {
  const key = getApiKey();
  return !!key;
}

function getModel() {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Add your VITE_GEMINI_API_KEY in .env or via the Settings panel.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

function buildUserContext(profile) {
  if (!profile || !profile.plan) {
    return "User Profile: Not yet fully configured.";
  }
  return `
    User Profile:
    - Goal: ${profile.goal} (${profile.goalLabel || 'Custom'})
    - Age: ${profile.age}, Gender: ${profile.gender}
    - Height: ${profile.height}cm, Current weight: ${profile.weight}kg
    - Target weight: ${profile.targetWeight}kg in ${profile.timeframe} months
    - Activity level: ${profile.activity}
    - Diet type: ${profile.diet}
    - Daily calorie target: ${profile.plan.calories} kcal
    - Macros: Protein ${profile.plan.protein}g, Carbs ${profile.plan.carbs}g, Fat ${profile.plan.fat}g
  `;
}

// Global hook to track if AI is active
let activeRequestsCount = 0;
let onActiveStateChange = null;

export function registerActiveStateListener(listener) {
  onActiveStateChange = listener;
}

function incrementRequests() {
  activeRequestsCount++;
  if (onActiveStateChange) onActiveStateChange(activeRequestsCount > 0);
}

function decrementRequests() {
  activeRequestsCount = Math.max(0, activeRequestsCount - 1);
  if (onActiveStateChange) onActiveStateChange(activeRequestsCount > 0);
}

/**
 * Standardized callGemini wrapper with fallback support and throttling check
 */
async function callGemini(promptFn, fallback) {
  incrementRequests();
  try {
    checkThrottle();
    const result = await promptFn();
    const text = result.response.text();
    decrementRequests();
    return text;
  } catch (err) {
    console.error("Gemini error:", err);
    decrementRequests();
    // Return fallback (make sure we support either functions returning standard structures or raw text strings)
    return typeof fallback === 'function' ? fallback() : fallback;
  }
}

/**
 * Safe JSON parsing helper
 */
export function safeParseJSON(text, fallback = []) {
  if (!text) return fallback;
  try {
    // Strip markdown formatting if any
    const clean = text.replace(/```json|```/gi, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error("Error parsing Gemini JSON output:", text, e);
    return fallback;
  }
}

/**
 * 1. generatePersonalizedInsight(profile)
 */
export async function generatePersonalizedInsight(profile) {
  const fallbackText = `To achieve your goal of ${profile.goalLabel || profile.goal}, focus on maintaining your daily target of ${profile.plan?.calories || 2000} kcal. Prioritize ${profile.diet || 'balanced'} food sources that match your macro goals, especially protein. Remember, hydration and consistent sleep are key foundations for sustainable fat loss and muscle recovery.`;
  
  if (!hasApiKey()) return fallbackText;

  return callGemini(async () => {
    const model = getModel();
    const prompt = `${buildUserContext(profile)}
    
    Give a 3-sentence personalized insight for this person's nutrition plan.
    Be specific to their goal, diet type, and numbers. Be encouraging but realistic.
    Return plain text only, no markdown.`;
    return await model.generateContent(prompt);
  }, fallbackText);
}

/**
 * 2. generateMealPlan(profile, days = 7)
 */
export async function generateMealPlan(profile, days = 7) {
  const calories = profile.plan?.calories || 2000;
  const p = profile.plan?.protein || 120;
  const c = profile.plan?.carbs || 200;
  const f = profile.plan?.fat || 65;
  const diet = profile.diet || 'standard';

  const makeFallbackMealPlan = () => {
    const result = [];
    for (let day = 1; day <= days; day++) {
      result.push({
        day,
        totalCalories: calories,
        meals: [
          {
            type: "Breakfast",
            name: `${diet === 'low-carb' || diet === 'keto' ? 'Scrambled Eggs with Avocado' : 'Fruit and Yogurt Oatmeal Bowl'}`,
            calories: Math.round(calories * 0.25),
            protein: Math.round(p * 0.25),
            carbs: Math.round(c * 0.25),
            fat: Math.round(f * 0.25),
            ingredients: ["Eggs", "Avocado", "Spinach", "Salt & Pepper"]
          },
          {
            type: "Lunch",
            name: `${diet === 'keto' || diet === 'low-carb' ? 'Grilled Chicken Breast Salad' : 'Brown Rice and Chicken Bowl'}`,
            calories: Math.round(calories * 0.35),
            protein: Math.round(p * 0.35),
            carbs: Math.round(c * 0.35),
            fat: Math.round(f * 0.35),
            ingredients: ["Chicken Breast", "Olive oil", "Mixed greens", "Quinoa or Rice"]
          },
          {
            type: "Dinner",
            name: `Pan-Seared Salmon with ${diet === 'low-carb' || diet === 'keto' ? 'Broccoli' : 'Sweet Potatoes'}`,
            calories: Math.round(calories * 0.30),
            protein: Math.round(p * 0.30),
            carbs: Math.round(c * 0.30),
            fat: Math.round(f * 0.30),
            ingredients: ["Salmon Fillet", "Lemon Juice", "Broccoli florets", "Garlic butter"]
          },
          {
            type: "Snack",
            name: `${diet === 'keto' ? 'Handful of Mixed Nuts' : 'Protein Shake with Banana'}`,
            calories: Math.round(calories * 0.10),
            protein: Math.round(p * 0.10),
            carbs: Math.round(c * 0.10),
            fat: Math.round(f * 0.10),
            ingredients: ["Protein Powder", "Almond Milk", "Chia Seeds"]
          }
        ]
      });
    }
    return result;
  };

  if (!hasApiKey()) return makeFallbackMealPlan();

  const responseText = await callGemini(async () => {
    const model = getModel();
    const prompt = `${buildUserContext(profile)}
    
    Generate a ${days}-day meal plan that fits exactly ${calories} kcal/day.
    Diet type is ${diet} — strictly follow this.
    
    Return ONLY a valid JSON array like this (no markdown, no explanation):
    [
      {
        "day": 1,
        "meals": [
          { 
            "type": "Breakfast", 
            "name": "meal name", 
            "calories": 400, 
            "protein": 20, 
            "carbs": 45, 
            "fat": 10,
            "ingredients": ["item1", "item2"]
          }
        ],
        "totalCalories": 1800
      }
    ]`;
    return await model.generateContent(prompt);
  }, () => JSON.stringify(makeFallbackMealPlan()));

  const parsed = safeParseJSON(responseText, null);
  
  // Validate schema
  if (parsed && Array.isArray(parsed) && parsed.length > 0 && parsed[0].meals) {
    return parsed;
  }
  return makeFallbackMealPlan();
}

/**
 * 3. searchFoodCalories(query, diet)
 */
export async function searchFoodCalories(query, diet = 'standard') {
  const fallbackOptions = () => [
    { name: `${query} (Small portion)`, calories: 150, protein: 5, carbs: 20, fat: 4 },
    { name: `${query} (Medium portion)`, calories: 300, protein: 10, carbs: 40, fat: 8 },
    { name: `${query} (Large portion)`, calories: 450, protein: 15, carbs: 60, fat: 12 }
  ];

  if (!hasApiKey()) return fallbackOptions();

  const responseText = await callGemini(async () => {
    const model = getModel();
    const prompt = `For a ${diet} diet, give nutrition info for: '${query}'
    
    Return ONLY a valid JSON array (no markdown):
    [
      { 
        "name": "food name with portion", 
        "calories": 0, 
        "protein": 0, 
        "carbs": 0, 
        "fat": 0 
      }
    ]
    Give 3–5 options with different portion sizes.`;
    return await model.generateContent(prompt);
  }, () => JSON.stringify(fallbackOptions()));

  return safeParseJSON(responseText, fallbackOptions());
}

/**
 * 4. analyzeDay(profile, todayLog)
 */
export async function analyzeDay(profile, todayLog) {
  const totalCal = todayLog.totalCal || 0;
  const targetCal = profile.plan?.calories || 2000;
  const diff = totalCal - targetCal;
  
  let fallbackText = '';
  if (diff < -200) {
    fallbackText = `You stayed under your target today by ${Math.abs(diff)} calories. While this supports weight loss, make sure you're eating enough protein to prevent muscle breakdown.`;
  } else if (diff > 200) {
    fallbackText = `You went over your calorie target by ${diff} calories today. Consider reducing portion sizes or substituting your evening snack with a lower-calorie option tomorrow.`;
  } else {
    fallbackText = `Outstanding day! You hit your calorie target almost perfectly. Keep this consistency up, as it's the absolute best driver for long-term progress.`;
  }

  if (!hasApiKey()) return fallbackText;

  return callGemini(async () => {
    const model = getModel();
    const prompt = `${buildUserContext(profile)}
    
    Today's food log: ${JSON.stringify(todayLog)}
    Total consumed: ${totalCal} kcal
    
    Give a 2-sentence analysis of today's eating.
    Mention what was good and one specific suggestion to improve.
    Plain text only.`;
    return await model.generateContent(prompt);
  }, fallbackText);
}

/**
 * 5. chatWithCoach(profile, conversationHistory, newMessage)
 */
export async function chatWithCoach(profile, conversationHistory, newMessage) {
  const fallbackCoachResponse = "I'm here to help guide your fitness and nutrition journey! Let's work together to stay on track. Try focused snack options, stay hydrated, and feel free to ask me about calories or food swaps.";
  
  if (!hasApiKey()) return fallbackCoachResponse;

  return callGemini(async () => {
    const model = getModel();
    
    const systemRules = `You are a friendly, knowledgeable nutrition coach AI.
    ${buildUserContext(profile)}
    
    Rules:
    - Always give advice specific to this user's profile and goals
    - Keep responses under 4 sentences unless asked for a list
    - Be warm, motivating, and practical
    - If asked about foods, give specific calorie/macro numbers
    - Never recommend extreme diets or dangerous practices`;

    // Structure chat history into text-based format for reliability
    const historyLines = conversationHistory.map(msg => {
      const label = msg.sender === 'user' ? 'User' : 'Coach';
      return `${label}: ${msg.text}`;
    }).join('\n');

    const fullPrompt = `${systemRules}

Conversation History:
${historyLines}
User: ${newMessage}
Coach:`;

    return await model.generateContent(fullPrompt);
  }, fallbackCoachResponse);
}

/**
 * 6. generateRecoveryPlan(profile, missedDays)
 */
export async function generateRecoveryPlan(profile, missedDays) {
  const fallbackText = "1. Welcome back—no guilt! Just log your very next meal to resume your habit.\n2. Focus on drinking a large glass of water right now to rehydrate.\n3. Make your next meal protein-focused to help stabilize blood sugar levels.";

  if (!hasApiKey()) return fallbackText;

  return callGemini(async () => {
    const model = getModel();
    const prompt = `${buildUserContext(profile)}
    User missed ${missedDays} days of logging.
    
    Give a short 3-step recovery plan to get back on track.
    Be empathetic, not guilt-tripping. Plain text, numbered list.`;
    return await model.generateContent(prompt);
  }, fallbackText);
}

/**
 * 7. generateWeeklyReport(profile, weekLogs)
 */
export async function generateWeeklyReport(profile, weekLogs) {
  const fallbackText = `Overall Assessment: You logged calories consistently and made solid progress towards your goal this week.
Best Day: Wednesday, where you hit your protein goals perfectly and stayed active.
Biggest Challenge: Navigating weekend meals, which pushed you slightly over target.
Tip for Next Week: Prep portion-controlled snacks in advance to stay aligned with your plan.`;

  if (!hasApiKey()) return fallbackText;

  return callGemini(async () => {
    const model = getModel();
    const prompt = `${buildUserContext(profile)}
    
    Weekly log data: ${JSON.stringify(weekLogs)}
    
    Generate a weekly progress report. Include:
    - Overall assessment (1 sentence)
    - Best day and why
    - Biggest challenge
    - One specific tip for next week
    Plain text, use line breaks between sections.`;
    return await model.generateContent(prompt);
  }, fallbackText);
}
