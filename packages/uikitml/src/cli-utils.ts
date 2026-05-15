import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { UIKitMLError } from "./types.js";

export type InputSource =
  | { kind: "stdin"; source: string }
  | { kind: "file"; path: string; source: string }
  | { kind: "inline"; source: string };

export class CliError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

export async function readInput(input: string): Promise<InputSource> {
  if (input === "-") {
    return { kind: "stdin", source: await readStdin() };
  }
  if (existsSync(input)) {
    return { kind: "file", path: input, source: await readFile(input, "utf8") };
  }
  return { kind: "inline", source: input };
}

export function formatValidationErrors(errors: UIKitMLError[]): string {
  const lines = [`${errors.length} ${errors.length === 1 ? "error" : "errors"}`];
  for (const error of errors) {
    const position = error.range?.start;
    const prefix = position == null ? "" : `${position.line + 1}:${position.column + 1} `;
    lines.push(`${prefix}${error.code} ${error.message}`);
  }
  return lines.join("\n");
}

export function printValidationErrors(errors: UIKitMLError[]) {
  console.log(formatValidationErrors(errors));
}

export function parseDimension(value: string | undefined, label: string): number | undefined {
  if (value == null) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new CliError(`${label} must be a positive number`);
  }
  return parsed;
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let source = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      source += chunk;
    });
    process.stdin.on("error", reject);
    process.stdin.on("end", () => resolve(source));
  });
}
