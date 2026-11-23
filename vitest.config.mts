import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // Services et données tournent en node ; les tests de présentation
    // passent en jsdom par fichier (// @vitest-environment jsdom).
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
  },
});
