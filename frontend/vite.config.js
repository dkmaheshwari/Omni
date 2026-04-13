// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const rawApiUrl = env.VITE_API_URL || "http://localhost:5051/api";
  const apiTarget = rawApiUrl.replace(/\/api\/?$/, "");

  return {
    plugins: [react()],
    server: {
      proxy: {
        // proxy all /api calls to your backend
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
