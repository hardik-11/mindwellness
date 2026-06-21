/**
 * Mifflin-St Jeor Equation for Basal Metabolic Rate (BMR)
 */
export function calcBMR(age, gender, height, weight) {
  const ageVal = parseFloat(age) || 0;
  const heightVal = parseFloat(height) || 0;
  const weightVal = parseFloat(weight) || 0;

  if (gender === 'male') {
    return 10 * weightVal + 6.25 * heightVal - 5 * ageVal + 5;
  } else {
    return 10 * weightVal + 6.25 * heightVal - 5 * ageVal - 161;
  }
}

/**
 * Total Daily Energy Expenditure (TDEE) based on activity level multiplier
 */
export function calcTDEE(bmr, activityLevel) {
  const multipliers = {
    sedentary: 1.2,          // Little or no exercise
    lightly_active: 1.375,   // Light exercise 1-3 days/week
    moderately_active: 1.55,  // Moderate exercise 3-5 days/week
    very_active: 1.725,      // Hard exercise 6-7 days/week
    extra_active: 1.9        // Very hard exercise/physical job
  };
  const multiplier = multipliers[activityLevel] || 1.2;
  return bmr * multiplier;
}

/**
 * Target calories based on weight goal
 */
export function calcTargetCalories(tdee, goal) {
  let target = tdee;
  if (goal === 'lose_weight_slow') {
    target = tdee - 350;
  } else if (goal === 'lose_weight_fast') {
    target = tdee - 750;
  } else if (goal === 'gain_muscle') {
    target = tdee + 350;
  } else if (goal === 'maintain') {
    target = tdee;
  } else if (goal === 'get_fit') {
    target = tdee - 200; // slight deficit / body recomposition
  }
  
  // Safe floor for calories
  return Math.max(1200, Math.round(target));
}

/**
 * Calculate Macros in grams based on calorie target, goal, and diet type
 */
export function calcMacros(targetCalories, goal, diet) {
  // Base ratios (Carbs / Protein / Fat) in terms of percentage of total calories
  let carbPct = 0.50;
  let proteinPct = 0.20;
  let fatPct = 0.30;

  // Adjust for diet type
  if (diet === 'low-carb') {
    carbPct = 0.15;
    proteinPct = 0.35;
    fatPct = 0.50;
  } else if (diet === 'keto') {
    carbPct = 0.05;
    proteinPct = 0.25;
    fatPct = 0.70;
  } else if (diet === 'high-protein') {
    carbPct = 0.35;
    proteinPct = 0.35;
    fatPct = 0.30;
  }

  // Adjust ratios slightly for muscle gain if standard
  if (goal === 'gain_muscle' && diet === 'standard') {
    carbPct = 0.45;
    proteinPct = 0.30;
    fatPct = 0.25;
  }

  const carbCalories = targetCalories * carbPct;
  const proteinCalories = targetCalories * proteinPct;
  const fatCalories = targetCalories * fatPct;

  // Carbs = 4 kcal/g, Protein = 4 kcal/g, Fat = 9 kcal/g
  const carbsGrams = Math.round(carbCalories / 4);
  const proteinGrams = Math.round(proteinCalories / 4);
  const fatGrams = Math.round(fatCalories / 9);

  return {
    carbs: carbsGrams,
    protein: proteinGrams,
    fat: fatGrams
  };
}

/**
 * Body Mass Index (BMI)
 */
export function calcBMI(weight, height) {
  const weightVal = parseFloat(weight) || 0;
  const heightM = (parseFloat(height) || 0) / 100;
  if (heightM <= 0) return 0;
  return Math.round((weightVal / (heightM * heightM)) * 10) / 10;
}

/**
 * Calculate target progress milestones
 */
export function calcMilestones(currentWeight, targetWeight, timeframeMonths) {
  const diff = targetWeight - currentWeight;
  const steps = 4;
  const milestones = [];
  
  const timeframe = timeframeMonths || 3;
  const weeksTotal = timeframe * 4.33;

  for (let i = 1; i <= steps; i++) {
    const percent = (i / steps);
    const weightAtMilestone = currentWeight + (diff * percent);
    const weekAtMilestone = Math.round(weeksTotal * percent * 10) / 10;
    
    milestones.push({
      label: `Milestone ${i} (${Math.round(percent * 100)}%)`,
      weight: Math.round(weightAtMilestone * 10) / 10,
      week: weekAtMilestone,
      status: 'pending'
    });
  }

  return milestones;
}
