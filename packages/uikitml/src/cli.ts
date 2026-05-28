#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { Command, CommanderError, Option } from "commander";
import { parse } from "./parse.js";
import { CliError, parseDimension, printValidationErrors, readInput, type InputSource } from "./cli-utils.js";
import { convertToReact } from "./convert-react.js";
import { convertToThree } from "./convert-three.js";
import { renderToPng } from "./render.js";
import { resolveKitComponentSets, type KitName } from "./kits.js";
import type { PreferredColorScheme } from "./types.js";

type KitOptions = {
  kit: KitName;
};

const program = new Command();

program
  .name("uikitml")
  .description("Validate, render, and convert UIKitML")
  .showHelpAfterError(false)
  .exitOverride();

program
  .command("validate")
  .argument("<input>")
  .addOption(kitOption())
  .action(async (input: string, options: KitOptions) => {
    const source = await readInput(input);
    const result = parse(source.source, { componentSets: resolveKitComponentSets(options.kit) });
    printValidationErrors(result.success ? [] : result.errors);
  });

program
  .command("render")
  .argument("<input>")
  .addOption(kitOption())
  .addOption(colorSchemeOption())
  .option("--width <number>")
  .option("--height <number>")
  .option("--out <path>")
  .action(async (input: string, options: KitOptions & { colorScheme?: PreferredColorScheme; width?: string; height?: string; out?: string }) => {
    const source = await readInput(input);
    const componentSets = resolveKitComponentSets(options.kit);
    const result = parse(source.source, { componentSets });
    if (!result.success) {
      printValidationErrors(result.errors);
      return;
    }

    const out = options.out ?? defaultRenderOutPath(source);
    const rendered = await renderToPng({
      source: source.source,
      kit: options.kit,
      width: parseDimension(options.width, "width"),
      height: parseDimension(options.height, "height"),
      preferredColorScheme: options.colorScheme,
      out,
    });
    console.log(`rendered ${rendered.path} ${rendered.width}x${rendered.height}`);
  });

program
  .command("convert")
  .argument("<input>")
  .addOption(kitOption())
  .addOption(colorSchemeOption())
  .option("--to <target>", "conversion target", "react")
  .option("--name <name>")
  .option("--out <path>")
  .action(async (input: string, options: KitOptions & { colorScheme?: PreferredColorScheme; to: string; name?: string; out?: string }) => {
    const target = parseConvertTarget(options.to);

    const source = await readInput(input);
    const componentSets = resolveKitComponentSets(options.kit);
    const result = parse(source.source, { componentSets });
    if (!result.success) {
      printValidationErrors(result.errors);
      return;
    }

    const componentName = options.name ?? defaultComponentName(source);
    const out = options.out ?? defaultConvertOutPath(source, target);
    const code =
      target === "react"
        ? convertToReact(result.ast, {
            componentName,
            componentSets,
            preferredColorScheme: options.colorScheme,
          })
        : convertToThree(result.ast, {
            functionName: componentName,
            componentSets,
            preferredColorScheme: options.colorScheme,
          });
    await writeFile(out, code, "utf8");
    console.log(`converted ${out}`);
  });

try {
  await program.parseAsync(process.argv);
} catch (error) {
  if (error instanceof CliError) {
    console.error(`error ${error.message}`);
    process.exit(error.exitCode);
  }
  if (error instanceof CommanderError) {
    console.error(`error ${error.message.replace(/^error:\s*/, "")}`);
    process.exit(error.exitCode);
  }
  const message = error instanceof Error ? error.message : String(error);
  console.error(`error ${message}`);
  process.exit(1);
}

function kitOption(): Option {
  return new Option("--kit <kit>", "component kit").choices(["default", "horizon"]).default("default");
}

function colorSchemeOption(): Option {
  return new Option("--color-scheme <scheme>", "preferred color scheme").choices(["dark", "light", "system"]);
}

function defaultRenderOutPath(source: InputSource): string {
  if (source.kind === "file") {
    return replaceExtension(source.path, ".png");
  }
  return "uikitml-render.png";
}

type ConvertTarget = "react" | "three";

function parseConvertTarget(target: string): ConvertTarget {
  switch (target.toLowerCase()) {
    case "react":
      return "react";
    case "three":
    case "threejs":
    case "raw-threejs":
    case "vanilla":
    case "vanilla-three":
    case "vanilla-threejs":
      return "three";
    default:
      throw new CliError(`unknown target "${target}"; expected "react" or "three"`);
  }
}

function defaultConvertOutPath(source: InputSource, target: ConvertTarget): string {
  const extension = target === "react" ? ".tsx" : ".ts";
  if (source.kind === "file") {
    return replaceExtension(source.path, extension);
  }
  return `UI${extension}`;
}

function defaultComponentName(source: InputSource): string {
  if (source.kind !== "file") {
    return "UI";
  }
  return toPascalCase(path.basename(source.path, path.extname(source.path))) || "UI";
}

function replaceExtension(filePath: string, extension: string): string {
  return path.join(path.dirname(filePath), `${path.basename(filePath, path.extname(filePath))}${extension}`);
}

function toPascalCase(value: string): string {
  return value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}
