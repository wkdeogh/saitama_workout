import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: "/saitama_workout/",
  build: { rollupOptions: { output: { manualChunks: { three: ["three"] } } } },
});
