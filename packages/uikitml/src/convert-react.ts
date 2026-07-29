import type { PreferredColorScheme } from "@pmndrs/uikit";
import { resolveComponentRegistry } from "./component-sets.js";
import {
  collectFonts,
  getFontFamilyDefinition,
  groupTTFFontFaces,
  type CollectedFonts,
} from "./fonts.js";
import type {
  ComponentSet,
  RetainedStylesheet,
  UIKitMLAst,
  UIKitMLNode,
} from "./types.js";

export type ConvertReactOptions = {
  componentName: string;
  componentSets?: ComponentSet[];
  preferredColorScheme?: PreferredColorScheme;
};

const packageByKit: Record<string, string> = {
  html: "@react-three/uikit",
  lucide: "@react-three/uikit-lucide",
  horizon: "@react-three/uikit-horizon",
};

export function convertToReact(ast: UIKitMLAst, options: ConvertReactOptions): string {
  const registry = resolveComponentRegistry(options.componentSets);
  const imports = new Map<string, Set<string>>();
  const stylesheet = Object.keys(ast.stylesheet).length > 0 ? ast.stylesheet : undefined;
  const preferredColorScheme = options.preferredColorScheme ?? ast.metadata.preferredColorScheme;
  const fonts = collectFonts(ast);
  const body = renderNode(ast.root, 2, registry, imports, renderFontFamiliesProp(fonts));

  if (preferredColorScheme != null) {
    addImport(imports, "@react-three/uikit", "setPreferredColorScheme");
  }
  if (stylesheet != null) {
    addImport(imports, "@pmndrs/uikit", "StyleSheet");
  }
  for (const fontFamily of fonts.bundled) {
    const definition = getFontFamilyDefinition(fontFamily);
    addImport(imports, definition.importPath, definition.exportName);
  }
  if (fonts.ttf.length > 0) {
    addImport(imports, "@react-three/uikit", "useTTF");
  }

  const lines: string[] = [];
  for (const [packageName, names] of [...imports.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    lines.push(`import { ${[...names].sort().join(", ")} } from "${packageName}";`);
  }

  if (lines.length > 0) {
    lines.push("");
  }

  if (preferredColorScheme != null) {
    lines.push(`setPreferredColorScheme(${JSON.stringify(preferredColorScheme)});`);
    if (stylesheet != null) {
      lines.push("");
    }
  }

  if (stylesheet != null) {
    lines.push(`Object.assign(StyleSheet, ${formatObject(stylesheet, 0)});`);
    lines.push("");
  }

  lines.push(`export function ${options.componentName}() {`);
  for (const [index, fontFace] of fonts.ttf.entries()) {
    lines.push(`  const ttfFont${index} = useTTF(${JSON.stringify(fontFace.src)});`);
  }
  if (fonts.ttf.length > 0) {
    lines.push("");
  }
  lines.push("  return (");
  lines.push(body);
  lines.push("  );");
  lines.push("}");
  lines.push("");

  if (fonts.ttf.length > 0) {
    lines.push("function getTTFFont(fontFamilies: ReturnType<typeof useTTF>, source: string) {");
    lines.push("  const family = Object.values(fontFamilies)[0];");
    lines.push("  const font = family == null ? undefined : Object.values(family)[0];");
    lines.push("  if (font == null) {");
    lines.push('    throw new Error(`TTF file "${source}" did not contain a font face.`);');
    lines.push("  }");
    lines.push("  return font;");
    lines.push("}");
    lines.push("");
  }

  return lines.join("\n");
}

function renderNode(
  node: UIKitMLNode,
  depth: number,
  registry: ReturnType<typeof resolveComponentRegistry>,
  imports: Map<string, Set<string>>,
  extraProp?: string,
): string {
  if (node.kind === "text") {
    addImport(imports, "@react-three/uikit", "Text");
    return `${indent(depth)}<Text>${formatTextChild(node.value)}</Text>`;
  }

  const origin = node.origin;
  if (origin == null) {
    throw new Error(`Cannot convert <${node.tagName}> because it has no component origin.`);
  }
  const packageName = packageByKit[origin.kit];
  if (packageName == null) {
    throw new Error(`Cannot convert <${node.tagName}> from unsupported kit "${origin.kit}".`);
  }

  const componentName = origin.name;
  addImport(imports, packageName, componentName);

  const definition = registry[node.tagName];
  const props = { ...definition?.defaults, ...node.props };
  const propText = renderProps(props, node.classList, extraProp);
  const open = propText.length > 0 ? `<${componentName} ${propText}` : `<${componentName}`;

  if (node.kind === "rawSvg" || node.children.length === 0) {
    return `${indent(depth)}${open} />`;
  }

  const children = node.children
    .map((child) => renderNode(child, depth + 1, registry, imports))
    .join("\n");
  return `${indent(depth)}${open}>\n${children}\n${indent(depth)}</${componentName}>`;
}

function renderProps(props: Record<string, unknown>, classList: string[], extraProp?: string): string {
  const entries = Object.entries(props).filter(([, value]) => value != null && typeof value !== "function");
  entries.sort(([left], [right]) => propRank(left) - propRank(right) || left.localeCompare(right));

  const rendered = entries.map(([name, value]) => renderProp(name, value));
  if (classList.length > 0) {
    rendered.push(`classList={${formatExpression(classList)}}`);
  }
  if (extraProp != null) {
    rendered.push(extraProp);
  }
  return rendered.join(" ");
}

function renderFontFamiliesProp(fonts: CollectedFonts): string | undefined {
  const entries = fonts.bundled.map((fontFamily) => {
    const definition = getFontFamilyDefinition(fontFamily);
    return `${formatObjectKey(fontFamily)}: ${definition.exportName}`;
  });
  for (const [fontFamily, faces] of groupTTFFontFaces(fonts.ttf)) {
    const weights = faces.map(
      ({ index, fontFace }) =>
        `${formatObjectKey(String(fontFace.fontWeight))}: getTTFFont(ttfFont${index}, ${JSON.stringify(fontFace.src)})`,
    );
    entries.push(`${formatObjectKey(fontFamily)}: { ${weights.join(", ")} }`);
  }
  return entries.length === 0 ? undefined : `fontFamilies={{ ${entries.join(", ")} }}`;
}

function renderProp(name: string, value: unknown): string {
  if (value === true) {
    return name;
  }
  if (typeof value === "string" && canUseStringAttribute(value)) {
    return `${name}="${escapeAttribute(value)}"`;
  }
  return `${name}={${formatExpression(value)}}`;
}

function propRank(name: string): number {
  if (name === "id") {
    return 0;
  }
  return 1;
}

function canUseStringAttribute(value: string): boolean {
  return !/[<>&"{}\n\r]/.test(value);
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatTextChild(value: string): string {
  if (canUseTextChild(value)) {
    return escapeText(value);
  }
  return `{${formatExpression(value)}}`;
}

function canUseTextChild(value: string): boolean {
  return value.trim() === value && value.length > 0 && !/[<>&{}\n\r]/.test(value);
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatObject(value: RetainedStylesheet, depth: number): string {
  return formatExpression(value, depth);
}

function formatExpression(value: unknown, depth = 0): string {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }
    return `[${value.map((entry) => formatExpression(entry, depth)).join(", ")}]`;
  }
  if (value != null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, entry]) => typeof entry !== "function");
    if (entries.length === 0) {
      return "{}";
    }
    const inner = entries
      .map(([key, entry]) => `${indent(depth + 1)}${formatObjectKey(key)}: ${formatExpression(entry, depth + 1)},`)
      .join("\n");
    return `{\n${inner}\n${indent(depth)}}`;
  }
  return JSON.stringify(value);
}

function formatObjectKey(key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
}

function addImport(imports: Map<string, Set<string>>, packageName: string, name: string) {
  const names = imports.get(packageName) ?? new Set<string>();
  names.add(name);
  imports.set(packageName, names);
}

function indent(depth: number) {
  return "  ".repeat(depth);
}
