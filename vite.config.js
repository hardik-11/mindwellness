import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: "./",
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api/generate": {
          target: "https://generativelanguage.googleapis.com",
          changeOrigin: true,
          secure: true,
          rewrite: () => {
            const key = env.GEMINI_API_KEY || "";
            return `/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
          },
        },
      },
    },
  };
});
