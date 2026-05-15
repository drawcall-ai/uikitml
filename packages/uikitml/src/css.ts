import { z } from "zod";
import { formatInvalidPropertyNameMessage, isKebabPropertyName, kebabToCamel } from "./names.js";
import type {
  RetainedStylesheet,
  SourceRange,
  StylesheetRangeInfo,
  UIKitMLError,
} from "./types.js";

const supportedConditionals = new Set(["hover", "active", "focus", "sm", "md", "lg", "xl", "2xl"]);

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
    properties[property] = rawValue;
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
  ranges: StylesheetRangeInfo;
  errors: UIKitMLError[];
} {
  const stylesheet: RetainedStylesheet = {};
  const errors: UIKitMLError[] = [];
  const ranges: StylesheetRangeInfo = { blocks: [], rules: [] };
  const rules = extractRules(css, contentRange);

  for (const rule of rules) {
    const parsedSelector = parseSelector(rule.selector);
    const declarationRanges = new Map<string, SourceRange>();
    ranges.rules.push({ selector: rule.selectorRange, declarations: declarationRanges });

    if (parsedSelector == null) {
      errors.push({
        code: "invalid-stylesheet",
        message: `Unsupported stylesheet selector "${rule.selector}".`,
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

    const className = parsedSelector.kind === "id" ? `__id__${parsedSelector.name}` : parsedSelector.name;
    stylesheet[className] ??= {};
    let target = stylesheet[className];
    if (parsedSelector.conditional != null) {
      target[parsedSelector.conditional] ??= {};
      target = target[parsedSelector.conditional] as Record<string, unknown>;
    }
    if (parsedSelector.star) {
      target["*"] ??= {};
      target = target["*"] as Record<string, unknown>;
    }
    Object.assign(target, declarations.properties);
  }

  return { stylesheet, ranges, errors };
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
  | { kind: "class" | "id"; name: string; conditional?: string; star: boolean }
  | undefined {
  const match = /^([.#])([A-Za-z_][\w-]*)(?::([A-Za-z0-9_-]+))?(?:\s*>\s*\*)?$/.exec(selector);
  if (match == null) {
    return undefined;
  }
  const conditional = match[3];
  if (conditional != null && !supportedConditionals.has(conditional)) {
    return undefined;
  }
  return {
    kind: match[1] === "#" ? "id" : "class",
    name: match[2],
    conditional,
    star: />\s*\*$/.test(selector),
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

function extractRules(css: string, contentRange: SourceRange): CssRule[] {
  const rules: CssRule[] = [];
  const regex = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(css)) != null) {
    const selectorText = match[1].trim();
    const leading = match[1].indexOf(selectorText);
    const selectorStart = match.index + leading;
    const selectorEnd = selectorStart + selectorText.length;
    rules.push({
      selector: selectorText,
      body: match[2],
      selectorRange: rangeInCss(css, contentRange, selectorStart, selectorEnd),
      bodyStartInCss: match.index + match[1].length + 1,
    });
  }
  return rules;
}
