import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Тести — лише на чисту математику (`src/lib/**`), без Prisma й без DOM:
// саме там живуть формули, помилку в яких на око не видно.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
