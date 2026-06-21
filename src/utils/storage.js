export const KEYS = {
  PROFILE: 'nutri_profile',
  LOGS: 'nutri_logs',
  MEALPLAN: 'nutri_mealplan',
  CHAT: 'nutri_chat_history',
  API_KEY: 'nutri_gemini_key',
  DISMISS_RECOVERY: 'nutri_dismiss_recovery_date'
};

export function getStorageItem(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch (e) {
    console.error(`Error reading key ${key} from localStorage`, e);
    return fallback;
  }
}

export function setStorageItem(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(`Error writing key ${key} to localStorage`, e);
  }
}

export function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`Error removing key ${key} from localStorage`, e);
  }
}

export function clearAllData() {
  try {
    Object.values(KEYS).forEach(k => {
      localStorage.removeItem(k);
    });
    sessionStorage.clear();
  } catch (e) {
    console.error('Error clearing all local storage data', e);
  }
}
