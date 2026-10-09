import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/daily-planner/",
  build: { sourcemap: false },
  plugins: [react()],
});

