import { ContainerPropertiesSchema } from "@pmndrs/uikit";
import type { z } from "zod";
import { collectFontFaceFamilyNames, parseStylesheet, parseStyleDeclarations } from "./css.js";
import { resolveComponentRegistry } from "./component-sets.js";
import { withDeclaredFontFamilyEnum, withFontFamilyEnum } from "./fonts.js";
import { formatInvalidPropertyNameMessage, isKebabPropertyName, kebabToCamel } from "./names.js";
import { tokenize, type ParsedAttribute, type UIKitMLToken } from "./tokens.js";
import type {
  AttributeRangeInfo,
  ComponentDefinition,
  ParseOptions,
  ParseResult,
  PropertyProvenance,
  RetainedStylesheet,
  SourceRange,
  SourceRangeInfo,
  StylesheetRangeInfo,
  UIKitMLAst,
  UIKitMLFontFace,
  UIKitMLNode,
  UIKitMLError,
} from "./types.js";

type ElementNode = {
  kind: "element";
  tagName: string;
  attributes: ParsedAttribute[];
  children: TreeNode[];
  range: SourceRange;
  openTag: SourceRange;
  closeTag?: SourceRange;
  tagNameRange: SourceRange;
};

type TextNode = {
  kind: "text";
  value: string;
  range: SourceRange;
};

type RawSvgNode = {
  kind: "rawSvg";
  tagName: "svg";
  raw: string;
  attributes: ParsedAttribute[];
  range: SourceRange;
  openTag: SourceRange;
  closeTag?: SourceRange;
  tagNameRange: SourceRange;
};

type TreeNode = ElementNode | TextNode | RawSvgNode;

type StackEntry = ElementNode;

export function parse(source: string, options: ParseOptions = {}): ParseResult {
  const validate = options.validate !== false;
  const tokenized = tokenize(source);
  const errors = [...tokenized.errors];
  const tokens: UIKitMLToken[] = tokenized.tokens;

  const declaredFontFamilyNames = new Set(
    tokens.flatMap((token) =>
      token.type === "styleBlock" ? collectFontFaceFamilyNames(token.css, token.contentRange) : [],
    ),
  );
  const registry: Record<string, ComponentDefinition> = {};
  for (const [name, definition] of Object.entries(
    resolveComponentRegistry(options.componentSets, options.includeHtmlComponentSet),
  )) {
    registry[name] = {
      ...definition,
      schema: withDeclaredFontFamilyEnum(definition.schema, declaredFontFamilyNames),
    };
  }
  const stylesheetRanges: StylesheetRangeInfo = { blocks: [], rules: [] };
  const stylesheet: RetainedStylesheet = {};
  const fontFaces: UIKitMLFontFace[] = [];
  const stylesheetSchema = withFontFamilyEnum(ContainerPropertiesSchema, declaredFontFamilyNames);
  const metadata: UIKitMLAst["metadata"] = {};
  const roots: TreeNode[] = [];
  const stack: StackEntry[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "comment":
        break;
      case "styleBlock": {
        stylesheetRanges.blocks.push(token.range);
        const parsed = parseStylesheet(token.css, token.contentRange, stylesheetSchema, {
          validate,
        });
        Object.assign(stylesheet, parsed.stylesheet);
        fontFaces.push(...parsed.fontFaces);
        stylesheetRanges.rules.push(...parsed.ranges.rules);
        errors.push(...parsed.errors);
        break;
      }
      case "text":
        appendNode({ kind: "text", value: token.value, range: token.range }, stack, roots);
        break;
      case "rawSvg":
        appendNode(
          {
            kind: "rawSvg",
            tagName: "svg",
            raw: token.raw,
            attributes: token.attributes,
            range: token.range,
            openTag: token.openTag,
            closeTag: token.closeTag,
            tagNameRange: token.tagNameRange,
          },
          stack,
          roots,
        );
        break;
      case "selfClosingTag":
        if (token.tagName === "meta") {
          errors.push(...parseMetadata(token.attributes, token.range, metadata, stack));
          break;
        }
        appendNode(
          {
            kind: "element",
            tagName: token.tagName,
            attributes: token.attributes,
            children: [],
            range: token.range,
            openTag: token.range,
            tagNameRange: token.tagNameRange,
          },
          stack,
          roots,
        );
        break;
      case "openTag":
        stack.push({
          kind: "element",
          tagName: token.tagName,
          attributes: token.attributes,
          children: [],
          range: token.range,
          openTag: token.range,
          tagNameRange: token.tagNameRange,
        });
        break;
      case "closeTag": {
        const open = stack.pop();
        if (open == null) {
          errors.push({
            code: "syntax",
            message: `Unexpected closing tag </${token.tagName}>.`,
            range: token.range,
          });
          break;
        }
        if (open.tagName !== token.tagName) {
          errors.push({
            code: "syntax",
            message: `Expected </${open.tagName}> but found </${token.tagName}>.`,
            range: token.range,
          });
        }
        open.closeTag = token.range;
        open.range = { start: open.range.start, end: token.range.end };
        appendNode(open, stack, roots);
        break;
      }
    }
  }

  for (const unclosed of stack.reverse()) {
    errors.push({
      code: "syntax",
      message: `Missing closing tag for <${unclosed.tagName}>.`,
      range: unclosed.openTag,
    });
  }

  if (roots.length === 0) {
    errors.push({ code: "missing-root", message: "UIKitML requires exactly one root component." });
  }
  if (roots.length > 1) {
    errors.push({
      code: "multiple-roots",
      message: "UIKitML requires exactly one root component.",
      range: { start: roots[1].range.start, end: roots[roots.length - 1].range.end },
    });
  }

  if (errors.length > 0 || roots[0] == null) {
    return { success: false, errors };
  }

  const built = buildAstNode(roots[0], registry, validate);
  errors.push(...built.errors);

  if (errors.length > 0 || built.node == null) {
    return { success: false, errors };
  }

  return {
    success: true,
    ast: {
      root: built.node,
      stylesheet,
      stylesheetRanges,
      fontFaces,
      metadata,
    },
  };
}

function parseMetadata(
  attributes: ParsedAttribute[],
  range: SourceRange,
  metadata: UIKitMLAst["metadata"],
  stack: StackEntry[],
): UIKitMLError[] {
  const errors: UIKitMLError[] = [];
  if (stack.length > 0) {
    errors.push({
      code: "invalid-metadata",
      message: "<meta> must be a top-level UIKitML metadata element.",
      range,
    });
  }

  for (const attribute of attributes) {
    if (attribute.name !== "preferred-color-scheme") {
      errors.push({
        code: "invalid-metadata",
        message: `Unknown metadata property "${attribute.name}".`,
        range: attribute.nameRange,
      });
      continue;
    }

    if (attribute.value !== "dark" && attribute.value !== "light" && attribute.value !== "system") {
      errors.push({
        code: "invalid-metadata",
        message: 'Invalid preferred color scheme. Expected "dark", "light", or "system".',
        range: attribute.valueRange ?? attribute.range,
      });
      continue;
    }

    metadata.preferredColorScheme = attribute.value;
  }

  return errors;
}

function appendNode(node: TreeNode, stack: StackEntry[], roots: TreeNode[]) {
  const target = stack[stack.length - 1]?.children ?? roots;
  const previous = target[target.length - 1];
  if (node.kind === "text" && previous?.kind === "text") {
    previous.value += node.value;
    previous.range = { start: previous.range.start, end: node.range.end };
    return;
  }
  target.push(node);
}

function buildAstNode(
  node: TreeNode,
  registry: Record<string, ComponentDefinition>,
  validate: boolean,
): { node?: UIKitMLNode; errors: UIKitMLError[] } {
  if (node.kind === "text") {
    return {
      node: {
        kind: "text",
        value: node.value,
        meta: {
          element: node.range,
          openTag: node.range,
          tagName: node.range,
          attributes: new Map(),
          text: node.range,
          sourceTag: "#text",
          textValue: node.value,
          provenance: new Map([
            ["text", [{ property: "text", source: "attribute", range: node.range }]],
          ]),
        },
      },
      errors: [],
    };
  }

  const tagName = node.tagName;
  const definition = registry[tagName];
  if (definition == null) {
    return {
      errors: [
        {
          code: "unknown-component",
          message: `Unknown component <${tagName}>.`,
          range: node.tagNameRange,
        },
      ],
    };
  }

  const parsedProps = parseProperties(node.attributes, tagName);
  const errors = [...parsedProps.errors];

  if (tagName === "img" && parsedProps.props.src == null) {
    errors.push({ code: "invalid-property-value", message: '<img> requires property "src".', range: node.range });
  }
  if (tagName === "video" && parsedProps.props.src == null) {
    errors.push({ code: "invalid-property-value", message: '<video> requires property "src".', range: node.range });
  }

  const childNodes = node.kind === "rawSvg" ? [] : node.children;
  const textOnlyTextarea =
    tagName === "textarea" &&
    childNodes.length <= 1 &&
    childNodes.every((child) => child.kind === "text");

  if (!definition.canHaveChildren && childNodes.length > 0 && !textOnlyTextarea) {
    errors.push({
      code: "children-not-allowed",
      message: `<${tagName}> cannot contain children.`,
      range: childNodes[0]?.range ?? node.range,
    });
  }

  if (tagName === "textarea" && textOnlyTextarea && childNodes[0]?.kind === "text") {
    parsedProps.props.defaultValue ??= childNodes[0].value;
    parsedProps.provenance.set("defaultValue", [
      { property: "defaultValue", source: "attribute", range: childNodes[0].range },
    ]);
  }

  if (node.kind === "rawSvg") {
    parsedProps.props.content = node.raw;
    parsedProps.provenance.set("content", [{ property: "content", source: "attribute", range: node.range }]);
  }

  if (validate) {
    const validation = definition.schema.safeParse(parsedProps.props);
    if (!validation.success) {
      errors.push(...formatPropertyValidationErrors(validation.error.issues, parsedProps, tagName, node.range));
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  const meta: SourceRangeInfo = {
    element: node.range,
    openTag: node.openTag,
    closeTag: node.closeTag,
    tagName: node.tagNameRange,
    attributes: parsedProps.attributeRanges,
    sourceTag: tagName,
    provenance: parsedProps.provenance,
  };

  if (node.kind === "rawSvg") {
    return {
      node: {
        kind: "rawSvg",
        tagName: "svg",
        origin: definition.origin,
        raw: node.raw,
        props: parsedProps.props,
        classList: parsedProps.classList,
        meta,
      },
      errors: [],
    };
  }

  const children: UIKitMLNode[] = [];
  if (definition.canHaveChildren) {
    for (const child of childNodes) {
      const built = buildAstNode(child, registry, validate);
      errors.push(...built.errors);
      if (built.node != null) {
        children.push(built.node);
      }
    }
  }

  return errors.length === 0
    ? {
        node: {
          kind: "element",
          tagName,
          origin: definition.origin,
          props: parsedProps.props,
          classList: parsedProps.classList,
          children,
          meta,
        },
        errors,
      }
    : { errors };
}

function parseProperties(attributes: ParsedAttribute[], tagName: string) {
  const props: Record<string, unknown> = {};
  const classList: string[] = [];
  const errors: UIKitMLError[] = [];
  const attributeRanges = new Map<string, AttributeRangeInfo>();
  const provenance = new Map<string, PropertyProvenance[]>();
  let inlineStyle: string | undefined;
  let inlineStyleRange: SourceRange | undefined;

  for (const attribute of attributes) {
    attributeRanges.set(attribute.name, {
      name: attribute.nameRange,
      value: attribute.valueRange,
      full: attribute.range,
    });

    if (!isKebabPropertyName(attribute.name)) {
      errors.push({
        code: "invalid-property-name",
        message: formatInvalidPropertyNameMessage(attribute.name, `element "<${tagName}>"`),
        range: attribute.nameRange,
      });
      continue;
    }

    if (attribute.name === "class") {
      if (attribute.value !== true) {
        classList.push(...attribute.value.split(/\s+/).filter(Boolean));
      }
      continue;
    }

    if (attribute.name === "style") {
      if (attribute.value !== true) {
        inlineStyle = attribute.value;
        inlineStyleRange = attribute.valueRange ?? attribute.range;
      }
      continue;
    }

    const property = kebabToCamel(attribute.name);
    props[property] = attribute.value;
    appendProvenance(provenance, property, {
      property,
      source: "attribute",
      range: attribute.valueRange ?? attribute.range,
    });
  }

  if (inlineStyle != null) {
    const parsed = parseStyleDeclarations(inlineStyle, inlineStyleRange, undefined, `element "<${tagName}>"`);
    errors.push(...parsed.errors);
    for (const [property, value] of Object.entries(parsed.properties)) {
      props[property] = value;
      appendProvenance(provenance, property, {
        property,
        source: "inline-style",
        range: parsed.declarationRanges.get(property) ?? inlineStyleRange,
      });
    }
  }

  return { props, classList, errors, attributeRanges, provenance };
}

type ParsedProperties = ReturnType<typeof parseProperties>;

function formatPropertyValidationErrors(
  issues: z.core.$ZodIssue[],
  parsedProps: ParsedProperties,
  tagName: string,
  fallbackRange: SourceRange,
): UIKitMLError[] {
  return flattenValidationIssues(issues).map((issue) => {
    const property = issue.property;
    const provenanceEntries = property == null ? undefined : parsedProps.provenance.get(property);
    const provenance = provenanceEntries?.[provenanceEntries.length - 1];
    const value = property == null ? undefined : parsedProps.props[property];
    const propertyText = property == null ? "properties" : `property "${property}"`;
    const valueText = property == null ? "" : `: value ${formatValue(value)}`;
    const message =
      issue.kind === "unknown-property" && property != null
        ? `Unknown property "${property}" on element "<${tagName}>".`
        : `Invalid value for ${propertyText} on element "<${tagName}>"${valueText}. ${formatExpectation(issue)}`;
    return {
      code: issue.kind === "unknown-property" ? "unknown-property" : "invalid-property-value",
      message,
      range: provenance?.range ?? fallbackRange,
      details: issue.original,
    };
  });
}

type FlattenedValidationIssue = {
  kind: "unknown-property" | "invalid-value";
  property?: string;
  expected?: string;
  expectedAlternatives?: string[];
  values?: unknown[];
  original: z.core.$ZodIssue;
};

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

function appendProvenance(
  provenance: Map<string, PropertyProvenance[]>,
  property: string,
  entry: PropertyProvenance,
) {
  const entries = provenance.get(property) ?? [];
  entries.push(entry);
  provenance.set(property, entries);
}
