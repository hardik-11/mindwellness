# MindEase — Mental Wellness Tracker for Exam Warriors 🌿

MindEase is a production-ready, Generative AI-powered mental wellness companion
specifically designed for Indian students preparing for high-stakes, high-pressure
competitive exams (such as NEET, JEE, CUET, CAT, GATE, UPSC, or Board Exams).

The application is built on top of React 18, utilizing the Google Gemini API
(Gemini 2.5 Flash) via a secured Vite proxy layer to preserve keys, using purely
custom CSS-in-JS style configurations.

---

## 🎯 Key Features

1. **Daily Check-In & Mood Log**: Students log their mood (via 5 interactive emojis),
   daily energy level, and write open-ended journal entries.
2. **AI Stress Insights**: Analyzes journal logs to extract primary stress triggers,
   deliver personalized coping cards, and calculate an emotional urgency score.
3. **Multi-Turn Companion Chat**: A support chat bot initialized with the student's
   onboarding profile and journal context, providing tailored motivation.
4. **Adaptive Mindfulness Exercises**: Dynamically constructs 3 personalized relaxation
   and stress-reduction exercises based on current check-in indicators.
5. **Timeline Trend Analysis**: Provides visual mood trend charts (pure CSS) and compiles
   stress vectors, unrecognized behavior patterns, and action plans.

---

## 🧱 Tech Stack

- **Framework**: React 18 (Vite SPA)
- **Styling**: Pure CSS-in-JS (Vanilla styles, Zero external dependencies)
- **AI Model**: Google Gemini 2.5 Flash via `/api/generate` proxy
- **Accessibility**: ARIA labels, semantic structure, arrow key tab navigation

---

## 🛠️ Local Setup & Configuration

### 1. Configure the API Key
Create a `.env.local` file in the root folder and add your Gemini API key:
```env
GEMINI_API_KEY="your-api-key-here"
```

### 2. Install Dependencies
Run the installation command in your terminal:
```bash
npm install
```

### 3. Start Development Server
Boot up Vite's local dev proxy server:
```bash
npm run dev
```
Open **http://localhost:5173/** (or the port specified by Vite) in your browser.

---

## 🚀 GitHub Pages Deployment

To host this application directly on GitHub Pages, use the relative pathways:

1. Install `gh-pages` helper tool:
   ```bash
   npm install --save-dev gh-pages
   ```
2. Update the scripts inside `package.json`:
   ```json
   "predeploy": "npm run build",
   "deploy": "gh-pages -d dist"
   ```
3. Deploy to live hosting:
   ```bash
   npm run deploy
   ```
   The application will become live at `https://<your-username>.github.io/<your-repo-name>/`.