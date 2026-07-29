import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, test } from "vitest";

const run = promisify(execFile);
const require = createRequire(import.meta.url);
const packageDirectory = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const repositoryDirectory = path.resolve(packageDirectory, "../..");
const cli = path.join(packageDirectory, "dist/cli.js");
const editorDirectory = path.join(repositoryDirectory, "examples/minimal-editor");
const example = path.join(repositoryDirectory, "examples/minimal-editor/src/default.uikitml");
const vite = path.join(path.dirname(require.resolve("vite/package.json")), "bin/vite.js");

test("starts the editor example", async () => {
  const port = await getAvailablePort();
  const server = spawn(
    process.execPath,
    [vite, "--host", "127.0.0.1", "--port", String(port), "--strictPort", "--force"],
    {
      cwd: editorDirectory,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  server.stdout.on("data", (chunk: Buffer) => {
    output += chunk;
  });
  server.stderr.on("data", (chunk: Buffer) => {
    output += chunk;
  });

  try {
    await waitForEditor(port, server, () => output);
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    expect(server.exitCode, output).toBeNull();
  } finally {
    if (server.exitCode == null) {
      server.kill();
      await once(server, "exit");
    }
  }
}, 30_000);

test(
  "runs the editor example through the CLI",
  async () => {
    const outputDirectory = await mkdtemp(path.join(tmpdir(), "uikitml-custom-fonts-"));
    const font = await readFile(require.resolve("three/examples/fonts/ttf/kenpixel.ttf"));
    const fontServer = createServer((request, response) => {
      if (!request.url?.endsWith(".ttf")) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "font/ttf",
      });
      response.end(font);
    });
    fontServer.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => fontServer.once("listening", resolve));

    try {
      const address = fontServer.address();
      if (address == null || typeof address === "string") {
        throw new Error("Test font server did not bind to a TCP port.");
      }
      const fontBaseUrl = `http://127.0.0.1:${address.port}`;
      const source = await readFile(example, "utf8");
      const localExample = path.join(outputDirectory, "default.uikitml");
      await writeFile(
        localExample,
        source.replaceAll(
          /https:\/\/raw\.githubusercontent\.com\/google\/fonts\/main\/[^"')]+\.ttf/g,
          (url) => `${fontBaseUrl}/${path.basename(new URL(url).pathname)}`,
        ),
      );

      const reactOutput = path.join(outputDirectory, "CustomFontsExample.tsx");
      const threeOutput = path.join(outputDirectory, "custom-fonts.ts");
      const pngOutput = path.join(outputDirectory, "custom-fonts.png");

      await runCli("validate", localExample);
      await runCli(
        "convert",
        localExample,
        "--to",
        "react",
        "--name",
        "CustomFontsExample",
        "--out",
        reactOutput,
      );
      await runCli(
        "convert",
        localExample,
        "--to",
        "three",
        "--name",
        "createCustomFonts",
        "--out",
        threeOutput,
      );
      await runCli(
        "render",
        localExample,
        "--width",
        "640",
        "--height",
        "240",
        "--out",
        pngOutput,
      );

      const react = await readFile(reactOutput, "utf8");
      expect(react).toMatch(/useTTF/);
      expect(react).toMatch(/"400": getTTFFont/);
      expect(react).toMatch(/"700": getTTFFont/);

      const three = await readFile(threeOutput, "utf8");
      expect(three).toMatch(/TTFLoader/);
      expect(three).toMatch(/"400": \(\) =>/);
      expect(three).toMatch(/"700": \(\) =>/);

      const png = await readFile(pngOutput);
      expect(png.subarray(0, 8)).toEqual(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      );
      expect(png.length).toBeGreaterThan(5_000);
    } finally {
      fontServer.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        fontServer.close((error) => (error == null ? resolve() : reject(error)));
      });
      await rm(outputDirectory, { recursive: true, force: true });
    }
  },
  180_000,
);

async function runCli(...args: string[]): Promise<void> {
  await run(process.execPath, [cli, ...args], {
    cwd: repositoryDirectory,
    timeout: 180_000,
  });
}

async function getAvailablePort(): Promise<number> {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address == null || typeof address === "string") {
    throw new Error("Test server did not bind to a TCP port.");
  }
  const { port } = address;
  server.close();
  await once(server, "close");
  return port;
}

async function waitForEditor(
  port: number,
  server: ReturnType<typeof spawn>,
  getOutput: () => string,
): Promise<void> {
  const deadline = Date.now() + 10_000;
  const url = `http://127.0.0.1:${port}/src/main.ts`;

  while (Date.now() < deadline) {
    if (server.exitCode != null) {
      throw new Error(`Editor dev server exited with code ${server.exitCode}.\n${getOutput()}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // The server has not started listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(`Editor dev server did not start.\n${getOutput()}`);
}
