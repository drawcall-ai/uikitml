import { computed } from "@preact/signals-core";
import { setPreferredColorScheme, Text, type Component } from "@pmndrs/uikit";
import { resolveComponentRegistry } from "./component-sets.js";
import { addFontFamiliesToProps, collectFonts, type CollectedFonts } from "./fonts.js";
import type {
  InstantiateOptions,
  UIKitMLAst,
  UIKitMLNode,
} from "./types.js";

export function instantiate(ast: UIKitMLAst, options: InstantiateOptions = {}): Component {
  const preferredColorScheme = options.preferredColorScheme ?? ast.metadata.preferredColorScheme;
  if (preferredColorScheme != null) {
    setPreferredColorScheme(preferredColorScheme);
  }
  const registry = resolveComponentRegistry(options.componentSets, options.includeHtmlComponentSet);
  return instantiateNode(ast.root, registry, collectFonts(ast));
}

function instantiateNode(
  node: UIKitMLNode,
  registry: ReturnType<typeof resolveComponentRegistry>,
  fonts?: CollectedFonts,
): Component {
  if (node.kind === "text") {
    return createTextComponent(node.value);
  }

  const definition = registry[node.tagName];
  if (definition == null) {
    throw new Error(`Unknown component <${node.tagName}>.`);
  }

  const props = { ...definition.defaults, ...node.props };
  const component = new definition.component(
    fonts == null ? props : addFontFamiliesToProps(props, fonts),
    node.classList,
  );

  if (node.kind === "element") {
    for (const child of node.children) {
      component.add(instantiateNode(child, registry));
    }
  }

  return component;
}

function createTextComponent(value: string): Text {
  let text: Text;
  text = new Text({
    text: computed((): unknown => {
      const parentText: unknown = (text.parentContainer.value?.properties.value as { text?: unknown } | undefined)?.text;
      return parentText ?? value;
    }),
    alignSelf: "stretch",
    flexGrow: 1,
  });
  return text;
}
