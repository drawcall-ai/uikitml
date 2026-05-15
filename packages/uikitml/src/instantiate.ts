import { computed } from "@preact/signals-core";
import { setPreferredColorScheme, Text } from "@pmndrs/uikit";
import { resolveComponentRegistry } from "./component-sets.js";
import { addFontFamiliesToProps, collectFontFamilies, type UIKitMLFontFamily } from "./fonts.js";
import type { InstantiateOptions, UIKitComponent, UIKitMLAst, UIKitMLNode } from "./types.js";

export function instantiate(ast: UIKitMLAst, options: InstantiateOptions = {}): UIKitComponent {
  const preferredColorScheme = options.preferredColorScheme ?? ast.metadata.preferredColorScheme;
  if (preferredColorScheme != null) {
    setPreferredColorScheme(preferredColorScheme);
  }
  const registry = resolveComponentRegistry(options.componentSets, options.includeHtmlComponentSet);
  return instantiateNode(ast.root, registry, collectFontFamilies(ast), true);
}

function instantiateNode(
  node: UIKitMLNode,
  registry: ReturnType<typeof resolveComponentRegistry>,
  fontFamilies: readonly UIKitMLFontFamily[],
  isRoot = false,
): UIKitComponent {
  if (node.kind === "text") {
    return createTextComponent(node.value);
  }

  const definition = registry[node.tagName];
  if (definition == null) {
    throw new Error(`Unknown component <${node.tagName}>.`);
  }

  const props = { ...definition.defaults, ...node.props };
  const component = new definition.component(
    isRoot ? addFontFamiliesToProps(props, fontFamilies) : props,
    node.classList,
  );

  if (node.kind === "element") {
    for (const child of node.children) {
      component.add(instantiateNode(child, registry, fontFamilies));
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
