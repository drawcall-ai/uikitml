import { defineConfig } from "vite";

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1600,
  },
  server: {
    host: "0.0.0.0",
    port: 5176,
  },
});
