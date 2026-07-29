import type { FontWeight } from "@pmndrs/uikit";
import { z } from "zod";
import { formatInvalidPropertyNameMessage, isKebabPropertyName, kebabToCamel } from "./names.js";
import { normalizeStylesheetSection } from "./style-sections.js";
import type {
  RetainedStylesheet,
  SourceRange,
  StylesheetRangeInfo,
  UIKitMLFontFace,
  UIKitMLError,
} from "./types.js";

type CssRule = {
  selector: string;
  body: string;
  selectorRange: SourceRange;
  bodyStartInCss: number;
};

export function parseStyleDeclarations(
  source: string,
  range: SourceRange | undefined,
  locate?: (start: number, end: number) => SourceRange,
  context = "style declaration",
): {
  properties: Record<string, unknown>;
  declarationRanges: Map<string, SourceRange>;
  errors: UIKitMLError[];
} {
  const errors: UIKitMLError[] = [];
  const properties: Record<string, unknown> = {};
  const declarationRanges = new Map<string, SourceRange>();

  let declarationStart = 0;
  while (declarationStart <= source.length) {
    const semicolon = source.indexOf(";", declarationStart);
    const declarationEnd = semicolon === -1 ? source.length : semicolon;
    const declaration = source.slice(declarationStart, declarationEnd);
    const trimmed = declaration.trim();
    if (trimmed.length === 0) {
      if (semicolon === -1) {
        break;
      }
      declarationStart = semicolon + 1;
      continue;
    }
    const colon = trimmed.indexOf(":");
    const trimmedStart = declarationStart + declaration.indexOf(trimmed);
    if (colon === -1) {
      errors.push({
        code: "invalid-style-declaration",
        message: `Invalid style declaration "${trimmed}" on ${context}. Expected "property: value".`,
        range: locate?.(trimmedStart, trimmedStart + trimmed.length) ?? range,
      });
      if (semicolon === -1) {
        break;
      }
      declarationStart = semicolon + 1;
      continue;
    }
    const rawName = trimmed.slice(0, colon).trim();
    const rawValue = trimmed.slice(colon + 1).trim();
    const nameStart = trimmedStart + trimmed.slice(0, colon).indexOf(rawName);
    if (!isKebabPropertyName(rawName)) {
      errors.push({
        code: "invalid-property-name",
        message: formatInvalidPropertyNameMessage(rawName, context),
        range: locate?.(nameStart, nameStart + rawName.length) ?? range,
      });
      if (semicolon === -1) {
        break;
      }
      declarationStart = semicolon + 1;
      continue;
    }
    const property = kebabToCamel(rawName);
    properties[property] = property === "fontFamily" ? normalizeFontFamily(rawValue) : rawValue;
    if (range != null) {
      declarationRanges.set(property, locate?.(trimmedStart, trimmedStart + trimmed.length) ?? range);
    }
    if (semicolon === -1) {
      break;
    }
    declarationStart = semicolon + 1;
  }

  return { properties, declarationRanges, errors };
}

export function parseStylesheet(
  css: string,
  contentRange: SourceRange,
  schema: z.ZodType,
  options: { validate?: boolean } = {},
): {
  stylesheet: RetainedStylesheet;
  fontFaces: UIKitMLFontFace[];
  ranges: StylesheetRangeInfo;
  errors: UIKitMLError[];
} {
  const stylesheet: RetainedStylesheet = {};
  const fontFaces: UIKitMLFontFace[] = [];
  const errors: UIKitMLError[] = [];
  const ranges: StylesheetRangeInfo = { blocks: [], rules: [] };
  const extracted = extractRules(css, contentRange);
  const rules = extracted.rules;
  errors.push(...extracted.errors);

  for (const rule of rules) {
    const declarationRanges = new Map<string, SourceRange>();
    ranges.rules.push({ selector: rule.selectorRange, declarations: declarationRanges });

    if (rule.selector.toLowerCase() === "@font-face") {
      const parsed = parseFontFace(css, contentRange, rule, declarationRanges);
      errors.push(...parsed.errors);
      if (parsed.fontFace != null) {
        fontFaces.push(parsed.fontFace);
      }
      continue;
    }

    const parsedSelector = parseSelector(rule.selector);
    if (!parsedSelector.ok) {
      errors.push({
        code: "invalid-stylesheet",
        message: parsedSelector.message,
        range: rule.selectorRange,
      });
      continue;
    }

    const declarations = parseStyleDeclarations(
      rule.body,
      rule.selectorRange,
      (start, end) =>
        rangeInCss(css, contentRange, rule.bodyStartInCss + start, rule.bodyStartInCss + end),
      `selector "${rule.selector}"`,
    );
    errors.push(...declarations.errors);
    for (const [property, range] of declarations.declarationRanges) {
      declarationRanges.set(property, range);
    }

    if (options.validate !== false) {
      const validation = schema.safeParse(declarations.properties);
      if (!validation.success) {
        errors.push(
          ...formatStylesheetValidationErrors(
            validation.error.issues,
            declarations.properties,
            declarationRanges,
            rule.selector,
            rule.selectorRange,
          ),
        );
        continue;
      }
    }

    const selector = parsedSelector.selector;
    const className = selector.kind === "id" ? `__id__${selector.name}` : selector.name;
    stylesheet[className] ??= {};
    let target = stylesheet[className];
    if (selector.conditional != null) {
      target[selector.conditional] ??= {};
      target = target[selector.conditional] as Record<string, unknown>;
    }
    if (selector.star) {
      target["*"] ??= {};
      target = target["*"] as Record<string, unknown>;
    }
    Object.assign(target, declarations.properties);
  }

  return { stylesheet, fontFaces, ranges, errors };
}

export function collectFontFaceFamilyNames(css: string, contentRange: SourceRange): string[] {
  const names = new Set<string>();
  for (const rule of extractRules(css, contentRange).rules) {
    if (rule.selector.toLowerCase() !== "@font-face") {
      continue;
    }
    const declarations = parseStyleDeclarations(rule.body, undefined);
    const fontFamily = declarations.properties.fontFamily;
    if (typeof fontFamily === "string" && fontFamily.length > 0) {
      names.add(fontFamily);
    }
  }
  return [...names];
}

function parseFontFace(
  css: string,
  contentRange: SourceRange,
  rule: CssRule,
  declarationRanges: Map<string, SourceRange>,
): { fontFace?: UIKitMLFontFace; errors: UIKitMLError[] } {
  const parsed = parseStyleDeclarations(
    rule.body,
    rule.selectorRange,
    (start, end) =>
      rangeInCss(css, contentRange, rule.bodyStartInCss + start, rule.bodyStartInCss + end),
    '@font-face rule',
  );
  for (const [property, range] of parsed.declarationRanges) {
    declarationRanges.set(property, range);
  }

  const errors = [...parsed.errors];
  const supportedDescriptors = new Set(["fontFamily", "src", "fontWeight"]);
  for (const property of Object.keys(parsed.properties)) {
    if (supportedDescriptors.has(property)) {
      continue;
    }
    errors.push({
      code: "unknown-property",
      message: `Unsupported @font-face descriptor "${property}".`,
      range: declarationRanges.get(property) ?? rule.selectorRange,
    });
  }

  const fontFamily = parsed.properties.fontFamily;
  if (typeof fontFamily !== "string" || fontFamily.length === 0) {
    errors.push({
      code: "invalid-stylesheet",
      message: '@font-face requires a non-empty "font-family" descriptor.',
      range: declarationRanges.get("fontFamily") ?? rule.selectorRange,
    });
  }

  const rawSource = parsed.properties.src;
  const src = typeof rawSource === "string" ? findTTFSource(rawSource) : undefined;
  if (src == null) {
    errors.push({
      code: "invalid-stylesheet",
      message: '@font-face "src" must contain a URL to a .ttf file.',
      range: declarationRanges.get("src") ?? rule.selectorRange,
    });
  }

  const rawWeight = parsed.properties.fontWeight;
  const fontWeight = typeof rawWeight === "string" ? rawWeight : "normal";
  if (!isCSSFontWeight(fontWeight)) {
    errors.push({
      code: "invalid-stylesheet",
      message: `Invalid @font-face font weight "${fontWeight}". Expected "normal", "bold", or a CSS weight from 1 to 1000.`,
      range: declarationRanges.get("fontWeight") ?? rule.selectorRange,
    });
  }

  const fontFace =
    typeof fontFamily === "string" && src != null && isCSSFontWeight(fontWeight)
      ? { fontFamily, src, fontWeight }
      : undefined;
  if (errors.length > 0 || fontFace == null) {
    return { errors };
  }
  return { fontFace, errors };
}

function normalizeFontFamily(value: string): string {
  const trimmed = value.trim();
  return /^(["'])(.*)\1$/.exec(trimmed)?.[2] ?? trimmed;
}

function findTTFSource(value: string): string | undefined {
  const urlPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi;
  for (const match of value.matchAll(urlPattern)) {
    const url = (match[1] ?? match[2] ?? match[3])?.trim();
    if (url != null && /\.ttf(?:[?#]|$)/i.test(url)) {
      return url;
    }
  }
  return undefined;
}

function isCSSFontWeight(value: string): value is Extract<FontWeight, string> {
  if (value === "normal" || value === "bold") {
    return true;
  }
  const weight = Number(value);
  return /^\d+$/.test(value) && weight >= 1 && weight <= 1000;
}

type FlattenedValidationIssue = {
  kind: "unknown-property" | "invalid-value";
  property?: string;
  expected?: string;
  expectedAlternatives?: string[];
  values?: unknown[];
  original: z.core.$ZodIssue;
};

function formatStylesheetValidationErrors(
  issues: z.core.$ZodIssue[],
  properties: Record<string, unknown>,
  declarationRanges: Map<string, SourceRange>,
  selector: string,
  fallbackRange: SourceRange,
): UIKitMLError[] {
  return flattenValidationIssues(issues).map((issue) => {
    const property = issue.property;
    const value = property == null ? undefined : properties[property];
    const propertyText = property == null ? "declaration" : `property "${property}"`;
    const valueText = property == null ? "" : `: value ${formatValue(value)}`;
    const message =
      issue.kind === "unknown-property" && property != null
        ? `Unknown property "${property}" on selector "${selector}".`
        : `Invalid value for ${propertyText} on selector "${selector}"${valueText}. ${formatExpectation(issue)}`;
    return {
      code: issue.kind === "unknown-property" ? "unknown-property" : "invalid-property-value",
      message,
      range: property == null ? fallbackRange : declarationRanges.get(property) ?? fallbackRange,
      details: issue.original,
    };
  });
}

function flattenValidationIssues(issues: z.core.$ZodIssue[]): FlattenedValidationIssue[] {
  const result: FlattenedValidationIssue[] = [];
  for (const issue of issues) {
    const data = issue as z.core.$ZodIssue & {
      expected?: string;
      keys?: string[];
      values?: unknown[];
      errors?: z.core.$ZodIssue[][];
    };
    if (data.code === "unrecognized_keys") {
      for (const key of data.keys ?? []) {
        result.push({ kind: "unknown-property", property: key, original: issue });
      }
      continue;
    }
    if (data.code === "invalid_union" && data.errors != null) {
      const nested = data.errors.flat();
      if (nested.length > 0) {
        const pathEntry = issue.path.find((entry) => typeof entry === "string");
        const nestedIssues = flattenValidationIssues(nested);
        const nestedProperty = nestedIssues.find((nestedIssue) => nestedIssue.property != null)?.property;
        result.push({
          kind: "invalid-value",
          property: typeof pathEntry === "string" ? pathEntry : nestedProperty,
          expectedAlternatives: collectExpectedAlternatives(nested),
          original: issue,
        });
        continue;
      }
    }
    const pathEntry = issue.path.find((entry) => typeof entry === "string");
    result.push({
      kind: "invalid-value",
      property: typeof pathEntry === "string" ? pathEntry : undefined,
      expected: data.expected,
      values: data.values,
      original: issue,
    });
  }
  return result;
}

function formatExpectation(issue: FlattenedValidationIssue): string {
  if (issue.expectedAlternatives != null && issue.expectedAlternatives.length > 0) {
    return `Expected ${formatList(issue.expectedAlternatives)}.`;
  }
  if (issue.values != null && issue.values.length > 0) {
    return `Expected one of: ${issue.values.map(formatValue).join(", ")}.`;
  }
  if (issue.expected != null) {
    return `Expected ${issue.expected}.`;
  }
  return issue.original.message.endsWith(".") ? issue.original.message : `${issue.original.message}.`;
}

function collectExpectedAlternatives(issues: z.core.$ZodIssue[]): string[] {
  const alternatives: string[] = [];
  for (const issue of issues) {
    const data = issue as z.core.$ZodIssue & {
      expected?: string;
      values?: unknown[];
      errors?: z.core.$ZodIssue[][];
    };
    if (data.code === "invalid_union" && data.errors != null) {
      alternatives.push(...collectExpectedAlternatives(data.errors.flat()));
      continue;
    }
    if (data.values != null && data.values.length > 0) {
      alternatives.push(...data.values.map(formatValue));
      continue;
    }
    if (data.expected != null) {
      alternatives.push(data.expected);
      continue;
    }
    alternatives.push(formatExpectationMessage(issue.message));
  }
  return [...new Set(alternatives.filter(Boolean))];
}

function formatExpectationMessage(message: string): string {
  return message
    .replace(/\.$/, "")
    .replace(/^Expected an? /, "")
    .replace(/^Expected /, "");
}

function formatList(values: string[]): string {
  if (values.length <= 2) {
    return values.join(" or ");
  }
  return `${values.slice(0, -1).join(", ")}, or ${values[values.length - 1]}`;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return `"${value}"`;
  }
  if (value === undefined) {
    return "undefined";
  }
  return JSON.stringify(value);
}

function parseSelector(selector: string):
  | { ok: true; selector: { kind: "class" | "id"; name: string; conditional?: string; star: boolean } }
  | { ok: false; message: string } {
  const match = /^([.#])([A-Za-z_][A-Za-z0-9_-]*)(?::([A-Za-z0-9_-]+))?(?:\s*>\s*\*)?$/.exec(selector);
  if (match == null) {
    return {
      ok: false,
      message: `Unsupported stylesheet selector "${selector}". Expected ".class", "#id", an optional conditional, and optional "> *".`,
    };
  }
  const rawSection = match[3];
  const conditional = rawSection == null ? undefined : normalizeStylesheetSection(rawSection);
  if (rawSection != null && conditional == null) {
    return {
      ok: false,
      message: `Unsupported stylesheet section "${rawSection}" on selector "${selector}".`,
    };
  }

  return {
    ok: true,
    selector: {
      kind: match[1] === "#" ? "id" : "class",
      name: match[2],
      conditional,
      star: />\s*\*$/.test(selector),
    },
  };
}

function rangeInCss(css: string, contentRange: SourceRange, start: number, end: number): SourceRange {
  return {
    start: positionInCss(css, contentRange, start),
    end: positionInCss(css, contentRange, end),
  };
}

function positionInCss(css: string, contentRange: SourceRange, offset: number) {
  let line = contentRange.start.line;
  let column = contentRange.start.column;
  for (let index = 0; index < offset; index++) {
    if (css[index] === "\n") {
      line++;
      column = 0;
    } else {
      column++;
    }
  }
  return {
    offset: contentRange.start.offset + offset,
    line,
    column,
  };
}

function extractRules(css: string, contentRange: SourceRange): { rules: CssRule[]; errors: UIKitMLError[] } {
  const rules: CssRule[] = [];
  const errors: UIKitMLError[] = [];
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  let consumedEnd = 0;

  for (const match of css.matchAll(rulePattern)) {
    const matchStart = match.index ?? 0;
    reportUnparsedCss(css, contentRange, consumedEnd, matchStart, errors);

    const rawSelector = match[1];
    const selectorText = rawSelector.trim();
    const openBrace = matchStart + match[0].indexOf("{");
    if (selectorText.length === 0) {
      errors.push({
        code: "invalid-stylesheet",
        message: "Expected a stylesheet selector before declaration block.",
        range: rangeInCss(css, contentRange, matchStart, openBrace + 1),
      });
      consumedEnd = matchStart + match[0].length;
      continue;
    }

    const selectorStart = matchStart + rawSelector.indexOf(selectorText);
    const selectorEnd = selectorStart + selectorText.length;
    rules.push({
      selector: selectorText,
      body: match[2],
      selectorRange: rangeInCss(css, contentRange, selectorStart, selectorEnd),
      bodyStartInCss: openBrace + 1,
    });
    consumedEnd = matchStart + match[0].length;
  }

  reportUnparsedCss(css, contentRange, consumedEnd, css.length, errors);

  return { rules, errors };
}

function reportUnparsedCss(
  css: string,
  contentRange: SourceRange,
  start: number,
  end: number,
  errors: UIKitMLError[],
) {
  const unparsed = css.slice(start, end);
  if (unparsed.trim().length === 0) {
    return;
  }
  const leading = unparsed.search(/\S/);
  const errorStart = start + leading;
  const trailing = unparsed.length - unparsed.trimEnd().length;
  errors.push({
    code: "invalid-stylesheet",
    message: "Invalid stylesheet syntax. Expected a selector followed by a declaration block.",
    range: rangeInCss(css, contentRange, errorStart, end - trailing),
  });
}
