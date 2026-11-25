// @vitest-environment node
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { TTFLoader } from "@pmndrs/uikit";
import ts from "typescript";
import { afterEach, expect, test, vi } from "vitest";
import { compress } from "woff2-encoder";
import { renderReactUseFontHelper, renderThreeLoadFontHelper } from "../src/convert-font-helpers.js";
import { preloadTTFFontFaces } from "../src/fonts.js";

const require = createRequire(import.meta.url);
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

test("runtime and converted loaders decompress real WOFF2 and release temporary URLs", async () => {
  const ttf = await readFile(require.resolve("three/examples/fonts/ttf/kenpixel.ttf"));
  const woff2 = await compress(ttf);
  const fetch = globalThis.fetch;
  vi.stubGlobal("fetch", vi.fn((input: string) => input.endsWith(".woff2")
    ? Promise.resolve(new Response(new Uint8Array(woff2))) : fetch(input)));
  const revoke = vi.spyOn(URL, "revokeObjectURL");
  // MSDF generation needs a browser Worker. Check the real decompressed input at its boundary.
  const fonts: Awaited<ReturnType<TTFLoader["loadAsync"]>> = { QA: { "400": "font.fixture" } };
  const load = vi.spyOn(TTFLoader.prototype, "loadAsync").mockImplementation(async (input) => {
    const bytes = new Uint8Array(await (await fetch(input as string)).arrayBuffer());
    expect([...bytes.subarray(0, 4)]).toEqual([...ttf.subarray(0, 4)]);
    expect(bytes.length).toBeGreaterThan(1000);
    return fonts;
  });
  await preloadTTFFontFaces([{ fontFamily: "QA", fontWeight: "400", src: "https://font.test/runtime.woff2" }]);
  const three = helper(renderThreeLoadFontHelper(), "loadFont");
  await expect(three(new TTFLoader(), "https://font.test/three.woff2")).resolves.toBe(fonts);
  const react = helper(renderReactUseFontHelper(), "useFont");
  let pending: unknown;
  try { react("https://font.test/react.woff2"); } catch (error) { pending = error; }
  expect(pending).toBeInstanceOf(Promise);
  await pending;
  expect(react("https://font.test/react.woff2")).toBe(fonts);
  expect(react("https://font.test/react.woff2")).toBe(fonts);
  expect(load).toHaveBeenCalledTimes(3);
  expect(revoke).toHaveBeenCalledTimes(3);
  const failure = new Error("MSDF failed");
  load.mockRejectedValueOnce(failure);
  await expect(three(new TTFLoader(), "https://font.test/bad.woff2")).rejects.toBe(failure);
  expect(revoke).toHaveBeenCalledTimes(4);
});

function helper(lines: string[], name: string) {
  const { outputText } = ts.transpileModule(lines.join("\n"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  const code = outputText.replace('import("woff2-encoder/decompress")', "loadWoff2()");
  return new Function("TTFLoader", "loadWoff2", `${code}\nreturn ${name};`)(
    TTFLoader, () => import("woff2-encoder/decompress"),
  );
}
