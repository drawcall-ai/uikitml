import { copyFile, readFile, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const require = createRequire(import.meta.url);
const requireFromUIKit = createRequire(require.resolve("@pmndrs/uikit/package.json"));
const msdfWasmSource = requireFromUIKit.resolve(
  "@zappar/msdf-generator/msdfgen_wasm.wasm",
);
const requireFromMSDFGenerator = createRequire(msdfWasmSource);
const comlinkSource = requireFromMSDFGenerator.resolve(
  "comlink/dist/esm/comlink.min.mjs",
);
const renderAssetsDirectory = fileURLToPath(
  new URL("./dist/render-page/assets/", import.meta.url),
);

export default defineConfig({
  root: "src/render-page",
  base: "./",
  plugins: [prepareMSDFRuntime()],
  build: {
    outDir: "../../dist/render-page",
    emptyOutDir: true,
    chunkSizeWarningLimit: 6000,
    rollupOptions: {
      input: "index.html",
    },
  },
});

function prepareMSDFRuntime(): Plugin {
  return {
    name: "prepare-msdf-runtime",
    apply: "build",
    async closeBundle() {
      await Promise.all([
        copyFile(
          msdfWasmSource,
          path.join(renderAssetsDirectory, "msdfgen_wasm.wasm"),
        ),
        copyFile(comlinkSource, path.join(renderAssetsDirectory, "comlink.js")),
      ]);

      // The generator publishes its worker as a URL asset, so Vite copies its
      // bare Comlink import without bundling it for the browser.
      const workerName = (await readdir(renderAssetsDirectory)).find((name) =>
        /^worker-.*\.js$/.test(name),
      );
      if (workerName == null) {
        throw new Error("MSDF worker was not emitted.");
      }
      const workerPath = path.join(renderAssetsDirectory, workerName);
      const worker = await readFile(workerPath, "utf8");
      const resolvedWorker = worker.replace(
        /from\s+["']comlink["']/,
        'from "./comlink.js"',
      );
      if (resolvedWorker === worker) {
        throw new Error("MSDF worker did not import Comlink.");
      }
      await writeFile(workerPath, resolvedWorker);
    },
  };
}
