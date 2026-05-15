import type { FontFamilies, FontFamilyWeightMap } from "@pmndrs/uikit";
import { z } from "zod";
import type { RetainedStylesheet, UIKitMLAst, UIKitMLNode } from "./types.js";

export const fontFamilyNames = [
  "crimson-text",
  "fira-code",
  "inconsolata",
  "inter",
  "lato",
  "libre-baskerville",
  "merriweather",
  "montserrat",
  "nunito",
  "open-sans",
  "playfair-display",
  "poppins",
  "raleway",
  "roboto",
  "source-code-pro",
  "space-mono",
  "work-sans",
] as const;

export type UIKitMLFontFamily = (typeof fontFamilyNames)[number];

export const fontFamilySchema = z.enum(fontFamilyNames);

const fontFamilyNameSet = new Set<string>(fontFamilyNames);

const fontFamilyDefinitions: Record<
  UIKitMLFontFamily,
  {
    exportName:
      | "crimsonText"
      | "firaCode"
      | "inconsolata"
      | "inter"
      | "lato"
      | "libreBaskerville"
      | "merriweather"
      | "montserrat"
      | "nunito"
      | "openSans"
      | "playfairDisplay"
      | "poppins"
      | "raleway"
      | "roboto"
      | "sourceCodePro"
      | "spaceMono"
      | "workSans";
    importPath: string;
    weights: readonly string[];
  }
> = {
  "crimson-text": {
    exportName: "crimsonText",
    importPath: "@pmndrs/msdfonts/crimson-text",
    weights: ["semi-bold", "bold"],
  },
  "fira-code": {
    exportName: "firaCode",
    importPath: "@pmndrs/msdfonts/fira-code",
    weights: ["light", "medium", "semi-bold", "bold"],
  },
  inconsolata: {
    exportName: "inconsolata",
    importPath: "@pmndrs/msdfonts/inconsolata",
    weights: ["light", "medium", "semi-bold", "bold"],
  },
  inter: {
    exportName: "inter",
    importPath: "@pmndrs/msdfonts/inter",
    weights: ["light", "medium", "semi-bold", "bold"],
  },
  lato: {
    exportName: "lato",
    importPath: "@pmndrs/msdfonts/lato",
    weights: ["light", "bold"],
  },
  "libre-baskerville": {
    exportName: "libreBaskerville",
    importPath: "@pmndrs/msdfonts/libre-baskerville",
    weights: ["bold"],
  },
  merriweather: {
    exportName: "merriweather",
    importPath: "@pmndrs/msdfonts/merriweather",
    weights: ["light", "medium", "semi-bold", "bold"],
  },
  montserrat: {
    exportName: "montserrat",
    importPath: "@pmndrs/msdfonts/montserrat",
    weights: ["light", "medium", "semi-bold", "bold"],
  },
  nunito: {
    exportName: "nunito",
    importPath: "@pmndrs/msdfonts/nunito",
    weights: ["light", "medium", "semi-bold", "bold"],
  },
  "open-sans": {
    exportName: "openSans",
    importPath: "@pmndrs/msdfonts/open-sans",
    weights: ["light", "medium", "semi-bold", "bold"],
  },
  "playfair-display": {
    exportName: "playfairDisplay",
    importPath: "@pmndrs/msdfonts/playfair-display",
    weights: ["medium", "semi-bold", "bold"],
  },
  poppins: {
    exportName: "poppins",
    importPath: "@pmndrs/msdfonts/poppins",
    weights: ["light", "medium", "semi-bold", "bold"],
  },
  raleway: {
    exportName: "raleway",
    importPath: "@pmndrs/msdfonts/raleway",
    weights: ["light", "medium", "semi-bold", "bold"],
  },
  roboto: {
    exportName: "roboto",
    importPath: "@pmndrs/msdfonts/roboto",
    weights: ["light", "medium", "semi-bold", "bold"],
  },
  "source-code-pro": {
    exportName: "sourceCodePro",
    importPath: "@pmndrs/msdfonts/source-code-pro",
    weights: ["light", "medium", "semi-bold", "bold"],
  },
  "space-mono": {
    exportName: "spaceMono",
    importPath: "@pmndrs/msdfonts/space-mono",
    weights: ["bold"],
  },
  "work-sans": {
    exportName: "workSans",
    importPath: "@pmndrs/msdfonts/work-sans",
    weights: ["light", "medium", "semi-bold", "bold"],
  },
};

const fontFamilyLoaders: Record<UIKitMLFontFamily, () => Promise<FontFamilyWeightMap>> = {
  "crimson-text": () => import("@pmndrs/msdfonts/crimson-text").then(({ crimsonText }) => crimsonText),
  "fira-code": () => import("@pmndrs/msdfonts/fira-code").then(({ firaCode }) => firaCode),
  inconsolata: () => import("@pmndrs/msdfonts/inconsolata").then(({ inconsolata }) => inconsolata),
  inter: () => import("@pmndrs/msdfonts/inter").then(({ inter }) => inter),
  lato: () => import("@pmndrs/msdfonts/lato").then(({ lato }) => lato),
  "libre-baskerville": () =>
    import("@pmndrs/msdfonts/libre-baskerville").then(({ libreBaskerville }) => libreBaskerville),
  merriweather: () => import("@pmndrs/msdfonts/merriweather").then(({ merriweather }) => merriweather),
  montserrat: () => import("@pmndrs/msdfonts/montserrat").then(({ montserrat }) => montserrat),
  nunito: () => import("@pmndrs/msdfonts/nunito").then(({ nunito }) => nunito),
  "open-sans": () => import("@pmndrs/msdfonts/open-sans").then(({ openSans }) => openSans),
  "playfair-display": () =>
    import("@pmndrs/msdfonts/playfair-display").then(({ playfairDisplay }) => playfairDisplay),
  poppins: () => import("@pmndrs/msdfonts/poppins").then(({ poppins }) => poppins),
  raleway: () => import("@pmndrs/msdfonts/raleway").then(({ raleway }) => raleway),
  roboto: () => import("@pmndrs/msdfonts/roboto").then(({ roboto }) => roboto),
  "source-code-pro": () => import("@pmndrs/msdfonts/source-code-pro").then(({ sourceCodePro }) => sourceCodePro),
  "space-mono": () => import("@pmndrs/msdfonts/space-mono").then(({ spaceMono }) => spaceMono),
  "work-sans": () => import("@pmndrs/msdfonts/work-sans").then(({ workSans }) => workSans),
};

export function withFontFamilyEnum(schema: z.ZodType): z.ZodType {
  const objectSchema = schema as z.ZodType & {
    safeExtend?: (shape: { fontFamily: z.ZodOptional<typeof fontFamilySchema> }) => z.ZodType;
    extend?: (shape: { fontFamily: z.ZodOptional<typeof fontFamilySchema> }) => z.ZodType;
    unwrap?: () => z.ZodType;
  };
  const unwrapped = objectSchema.unwrap?.();
  if (unwrapped != null && unwrapped !== schema) {
    return withFontFamilyEnum(unwrapped);
  }
  const shape = { fontFamily: fontFamilySchema.optional() };
  return objectSchema.safeExtend?.(shape) ?? objectSchema.extend?.(shape) ?? schema;
}

export function isFontFamilyName(value: unknown): value is UIKitMLFontFamily {
  return typeof value === "string" && fontFamilyNameSet.has(value);
}

export function collectFontFamilies(ast: UIKitMLAst): UIKitMLFontFamily[] {
  const names = new Set<UIKitMLFontFamily>();
  collectNodeFontFamilies(ast.root, names);
  collectStyleFontFamilies(ast.stylesheet, names);
  return [...names].sort();
}

export function createFontFamilies(names: Iterable<UIKitMLFontFamily>): FontFamilies {
  const fontFamilies: FontFamilies = {};
  for (const name of names) {
    const definition = fontFamilyDefinitions[name];
    const loadFamily = fontFamilyLoaders[name];
    fontFamilies[name] = Object.fromEntries(
      definition.weights.map((weight) => [
        weight,
        () => loadFamily().then((family) => family[weight as keyof typeof family]),
      ]),
    ) as FontFamilyWeightMap;
  }
  return fontFamilies;
}

export function addFontFamiliesToProps(
  props: Record<string, unknown>,
  names: readonly UIKitMLFontFamily[],
): Record<string, unknown> {
  if (names.length === 0) {
    return props;
  }
  const existing = isRecord(props.fontFamilies) ? props.fontFamilies : {};
  return {
    ...props,
    fontFamilies: {
      ...existing,
      ...createFontFamilies(names),
    },
  };
}

export function getFontFamilyDefinition(name: UIKitMLFontFamily) {
  return fontFamilyDefinitions[name];
}

function collectNodeFontFamilies(node: UIKitMLNode, names: Set<UIKitMLFontFamily>) {
  if (node.kind === "text") {
    return;
  }
  collectRecordFontFamilies(node.props, names);
  if (node.kind === "element") {
    for (const child of node.children) {
      collectNodeFontFamilies(child, names);
    }
  }
}

function collectStyleFontFamilies(stylesheet: RetainedStylesheet, names: Set<UIKitMLFontFamily>) {
  for (const value of Object.values(stylesheet)) {
    collectRecordFontFamilies(value, names);
  }
}

function collectRecordFontFamilies(record: Record<string, unknown>, names: Set<UIKitMLFontFamily>) {
  if (isFontFamilyName(record.fontFamily)) {
    names.add(record.fontFamily);
  }
  for (const value of Object.values(record)) {
    if (isRecord(value)) {
      collectRecordFontFamilies(value, names);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
