import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/rankings": "https://saitama-workout.vercel.app",
    },
  },
  base: process.env.VERCEL === "1" ? "/" : "/saitama_workout/",
  build: { rollupOptions: { output: { manualChunks: { three: ["three"] } } } },
});
