import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/cli-custom-fonts.test.ts"],
  },
});
