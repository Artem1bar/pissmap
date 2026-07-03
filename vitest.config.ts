import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirror the tsconfig "@/*" → "./*" path alias so route handlers (which use
    // "@/lib/...") can be imported and tested directly.
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      exclude: ["lib/**/*.test.ts", "lib/types.ts"],
    },
  },
});
