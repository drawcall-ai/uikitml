import { TTFLoader, type FontFamilies, type FontFamilyWeightMap, type MSDFResult } from "@pmndrs/uikit";
import { z } from "zod";
import { isWoff2FontSource } from "./font-source.js";
import type { RetainedStylesheet, UIKitMLAst, UIKitMLFontFace, UIKitMLNode } from "./types.js";

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

export type CollectedFonts = {
  bundled: UIKitMLFontFamily[];
  ttf: UIKitMLFontFace[];
};

type IndexedTTFFontFace = {
  fontFace: UIKitMLFontFace;
  index: number;
};

const fontFamilyNameSet = new Set<string>(fontFamilyNames);
const ttfLoads = new Map<string, Promise<MSDFResult>>();

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
    weights: readonly (keyof FontFamilyWeightMap)[];
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

export function withFontFamilyEnum(
  schema: z.ZodType,
  declaredFontFamilyNames: Iterable<string> = [],
): z.ZodType {
  const objectSchema = unwrapSchema(schema);
  if (objectSchema == null) {
    return schema;
  }
  const declaredNames = new Set(declaredFontFamilyNames);
  const schemaForFontFamily =
    declaredNames.size === 0
      ? fontFamilySchema
      : z.string().refine(
          (value) => isFontFamilyName(value) || declaredNames.has(value),
          "Expected a bundled or @font-face font family",
        );
  const shape = { fontFamily: schemaForFontFamily.optional() };
  return objectSchema.safeExtend(shape);
}

export function withDeclaredFontFamilyEnum(
  schema: z.ZodType,
  declaredFontFamilyNames: Iterable<string>,
): z.ZodType {
  const declaredNames = new Set(declaredFontFamilyNames);
  if (declaredNames.size === 0) {
    return schema;
  }
  const objectSchema = unwrapSchema(schema);
  return objectSchema?.shape.fontFamily == null
    ? schema
    : withFontFamilyEnum(objectSchema, declaredNames);
}

function unwrapSchema(schema: z.ZodType): z.ZodObject | undefined {
  if (schema instanceof z.ZodObject) {
    return schema;
  }
  if (!(schema instanceof z.ZodLazy)) {
    return undefined;
  }
  const unwrapped = schema.unwrap();
  return unwrapped instanceof z.ZodObject ? unwrapped : undefined;
}

export function isFontFamilyName(value: unknown): value is UIKitMLFontFamily {
  return typeof value === "string" && fontFamilyNameSet.has(value);
}

export function collectFonts(ast: UIKitMLAst): CollectedFonts {
  const usedNames = collectUsedFontFamilyNames(ast);
  const ttfNames = new Set((ast.fontFaces ?? []).map(({ fontFamily }) => fontFamily));
  const effectiveFaces = new Map<string, UIKitMLFontFace>();
  for (const fontFace of ast.fontFaces ?? []) {
    if (!usedNames.has(fontFace.fontFamily)) {
      continue;
    }
    effectiveFaces.set(`${fontFace.fontFamily}\0${fontFace.fontWeight}`, fontFace);
  }
  return {
    bundled: fontFamilyNames.filter((name) => usedNames.has(name) && !ttfNames.has(name)),
    ttf: [...effectiveFaces.values()],
  };
}

export function groupTTFFontFaces(
  fontFaces: readonly UIKitMLFontFace[],
): Map<string, IndexedTTFFontFace[]> {
  const families = new Map<string, IndexedTTFFontFace[]>();
  for (const [index, fontFace] of fontFaces.entries()) {
    const family = families.get(fontFace.fontFamily) ?? [];
    family.push({ fontFace, index });
    families.set(fontFace.fontFamily, family);
  }
  return families;
}

export async function preloadTTFFontFaces(
  fontFaces: readonly UIKitMLFontFace[],
): Promise<void> {
  // Concurrent MSDF generation can produce incomplete atlases.
  for (const fontFace of fontFaces) {
    const loaded = await loadTTF(fontFace.src);
    getTTFFont(loaded, fontFace.src);
  }
}

function collectUsedFontFamilyNames(ast: UIKitMLAst): Set<string> {
  const names = new Set<string>();
  collectNodeFontFamilies(ast.root, names);
  collectStyleFontFamilies(ast.stylesheet, names);
  return names;
}

export function createFontFamilies(fonts: CollectedFonts): FontFamilies {
  const fontFamilies: FontFamilies = {};
  for (const name of fonts.bundled) {
    const definition = fontFamilyDefinitions[name];
    const loadFamily = fontFamilyLoaders[name];
    fontFamilies[name] = Object.fromEntries(
      definition.weights.map((weight) => [
        weight,
        () =>
          loadFamily().then((family) => {
            const source = family[weight];
            if (source == null) {
              throw new Error(`Bundled font "${name}" has no "${weight}" weight.`);
            }
            return typeof source === "function" ? source() : source;
          }),
      ]),
    );
  }
  for (const fontFace of fonts.ttf) {
    fontFamilies[fontFace.fontFamily] = {
      ...fontFamilies[fontFace.fontFamily],
      [fontFace.fontWeight]: () =>
        loadTTF(fontFace.src).then((loaded) => getTTFFont(loaded, fontFace.src)),
    };
  }
  return fontFamilies;
}

export function addFontFamiliesToProps(
  props: Record<string, unknown>,
  fonts: CollectedFonts,
): Record<string, unknown> {
  if (fonts.bundled.length === 0 && fonts.ttf.length === 0) {
    return props;
  }
  const existing = isRecord(props.fontFamilies) ? props.fontFamilies : {};
  return {
    ...props,
    fontFamilies: {
      ...existing,
      ...createFontFamilies(fonts),
    },
  };
}

export function getFontFamilyDefinition(name: UIKitMLFontFamily) {
  return fontFamilyDefinitions[name];
}

function loadTTF(src: string): Promise<MSDFResult> {
  const existing = ttfLoads.get(src);
  if (existing != null) {
    return existing;
  }
  const loaded = loadFontSource(src);
  ttfLoads.set(src, loaded);
  return loaded;
}

async function loadFontSource(src: string): Promise<MSDFResult> {
  const url = await resolveFontSource(src);
  try {
    return await new TTFLoader().loadAsync(url);
  } finally {
    if (url !== src) {
      URL.revokeObjectURL(url);
    }
  }
}

async function resolveFontSource(src: string): Promise<string> {
  if (!isWoff2FontSource(src)) {
    return src;
  }
  const decompress = (await import("woff2-encoder/decompress")).default;
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Failed to load font "${src}" (${response.status}).`);
  }
  const ttf = await decompress(await response.arrayBuffer());
  return fontBytesToObjectUrl(ttf);
}

function fontBytesToObjectUrl(ttf: Uint8Array): string {
  const bytes = new Uint8Array(ttf.byteLength);
  bytes.set(ttf);
  return URL.createObjectURL(new Blob([bytes.buffer], { type: "font/ttf" }));
}

function getTTFFont(fontFamilies: MSDFResult, src: string) {
  const family = Object.values(fontFamilies)[0];
  const font = family == null ? undefined : Object.values(family)[0];
  if (font == null) {
    throw new Error(`Font file "${src}" did not contain a font face.`);
  }
  return font;
}

function collectNodeFontFamilies(node: UIKitMLNode, names: Set<string>) {
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

function collectStyleFontFamilies(stylesheet: RetainedStylesheet, names: Set<string>) {
  for (const value of Object.values(stylesheet)) {
    collectRecordFontFamilies(value, names);
  }
}

function collectRecordFontFamilies(record: Record<string, unknown>, names: Set<string>) {
  if (typeof record.fontFamily === "string") {
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
