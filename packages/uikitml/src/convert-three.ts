import { resolveComponentRegistry } from "./component-sets.js";
import {
  collectFontFamilies,
  getFontFamilyDefinition,
  type UIKitMLFontFamily,
} from "./fonts.js";
import type { ComponentSet, PreferredColorScheme, RetainedStylesheet, UIKitMLAst, UIKitMLNode } from "./types.js";

export type ConvertThreeOptions = {
  functionName: string;
  componentSets?: ComponentSet[];
  preferredColorScheme?: PreferredColorScheme;
};

const packageByKit: Record<string, string> = {
  html: "@pmndrs/uikit",
  lucide: "@pmndrs/uikit-lucide",
  horizon: "@pmndrs/uikit-horizon",
};

export function convertToThree(ast: UIKitMLAst, options: ConvertThreeOptions): string {
  const registry = resolveComponentRegistry(options.componentSets);
  const imports = new Map<string, Set<string>>();
  const typeImports = new Map<string, Set<string>>();
  const stylesheet = Object.keys(ast.stylesheet).length > 0 ? ast.stylesheet : undefined;
  const preferredColorScheme = options.preferredColorScheme ?? ast.metadata.preferredColorScheme;
  const fontFamilies = collectFontFamilies(ast);
  const state: RenderState = { nextId: 1, hasText: false };
  const body: string[] = [];

  const rootName = renderNode(ast.root, body, registry, imports, fontFamilies, state, true);

  addImport(imports, "@pmndrs/uikit", "reversePainterSortStable");
  addTypeImport(typeImports, "three", "WebGLRenderer");

  if (preferredColorScheme != null) {
    addImport(imports, "@pmndrs/uikit", "setPreferredColorScheme");
  }
  if (stylesheet != null) {
    addImport(imports, "@pmndrs/uikit", "StyleSheet");
  }
  if (state.hasText) {
    addImport(imports, "@pmndrs/uikit", "Text");
    addImport(imports, "@preact/signals-core", "computed");
  }
  for (const fontFamily of fontFamilies) {
    const definition = getFontFamilyDefinition(fontFamily);
    addImport(imports, definition.importPath, definition.exportName);
  }

  const lines: string[] = [];
  for (const [packageName, names] of [...imports.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    lines.push(`import { ${[...names].sort().join(", ")} } from "${packageName}";`);
  }
  for (const [packageName, names] of [...typeImports.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    lines.push(`import type { ${[...names].sort().join(", ")} } from "${packageName}";`);
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

  lines.push(`export function ${options.functionName}() {`);
  lines.push(...body);
  lines.push(`  return ${rootName};`);
  lines.push("}");
  lines.push("");
  lines.push("export function configureUIKitRenderer(renderer: WebGLRenderer) {");
  lines.push("  renderer.localClippingEnabled = true;");
  lines.push("  renderer.setTransparentSort(reversePainterSortStable);");
  lines.push("}");
  lines.push("");

  if (state.hasText) {
    lines.push("function createTextComponent(value: string): Text {");
    lines.push("  let text: Text;");
    lines.push("  text = new Text({");
    lines.push("    text: computed((): unknown => {");
    lines.push("      const parentText: unknown = (text.parentContainer.value?.properties.value as { text?: unknown } | undefined)?.text;");
    lines.push("      return parentText ?? value;");
    lines.push("    }),");
    lines.push("    alignSelf: \"stretch\",");
    lines.push("    flexGrow: 1,");
    lines.push("  });");
    lines.push("  return text;");
    lines.push("}");
    lines.push("");
  }

  return lines.join("\n");
}

type RenderState = {
  nextId: number;
  hasText: boolean;
};

function renderNode(
  node: UIKitMLNode,
  lines: string[],
  registry: ReturnType<typeof resolveComponentRegistry>,
  imports: Map<string, Set<string>>,
  fontFamilies: readonly UIKitMLFontFamily[],
  state: RenderState,
  isRoot = false,
): string {
  if (node.kind === "text") {
    state.hasText = true;
    const variableName = isRoot ? "root" : `text${state.nextId++}`;
    lines.push(`${indent(1)}const ${variableName} = createTextComponent(${formatExpression(node.value)});`);
    return variableName;
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

  const variableName = isRoot ? "root" : `element${state.nextId++}`;
  const definition = registry[node.tagName];
  const props = { ...definition?.defaults, ...node.props };
  const args = renderConstructorArgs(
    props,
    node.classList,
    isRoot && fontFamilies.length > 0 ? renderFontFamiliesProp(fontFamilies) : undefined,
  );
  lines.push(`${indent(1)}const ${variableName} = new ${componentName}(${args});`);

  if (node.kind === "element") {
    for (const child of node.children) {
      const childName = renderNode(child, lines, registry, imports, fontFamilies, state);
      lines.push(`${indent(1)}${variableName}.add(${childName});`);
    }
  }

  return variableName;
}

function renderConstructorArgs(props: Record<string, unknown>, classList: string[], extraProp?: string): string {
  const renderedProps = renderProps(props, extraProp);
  if (classList.length === 0) {
    return renderedProps;
  }
  return `${renderedProps}, ${formatExpression(classList)}`;
}

function renderProps(props: Record<string, unknown>, extraProp?: string): string {
  const entries = Object.entries(props).filter(([, value]) => value != null && typeof value !== "function");
  entries.sort(([left], [right]) => propRank(left) - propRank(right) || left.localeCompare(right));

  const rendered = entries.map(([key, value]) => `${formatObjectKey(key)}: ${formatExpression(value, 1)}`);
  if (extraProp != null) {
    rendered.push(extraProp);
  }
  if (rendered.length === 0) {
    return "{}";
  }
  return `{\n${rendered.map((entry) => `${indent(2)}${entry},`).join("\n")}\n${indent(1)}}`;
}

function renderFontFamiliesProp(fontFamilies: readonly UIKitMLFontFamily[]): string {
  const entries = fontFamilies.map((fontFamily) => {
    const definition = getFontFamilyDefinition(fontFamily);
    return `${formatObjectKey(fontFamily)}: ${definition.exportName}`;
  });
  return `fontFamilies: { ${entries.join(", ")} }`;
}

function propRank(name: string): number {
  if (name === "id") {
    return 0;
  }
  return 1;
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

function addTypeImport(imports: Map<string, Set<string>>, packageName: string, name: string) {
  const names = imports.get(packageName) ?? new Set<string>();
  names.add(name);
  imports.set(packageName, names);
}

function indent(depth: number) {
  return "  ".repeat(depth);
}
