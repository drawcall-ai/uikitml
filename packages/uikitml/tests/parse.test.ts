import { Container, getPreferredColorScheme, Image, setPreferredColorScheme } from "@pmndrs/uikit";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  convertToReact,
  convertToThree,
  generate,
  htmlComponentSet,
  instantiate,
  parse,
  type ComponentConstructor,
  type ComponentSet,
} from "../src/index.js";

function inputProperties(component: unknown): Record<string, unknown> {
  return ((component as { inputProperties?: Record<string, unknown> }).inputProperties ?? {});
}

function classList(component: unknown): string[] {
  return (((component as { classList?: { list?: string[] } }).classList?.list ?? []).filter(Boolean));
}

function expectStyleDeclarationError(
  declaration: string,
  code: string,
  inlineMessage: string,
  stylesheetMessage: string,
) {
  const inline = parse(`<div style="${declaration}" />`);

  expect(inline.success).toBe(false);
  if (!inline.success) {
    expect(inline.errors[0]?.code).toBe(code);
    expect(inline.errors[0]?.message).toBe(inlineMessage);
  }

  const stylesheet = parse(`<style>.card { ${declaration} }</style><div />`);

  expect(stylesheet.success).toBe(false);
  if (!stylesheet.success) {
    expect(stylesheet.errors[0]?.code).toBe(code);
    expect(stylesheet.errors[0]?.message).toBe(stylesheetMessage);
  }
}

describe("parse", () => {
  it("builds an AST with metadata from a simple document", () => {
    const result = parse(`
      <style>
        .card { background-color: red; }
      </style>
      <div id="root" class="card card" font-size="18" visibility="hidden">
        Hello &amp; friends
      </div>
    `);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.ast.root.kind).toBe("element");
    if (result.ast.root.kind !== "element") {
      return;
    }
    expect(result.ast.root.tagName).toBe("div");
    expect(result.ast.root.props).toMatchObject({
      id: "root",
      fontSize: "18",
      visibility: "hidden",
    });
    expect(result.ast.root.classList).toEqual(["card", "card"]);
    expect(result.ast.root.children).toHaveLength(1);
    expect(result.ast.root.meta.sourceTag).toBe("div");
    expect(result.ast.stylesheet.card).toMatchObject({ backgroundColor: "red" });
  });

  it("rejects unknown components by default", () => {
    const result = parse("<Unknown />");

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.errors.map((error) => error.code)).toContain("unknown-component");
  });

  it("treats component tag names as exact and case-sensitive", () => {
    const result = parse("<DIV />");

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.errors[0]?.code).toBe("unknown-component");
  });

  it("rejects camelCase property names in element markup", () => {
    const result = parse('<div backgroundColor="red" />');

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.errors[0]?.code).toBe("invalid-property-name");
    expect(result.errors[0]?.message).toBe(
      'Invalid property name "backgroundColor" on element "<div>". Use "background-color".',
    );
  });

  it("rejects camelCase property names in style declarations", () => {
    expectStyleDeclarationError(
      "backgroundColor: red;",
      "invalid-property-name",
      'Invalid property name "backgroundColor" on element "<div>". Use "background-color".',
      'Invalid property name "backgroundColor" on selector ".card". Use "background-color".',
    );
  });

  it("uses the same grammar for inline and stylesheet declarations", () => {
    expectStyleDeclarationError(
      "background-color red;",
      "invalid-style-declaration",
      'Invalid style declaration "background-color red" on element "<div>". Expected "property: value".',
      'Invalid style declaration "background-color red" on selector ".card". Expected "property: value".',
    );
  });

  it("validates inline and stylesheet declaration values the same way", () => {
    expectStyleDeclarationError(
      "opacity: loud;",
      "invalid-property-value",
      'Invalid value for property "opacity" on element "<div>": value "loud". Expected number, number string, percentage string, signal-like object, or "initial".',
      'Invalid value for property "opacity" on selector ".card": value "loud". Expected number, number string, percentage string, signal-like object, or "initial".',
    );
  });

  it("validates inline and stylesheet declaration properties the same way", () => {
    expectStyleDeclarationError(
      "made-up: 1;",
      "unknown-property",
      'Unknown property "madeUp" on element "<div>".',
      'Unknown property "madeUp" on selector ".card".',
    );
  });

  it("validates unknown properties through schemas", () => {
    const result = parse('<div made-up="1" />');

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.errors.map((error) => error.code)).toContain("unknown-property");
  });

  it("validates font-family against bundled MSDF font names", () => {
    const valid = parse(`
      <style>
        .title { font-family: open-sans; }
      </style>
      <div font-family="roboto" class="title">Ready</div>
    `);

    expect(valid.success).toBe(true);

    const invalidAttribute = parse('<div font-family="comic-sans" />');
    expect(invalidAttribute.success).toBe(false);
    if (!invalidAttribute.success) {
      expect(invalidAttribute.errors[0]?.code).toBe("invalid-property-value");
      expect(invalidAttribute.errors[0]?.message).toContain('property "fontFamily"');
    }

    const invalidStylesheet = parse("<style>.bad { font-family: comic-sans; }</style><div />");
    expect(invalidStylesheet.success).toBe(false);
    if (!invalidStylesheet.success) {
      expect(invalidStylesheet.errors[0]?.code).toBe("invalid-property-value");
      expect(invalidStylesheet.errors[0]?.message).toContain('property "fontFamily"');
    }
  });

  it("supports CSS @font-face declarations for TTF font families", () => {
    const result = parse(`
      <style>
        .title {
          font-family: "Brand Sans";
          font-weight: 700;
        }
        @font-face {
          font-family: "Brand Sans";
          src: local("Brand Sans"), url("/fonts/BrandSans-Bold.ttf?v=2") format("truetype");
          font-weight: 700;
        }
      </style>
      <div class="title">Ready</div>
    `);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.ast.fontFaces).toEqual([
      {
        fontFamily: "Brand Sans",
        src: "/fonts/BrandSans-Bold.ttf?v=2",
        fontWeight: "700",
      },
    ]);
    expect(result.ast.stylesheet.title).toMatchObject({
      fontFamily: "Brand Sans",
      fontWeight: "700",
    });
    expect(generate(result.ast)).toContain(
      '@font-face { font-family: "Brand Sans"; src: url("/fonts/BrandSans-Bold.ttf?v=2"); font-weight: 700 }',
    );
  });

  it("rejects invalid TTF @font-face sources and undeclared custom families", () => {
    const invalidSource = parse(`
      <style>
        @font-face { font-family: "Brand Sans"; src: url("/fonts/BrandSans.woff2"); }
      </style>
      <div font-family="Brand Sans" />
    `);

    expect(invalidSource.success).toBe(false);
    if (!invalidSource.success) {
      expect(invalidSource.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "invalid-stylesheet",
            message: '@font-face "src" must contain a URL to a .ttf file.',
          }),
        ]),
      );
    }

    const undeclared = parse('<div font-family="Brand Sans" />');
    expect(undeclared.success).toBe(false);
    if (!undeclared.success) {
      expect(undeclared.errors[0]?.code).toBe("invalid-property-value");
    }

    class Badge extends Container {}
    const unsupportedProperty = parse(
      `
        <style>
          @font-face {
            font-family: "Brand Sans";
            src: url("/fonts/BrandSans-Regular.ttf");
          }
        </style>
        <Badge font-family="Brand Sans" />
      `,
      {
        componentSets: [
          {
            Badge: {
              component: Badge as unknown as ComponentConstructor,
              schema: z.object({}).strict(),
              canHaveChildren: false,
            },
          },
        ],
      },
    );
    expect(unsupportedProperty.success).toBe(false);
    if (!unsupportedProperty.success) {
      expect(unsupportedProperty.errors[0]?.code).toBe("unknown-property");
    }
  });

  it("reports invalid property names and values with fixable messages", () => {
    class Badge extends Container {}
    const components: ComponentSet = {
      Badge: {
        component: Badge as unknown as ComponentConstructor,
        schema: z.object({ count: z.number().optional() }).strict(),
        canHaveChildren: false,
      },
    };

    const invalidValue = parse('<Badge count="2" />', { componentSets: [components] });
    expect(invalidValue.success).toBe(false);
    if (!invalidValue.success) {
      expect(invalidValue.errors[0]?.message).toBe(
        'Invalid value for property "count" on element "<Badge>": value "2". Expected number.',
      );
    }

    const unknownProperty = parse('<Badge tone="loud" />', { componentSets: [components] });
    expect(unknownProperty.success).toBe(false);
    if (!unknownProperty.success) {
      expect(unknownProperty.errors[0]?.code).toBe("unknown-property");
      expect(unknownProperty.errors[0]?.message).toBe(
        'Unknown property "tone" on element "<Badge>".',
      );
    }
  });

  it("reports invalid stylesheet properties with fixable messages", () => {
    const result = parse("<style>.bad { made-up: 1; }</style><div />");

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.errors[0]?.code).toBe("unknown-property");
    expect(result.errors[0]?.message).toBe(
      'Unknown property "madeUp" on selector ".bad".',
    );
  });

  it("reports invalid stylesheet values with selector targets", () => {
    const result = parse('<style>.bad { opacity: loud; }</style><div />');

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.errors[0]?.message).toBe(
      'Invalid value for property "opacity" on selector ".bad": value "loud". Expected number, number string, percentage string, signal-like object, or "initial".',
    );
  });

  it("reports union validation failures as one expected-alternatives error", () => {
    class Box extends Container {}
    const components: ComponentSet = {
      Box: {
        component: Box as unknown as ComponentConstructor,
        schema: z.object({ size: z.union([z.number(), z.literal("auto")]).optional() }).strict(),
        canHaveChildren: false,
      },
    };

    const result = parse('<Box size="huge" />', { componentSets: [components] });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toBe(
      'Invalid value for property "size" on element "<Box>": value "huge". Expected number or "auto".',
    );
  });

  it("rejects children on components that cannot have children", () => {
    const result = parse('<img src="photo.png">caption</img>');

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.errors.map((error) => error.code)).toContain("children-not-allowed");
  });

  it("requires exactly one root component while allowing style blocks anywhere", () => {
    const result = parse("<style>.x { color: red; }</style><div /><button />");

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.errors.map((error) => error.code)).toContain("multiple-roots");
  });

  it("parses preferred color scheme metadata without treating it as a root", () => {
    const result = parse('<meta preferred-color-scheme="dark" /><div />');

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.ast.metadata.preferredColorScheme).toBe("dark");
    expect(generate(result.ast)).toBe('<meta preferred-color-scheme="dark" />\n<div />');
  });

  it("rejects invalid preferred color scheme metadata", () => {
    const result = parse('<meta preferred-color-scheme="sepia" /><div />');

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.errors[0]?.code).toBe("invalid-metadata");
  });

  it("allows UIKit input aliases inside stylesheets", () => {
    const result = parse(`
      <style>
        .card { border-radius: 4; opacity: 50%; }
      </style>
      <div class="card" />
    `);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.ast.stylesheet.card).toMatchObject({
      borderRadius: "4",
      opacity: "50%",
    });
  });

  it("retains UIKit dark conditional styles", () => {
    const result = parse('<style>.heading:dark { color: white; }</style><div />');

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.ast.stylesheet.heading).toMatchObject({
      dark: { color: "white" },
    });
    expect(generate(result.ast)).toContain(".heading:dark { color: white }");
  });

  it("retains UIKit stylesheet layer sections", () => {
    const result = parse(`
      <style>
        .field:placeholder-style { color: gray; }
        .field:important { opacity: 1; }
      </style>
      <div />
    `);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.ast.stylesheet.field).toMatchObject({
      placeholderStyle: { color: "gray" },
      important: { opacity: "1" },
    });
    expect(generate(result.ast)).toContain(".field:placeholder-style { color: gray }");
    expect(generate(result.ast)).toContain(".field:important { opacity: 1 }");
  });

  it("reports unsupported stylesheet conditionals", () => {
    const result = parse('<style>.heading:pressed { color: white; }</style><div />');

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.errors[0]?.code).toBe("invalid-stylesheet");
    expect(result.errors[0]?.message).toBe(
      'Unsupported stylesheet section "pressed" on selector ".heading:pressed".',
    );
  });

  it("reports malformed stylesheet text that cannot be parsed as rules", () => {
    const result = parse("<style>.good { color: red; } .bad color: blue; </style><div />");

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.errors[0]?.code).toBe("invalid-stylesheet");
    expect(result.errors[0]?.message).toBe(
      "Invalid stylesheet syntax. Expected a selector followed by a declaration block.",
    );
  });

  it("requires explicit closing or self-closing syntax", () => {
    const result = parse('<img src="photo.png">');

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.errors.map((error) => error.code)).toContain("syntax");
  });

  it("allows component sets to extend and override html built-ins", () => {
    class Button extends Container {}
    const components: ComponentSet = {
      Button: {
        component: Button as unknown as ComponentConstructor,
        schema: z.object({ variant: z.string().optional() }).strict(),
        canHaveChildren: true,
      },
      div: {
        component: Image as unknown as ComponentConstructor,
        schema: z.object({ src: z.string() }).strict(),
        canHaveChildren: false,
      },
    };

    const custom = parse('<Button variant="primary">Save</Button>', { componentSets: [components] });
    expect(custom.success).toBe(true);
    if (custom.success) {
      expect(instantiate(custom.ast, { componentSets: [components] })).toBeInstanceOf(Button);
    }

    const overridden = parse('<div src="photo.png" />', { componentSets: [components] });
    expect(overridden.success).toBe(true);
    if (overridden.success) {
      expect(instantiate(overridden.ast, { componentSets: [components] })).toBeInstanceOf(Image);
    }
  });

  it("can disable the html component set", () => {
    const result = parse("<div />", { includeHtmlComponentSet: false });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.errors.map((error) => error.code)).toContain("unknown-component");
  });

  it("parses without instantiating UIKit components", () => {
    const result = parse('<style>.card { opacity: 50%; }</style><div class="card"><span>Ready</span></div>');

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.ast.root.kind).toBe("element");
    expect(result.ast.stylesheet.card).toMatchObject({ opacity: "50%" });
  });

  it("stores component origin while keeping defaults out of authored AST props", () => {
    const result = parse("<h1>Hello</h1>");

    expect(result.success).toBe(true);
    if (!result.success || result.ast.root.kind !== "element") {
      return;
    }

    expect(result.ast.root.origin).toEqual({ kit: "html", name: "Container" });
    expect(result.ast.root.props).not.toHaveProperty("fontSize");

    const component = instantiate(result.ast);
    expect(inputProperties(component)).toMatchObject({
      fontSize: 32,
      fontWeight: "bold",
    });
  });

  it("applies preferred color scheme when instantiating", () => {
    setPreferredColorScheme("system");
    const result = parse('<meta preferred-color-scheme="dark" /><div />');

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    instantiate(result.ast);
    expect(getPreferredColorScheme()).toBe("dark");
    setPreferredColorScheme("system");
  });

  it("emits preferred color scheme setup when converting to React", () => {
    const result = parse('<meta preferred-color-scheme="dark" /><div class="card">Ready</div>');

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(convertToReact(result.ast, { componentName: "UI" })).toContain(
      'setPreferredColorScheme("dark");',
    );
  });

  it("converts to vanilla Three.js uikit code", () => {
    const result = parse(`
      <meta preferred-color-scheme="dark" />
      <style>
        .card { background-color: blue; }
      </style>
      <div class="card" size-x="8" size-y="4">
        <h1>Hello</h1>
      </div>
    `);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    const three = convertToThree(result.ast, { functionName: "createCard" });

    expect(three).toContain('import { computed } from "@preact/signals-core";');
    expect(three).toContain('import { Container, StyleSheet, Text, reversePainterSortStable, setPreferredColorScheme } from "@pmndrs/uikit";');
    expect(three).toContain('import type { WebGLRenderer } from "three";');
    expect(three).toContain('setPreferredColorScheme("dark");');
    expect(three).toContain("Object.assign(StyleSheet,");
    expect(three).toContain("export function createCard() {");
    expect(three).toContain("  const root = new Container(");
    expect(three).toContain("  const element1 = new Container(");
    expect(three).toContain('  const text2 = createTextComponent("Hello");');
    expect(three).toContain("  root.add(element1);");
    expect(three).toContain("export function configureUIKitRenderer(renderer: WebGLRenderer) {");
    expect(three).toContain("  renderer.localClippingEnabled = true;");
    expect(three).toContain("  renderer.setTransparentSort(reversePainterSortStable);");
  });

  it("injects font family data for interpreted and converted documents", () => {
    const result = parse(`
      <style>
        .label { font-family: open-sans; }
      </style>
      <div font-family="roboto">Ready</div>
    `);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    const component = instantiate(result.ast);
    expect(inputProperties(component).fontFamilies).toMatchObject({
      "open-sans": {
        light: expect.any(Function),
        medium: expect.any(Function),
        "semi-bold": expect.any(Function),
        bold: expect.any(Function),
      },
      roboto: {
        light: expect.any(Function),
        medium: expect.any(Function),
        "semi-bold": expect.any(Function),
        bold: expect.any(Function),
      },
    });

    const react = convertToReact(result.ast, { componentName: "UI" });
    expect(react).toContain('import { openSans } from "@pmndrs/msdfonts/open-sans";');
    expect(react).toContain('import { roboto } from "@pmndrs/msdfonts/roboto";');
    expect(react).toContain('fontFamilies={{ "open-sans": openSans, roboto: roboto }}');
  });

  it("loads used TTF faces for interpreted and converted documents", () => {
    const result = parse(`
      <style>
        @font-face {
          font-family: "Brand Sans";
          src: url("/fonts/BrandSans-Regular.ttf");
          font-weight: 400;
        }
        @font-face {
          font-family: "Brand Sans";
          src: url("/fonts/BrandSans-Bold.ttf");
          font-weight: 700;
        }
      </style>
      <div font-family="Brand Sans" font-weight="700">Ready</div>
    `);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    const component = instantiate(result.ast);
    expect(inputProperties(component).fontFamilies).toMatchObject({
      "Brand Sans": {
        400: expect.any(Function),
        700: expect.any(Function),
      },
    });

    const react = convertToReact(result.ast, { componentName: "UI" });
    expect(react).toContain(
      'import { Container, Text, useTTF } from "@react-three/uikit";',
    );
    expect(react).toContain(
      'const ttfFont0 = useTTF("/fonts/BrandSans-Regular.ttf");',
    );
    expect(react).toContain(
      '"Brand Sans": { "400": getTTFFont(ttfFont0, "/fonts/BrandSans-Regular.ttf"), "700": getTTFFont(ttfFont1, "/fonts/BrandSans-Bold.ttf") }',
    );

    const three = convertToThree(result.ast, { functionName: "createUI" });
    expect(three).toContain(
      'import { Container, TTFLoader, Text, reversePainterSortStable } from "@pmndrs/uikit";',
    );
    expect(three).toContain(
      'const ttfFont0 = ttfLoader.loadAsync("/fonts/BrandSans-Regular.ttf");',
    );
    expect(three).toContain(
      '"400": () => ttfFont0.then((fontFamilies) => getTTFFont(fontFamilies, "/fonts/BrandSans-Regular.ttf"))',
    );
  });

  it("can parse and instantiate without schema validation", () => {
    const result = parse('<div made-up="1" style="opacity: loud;">Ready</div>', {
      validate: false,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    const component = instantiate(result.ast);
    expect(inputProperties(component)).toMatchObject({
      madeUp: "1",
      opacity: "loud",
    });
  });

  it("parses and generates canonical UIKitML", () => {
    const result = parse('<div style="background-color: blue;" font-size="18">Hello</div>');
    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    const markup = generate(result.ast);

    expect(markup).toBe('<div font-size="18" style="background-color: blue">\n  Hello\n</div>');

    const roundTrip = parse(markup);
    expect(roundTrip.success).toBe(true);
  });

  it("exports the default html component set as a plain component set", () => {
    expect(htmlComponentSet.div?.canHaveChildren).toBe(true);
    expect(htmlComponentSet.img?.canHaveChildren).toBe(false);
  });
});
