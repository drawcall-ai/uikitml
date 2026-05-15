import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { promisify } from "node:util";
import { CliError } from "./cli-utils.js";
import type { KitName } from "./kits.js";
import type { PreferredColorScheme } from "./types.js";

const execFileAsync = promisify(execFile);

export type RenderToPngOptions = {
  source: string;
  kit: KitName;
  width?: number;
  height?: number;
  preferredColorScheme?: PreferredColorScheme;
  out: string;
};

export type RenderResult = {
  path: string;
  width: number;
  height: number;
};

type BrowserRenderResult =
  | { ok: true; width: number; height: number }
  | { ok: false; error: string };

export async function renderToPng(options: RenderToPngOptions): Promise<RenderResult> {
  const { chromium } = await import("playwright");
  const browser = await launchChromiumWithInstall(chromium);
  const assetServer = await serveRenderPage();

  try {
    const page = await browser.newPage({ viewport: { width: 16, height: 16 }, deviceScaleFactor: 1 });
    await page.goto(assetServer.url);
    await page.waitForFunction(() => window.uikitmlRender != null);

    const measured = await page.evaluate(
      (payload) => window.uikitmlRender.measure(payload),
      {
        source: options.source,
        kit: options.kit,
        width: options.width,
        height: options.height,
        preferredColorScheme: options.preferredColorScheme,
      },
    );

    if (!measured.ok) {
      throw new CliError(measured.error);
    }

    await page.setViewportSize({ width: measured.width, height: measured.height });
    const rendered = await page.evaluate(() => window.uikitmlRender.render());
    if (!rendered.ok) {
      throw new CliError(rendered.error);
    }

    await page.screenshot({ path: path.resolve(options.out), omitBackground: true });
    return { path: options.out, width: measured.width, height: measured.height };
  } finally {
    await assetServer.close();
    await browser.close();
  }
}

async function launchChromiumWithInstall(chromium: Awaited<typeof import("playwright")>["chromium"]) {
  try {
    return await chromium.launch();
  } catch (error) {
    if (!isMissingBrowserError(error)) {
      throw error;
    }
  }

  console.log("installing chromium for render...");
  await installChromium();
  return chromium.launch();
}

async function installChromium() {
  const require = createRequire(import.meta.url);
  const packageJsonPath = require.resolve("playwright/package.json");
  const cliPath = path.join(path.dirname(packageJsonPath), "cli.js");
  try {
    await execFileAsync(process.execPath, [cliPath, "install", "chromium"]);
  } catch (error) {
    throw new CliError("failed to install chromium for render");
  }
}

function isMissingBrowserError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Executable doesn't exist") || message.includes("playwright install");
}

async function serveRenderPage(): Promise<{ url: string; close(): Promise<void> }> {
  const root = new URL("./render-page/", import.meta.url);
  const server = createServer(async (request, response) => {
    try {
      const requestPath = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
      const relativePath = requestPath === "/" ? "index.html" : requestPath.slice(1);
      const fileUrl = new URL(relativePath, root);
      if (!fileUrl.href.startsWith(root.href)) {
        response.writeHead(403).end();
        return;
      }
      const fileStat = await stat(fileUrl);
      if (!fileStat.isFile()) {
        response.writeHead(404).end();
        return;
      }
      response.setHeader("Content-Type", contentType(fileUrl.pathname));
      createReadStream(fileUrl).pipe(response);
    } catch {
      response.writeHead(404).end();
    }
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address == null || typeof address === "string") {
    throw new CliError("failed to start render server");
  }
  return {
    url: `http://127.0.0.1:${address.port}/index.html`,
    close: () => closeServer(server),
  };
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error == null ? resolve() : reject(error)));
  });
}

function contentType(filePath: string): string {
  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (filePath.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }
  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  return "application/octet-stream";
}

declare global {
  interface Window {
    uikitmlRender: {
      measure(payload: {
        source: string;
        kit: KitName;
        width?: number;
        height?: number;
        preferredColorScheme?: PreferredColorScheme;
      }): Promise<BrowserRenderResult>;
      render(): Promise<BrowserRenderResult>;
    };
  }
}
