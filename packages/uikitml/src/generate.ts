import { encodeHTML } from "entities";
import { camelToKebab } from "./names.js";
import type { RetainedStylesheet, UIKitMLAst, UIKitMLNode } from "./types.js";

const conditionalNames = new Set(["hover", "active", "focus", "sm", "md", "lg", "xl", "2xl"]);

export function generate(ast: UIKitMLAst): string {
  const metadata = generateMetadata(ast);
  const stylesheet = generateStylesheet(ast.stylesheet);
  const body = generateNode(ast.root, 0);
  return [metadata, stylesheet, body].filter((part) => part.length > 0).join("\n");
}

function generateMetadata(ast: UIKitMLAst): string {
  const preferredColorScheme = ast.metadata.preferredColorScheme;
  return preferredColorScheme == null ? "" : `<meta preferred-color-scheme="${preferredColorScheme}" />`;
}

function generateNode(node: UIKitMLNode, depth: number): string {
  if (node.kind === "text") {
    return indent(depth) + encodeHTML(node.value);
  }
  if (node.kind === "rawSvg") {
    return indent(depth) + node.raw;
  }

  const attributes = generateAttributes(node);
  const open = attributes.length > 0 ? `<${node.tagName} ${attributes}>` : `<${node.tagName}>`;
  if (node.children.length === 0) {
    return indent(depth) + (attributes.length > 0 ? `<${node.tagName} ${attributes} />` : `<${node.tagName} />`);
  }

  const children = node.children.map((child) => generateNode(child, depth + 1)).join("\n");
  return `${indent(depth)}${open}\n${children}\n${indent(depth)}</${node.tagName}>`;
}

function generateAttributes(node: Extract<UIKitMLNode, { props: Record<string, unknown> }>): string {
  const regular: Array<[string, unknown]> = [];
  const inlineStyle: Record<string, unknown> = {};

  for (const [property, value] of Object.entries(node.props)) {
    if (value == null || property === "content" || property === "text") {
      continue;
    }
    if (typeof value === "function") {
      continue;
    }
    const provenance = node.meta.provenance.get(property);
    const lastSource = provenance?.[provenance.length - 1]?.source;
    if (lastSource === "inline-style") {
      inlineStyle[property] = value;
    } else {
      regular.push([camelToKebab(property), value]);
    }
  }

  if (node.classList.length > 0) {
    regular.push(["class", node.classList.join(" ")]);
  }

  if (Object.keys(inlineStyle).length > 0) {
    regular.push(["style", generateDeclarationList(inlineStyle)]);
  }

  regular.sort(([left], [right]) => {
    const rank = (name: string) => (name === "id" ? 0 : name === "class" ? 1 : 2);
    return rank(left) - rank(right) || left.localeCompare(right);
  });

  return regular.map(([name, value]) => formatAttribute(name, value)).join(" ");
}

function formatAttribute(name: string, value: unknown): string {
  if (value === true) {
    return name;
  }
  return `${name}="${escapeAttribute(String(value))}"`;
}

function generateStylesheet(stylesheet: RetainedStylesheet): string {
  const rules: string[] = [];
  for (const [className, content] of Object.entries(stylesheet)) {
    const selectorBase = className.startsWith("__id__") ? `#${className.slice("__id__".length)}` : `.${className}`;
    pushStyleRules(rules, selectorBase, content);
  }
  return rules.length === 0 ? "" : `<style>\n${rules.map((rule) => `  ${rule}`).join("\n")}\n</style>`;
}

function pushStyleRules(rules: string[], selector: string, content: Record<string, unknown>) {
  const base: Record<string, unknown> = {};
  for (const [property, value] of Object.entries(content)) {
    if (property === "*") {
      rules.push(`${selector} > * { ${generateDeclarationList(value as Record<string, unknown>)} }`);
      continue;
    }
    if (conditionalNames.has(property)) {
      const conditional = { ...(value as Record<string, unknown>) };
      const star = conditional["*"];
      delete conditional["*"];
      if (Object.keys(conditional).length > 0) {
        rules.push(`${selector}:${property} { ${generateDeclarationList(conditional)} }`);
      }
      if (star != null) {
        rules.push(`${selector}:${property} > * { ${generateDeclarationList(star as Record<string, unknown>)} }`);
      }
      continue;
    }
    base[property] = value;
  }
  if (Object.keys(base).length > 0) {
    rules.unshift(`${selector} { ${generateDeclarationList(base)} }`);
  }
}

function generateDeclarationList(style: Record<string, unknown>): string {
  return Object.entries(style)
    .filter(([, value]) => value != null && typeof value !== "function")
    .map(([property, value]) => `${camelToKebab(property)}: ${String(value)}`)
    .join("; ");
}

function indent(depth: number) {
  return "  ".repeat(depth);
}

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
