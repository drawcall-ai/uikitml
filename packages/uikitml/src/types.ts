import type { Component, FontWeight, PreferredColorScheme } from "@pmndrs/uikit";
import type { z } from "zod";

export type Position = {
  offset: number;
  line: number;
  column: number;
};

export type SourceRange = {
  start: Position;
  end: Position;
};

export type AttributeRangeInfo = {
  name: SourceRange;
  value?: SourceRange;
  full: SourceRange;
};

export type PropertyProvenance = {
  property: string;
  source: "attribute" | "inline-style" | "stylesheet" | "default";
  range?: SourceRange;
};

export type SourceRangeInfo = {
  element: SourceRange;
  openTag: SourceRange;
  closeTag?: SourceRange;
  tagName: SourceRange;
  attributes: Map<string, AttributeRangeInfo>;
  text?: SourceRange;
  sourceTag: string;
  textValue?: string;
  provenance: Map<string, PropertyProvenance[]>;
};

export type StylesheetRangeInfo = {
  blocks: SourceRange[];
  rules: Array<{
    selector: SourceRange;
    declarations: Map<string, SourceRange>;
  }>;
};

export type RetainedStylesheet = Record<string, Record<string, unknown>>;

export type UIKitMLFontFace = {
  fontFamily: string;
  src: string;
  fontWeight: FontWeight;
};

export type ComponentOrigin = {
  kit: string;
  name: string;
};

export type UIKitMLTextNode = {
  kind: "text";
  value: string;
  meta: SourceRangeInfo;
};

export type UIKitMLElementNode = {
  kind: "element";
  tagName: string;
  origin?: ComponentOrigin;
  props: Record<string, unknown>;
  classList: string[];
  children: UIKitMLNode[];
  meta: SourceRangeInfo;
};

export type UIKitMLRawSvgNode = {
  kind: "rawSvg";
  tagName: "svg";
  origin?: ComponentOrigin;
  raw: string;
  props: Record<string, unknown>;
  classList: string[];
  meta: SourceRangeInfo;
};

export type UIKitMLNode = UIKitMLElementNode | UIKitMLRawSvgNode | UIKitMLTextNode;

export type UIKitMLAst = {
  root: UIKitMLNode;
  stylesheet: RetainedStylesheet;
  stylesheetRanges: StylesheetRangeInfo;
  fontFaces?: UIKitMLFontFace[];
  metadata: {
    preferredColorScheme?: PreferredColorScheme;
  };
};

export type ComponentConstructor = new (
  properties?: Record<string, unknown>,
  initialClasses?: Array<string | Record<string, unknown>>,
  config?: Record<string, unknown>,
) => Component;

export type ComponentDefinition = {
  component: ComponentConstructor;
  schema: z.ZodType;
  canHaveChildren: boolean;
  defaults?: Record<string, unknown>;
  origin?: ComponentOrigin;
};

export type ComponentSet = Record<string, ComponentDefinition>;

export type ParseOptions = {
  componentSets?: ComponentSet[];
  includeHtmlComponentSet?: boolean;
  validate?: boolean;
};

export type InstantiateOptions = {
  componentSets?: ComponentSet[];
  includeHtmlComponentSet?: boolean;
  preferredColorScheme?: PreferredColorScheme;
};

export type UIKitMLErrorCode =
  | "syntax"
  | "unknown-component"
  | "unknown-property"
  | "invalid-property-name"
  | "invalid-property-value"
  | "invalid-metadata"
  | "invalid-style-declaration"
  | "children-not-allowed"
  | "multiple-roots"
  | "missing-root"
  | "invalid-stylesheet";

export type UIKitMLError = {
  code: UIKitMLErrorCode;
  message: string;
  range?: SourceRange;
  details?: unknown;
};

export type ParseSuccess = {
  success: true;
  ast: UIKitMLAst;
};

export type ParseFailure = {
  success: false;
  errors: UIKitMLError[];
};

export type ParseResult = ParseSuccess | ParseFailure;
