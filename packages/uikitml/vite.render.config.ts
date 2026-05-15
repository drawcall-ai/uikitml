import { defineConfig } from "vite";

export default defineConfig({
  root: "src/render-page",
  base: "./",
  build: {
    outDir: "../../dist/render-page",
    emptyOutDir: true,
    chunkSizeWarningLimit: 6000,
    rollupOptions: {
      input: "index.html",
    },
  },
});
