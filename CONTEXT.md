# UIKitML

UIKitML is a subset of HTML syntax for describing three-dimensional user interfaces built with pmndrs/uikit. It exists as a declarative, editor-friendly format that can be parsed into a UIKit component tree and generated back into markup.

## Language

**UIKitML**:
An HTML-like markup language for declaring pmndrs/uikit interfaces in 3D space.
_Avoid_: HTML, DOM

**UIKit Component Tree**:
The constructed tree of real pmndrs/uikit components produced by a successful parse.
_Avoid_: DOM tree, ElementJson, AST

**Element Type**:
One of the canonical parsed UIKitML node categories: container, image, inline SVG, video, input, custom element, or style.
_Avoid_: HTML element type

**Inline SVG**:
An opaque raw SVG island embedded in UIKitML through an `<svg>` element.
_Avoid_: UIKitML child tree

**Container Element**:
A UIKitML element that can hold child elements and text content.
_Avoid_: Generic HTML element

**Text Child**:
A UIKit Text component created from text content inside a parsed UIKitML element.
_Avoid_: Collapsed parent text node

**Forwarded Text Property**:
The behavior where a parent component's `text` property can provide the displayed text for its generated text child.
_Avoid_: DOM textContent

**Custom Element**:
A UIKitML element whose tag name is resolved through a caller-provided component set.
_Avoid_: Web component

**Component Set**:
A plain record of UIKitML component definitions, such as standard HTML aliases, icon components, or app-specific components.
_Avoid_: Custom elements registry, kit

**Component Definition**:
The metadata for one tag name, shaped as `{ component, schema, canHaveChildren }`, where `schema` is a Zod property schema.
_Avoid_: Bare component constructor

**Component Registry**:
The resolved exact-name mapping produced from ordered component sets for a parse operation.
_Avoid_: Implicit fallback registry

**Child Support**:
The binary rule for whether a UIKitML component may contain child nodes.
_Avoid_: Text-only kit mode

**Known Component Set**:
The complete set of tag names accepted by a UIKitML parser for a given parse operation, after resolving the active component sets.
_Avoid_: Best-effort fallback

**Built-in Tag**:
A lowercase UIKitML-supported HTML-like tag whose output component and default behavior are defined by this package.
_Avoid_: Native HTML tag

**Root Component**:
The single top-level pmndrs/uikit component returned by a successful parse.
_Avoid_: Fragment, document root

**Stylesheet Block**:
A `<style>` element that defines reusable UIKitML class and ID styles from any position in the UIKitML source.
_Avoid_: Component node

**Font Face Declaration**:
A CSS-style `@font-face` rule in a **Stylesheet Block** that gives one runtime `.ttf` or `.woff2` source a family name and weight.
_Avoid_: Bundled font import, browser font face

**Runtime TTF Family**:
One or more **Font Face Declarations** sharing a family name, converted on demand to UIKit's MSDF font-family data from `.ttf` or `.woff2` sources.
_Avoid_: Web font, system font

**Stylesheet Selector**:
A supported UIKitML style selector, including class selectors, ID selectors, supported pseudo selectors, and direct-child wildcard selectors.
_Avoid_: Full CSS selector

**Style Hook**:
The parsed class, ID, inline style, or stylesheet information passed through to pmndrs/uikit for style resolution.
_Avoid_: CSS cascade implementation

**Class Attribute Mapping**:
The conversion of the UIKitML `class` attribute into UIKit's string-array `classList` style hook.
_Avoid_: Schema-only class prop

**Schema Validation**:
Parse-time validation of component properties and style properties against the relevant Zod schemas exported by pmndrs/uikit.
_Avoid_: Runtime-only validation

**Property Value Preservation**:
The parse-time preservation of authored element and stylesheet property values as strings before UIKit schema validation. Bare boolean element properties remain the boolean value `true` because they have no authored string value.
_Avoid_: Property coercion, numeric coercion, boolean-string coercion

**HTML Entity**:
A standard named or numeric character reference decoded in UIKitML text and element property values.
_Avoid_: Raw ampersand escape

**Component Tag Name**:
The exact case-sensitive tag name used to reference a built-in or component-set component in UIKitML source.
_Avoid_: Lowercased HTML tag name

**Property Name Mapping**:
The conversion from canonical kebab-case UIKitML source property names to camelCase UIKit properties, and from camelCase UIKit properties back to kebab-case during generation.
_Avoid_: Case-insensitive prop matching

**Property Override**:
The rule that repeated element properties are applied in source order and the later value wins.
_Avoid_: Duplicate property error


**Round Trip**:
The supported conversion path between UIKitML source and real pmndrs/uikit components.
_Avoid_: Formatting preservation

**Generator**:
The UIKitML operation that serializes a real pmndrs/uikit component tree into UIKitML source.
_Avoid_: AST printer

**Generation Metadata**:
Optional context passed to the generator, such as source metadata and retained stylesheet information.
_Avoid_: Required parse result input

**Canonical UIKitML**:
The generator's normalized markup format used when no authoring provenance is available.
_Avoid_: Original formatting preservation

**Retained Stylesheet**:
The parsed pmndrs/uikit stylesheet data returned by a successful parse, ready to merge into UIKit's global stylesheet.
_Avoid_: Reconstructed CSS

**Source Range**:
The location information attached to parsed nodes and errors for editor integration and diagnostics.
_Avoid_: Span

**Source Range Map**:
An out-of-band `WeakMap` returned with a successful parse that maps UIKit components to their source range information for editor integration.
_Avoid_: Source ranges stored in component props

**Source Range Info**:
The detailed editor metadata for a parsed construct, including element, tag, attribute, text, stylesheet block, selector, declaration ranges, and property provenance where applicable.
_Avoid_: Single approximate range

**Property Provenance**:
Metadata that records whether a parsed UIKit property came from a markup attribute, inline style declaration, stylesheet rule, built-in default, or component-set behavior.
_Avoid_: Only merged props

**Property Merge**:
The direct object merge that combines parsed element properties and inline style declarations before constructing a UIKit component.
_Avoid_: CSS precedence engine

**Style Declaration Grammar**:
The single declaration grammar shared by inline styles and stylesheet rule bodies.
_Avoid_: Inline-style-only grammar

**Parse Result**:
The success-or-failure result of parsing UIKitML source, containing either a UIKit component tree plus editor metadata or source-range errors.
_Avoid_: Thrown parse result

**UIKitML Error**:
A parse or validation diagnostic with a stable code, human-readable message, optional source range, and optional structured details.
_Avoid_: Raw thrown exception

**Nearley Parser**:
The grammar-based parser used by UIKitML to control its HTML-like subset precisely.
_Avoid_: Browser HTML parser, parse5

**Self-Closing Element**:
Any UIKitML component written with XML-style empty-element syntax.
_Avoid_: HTML void element

**Comment**:
An HTML-style authoring note accepted by the parser without producing a UIKit component.
_Avoid_: Semantic node

**Bare Empty Element**:
A childless UIKitML element written with only an opening tag when the resolved component does not require child parsing.
_Avoid_: Browser-recovered missing close tag

## Relationships

- **UIKitML** parses into a **Parse Result**.
- UIKitML uses a **Nearley Parser** rather than a browser-compatible HTML parser.
- A **Runtime TTF Family** is available to `font-family` validation throughout the document, regardless of where its **Font Face Declaration** appears.
- Any component may be written as a **Self-Closing Element**.
- Components that cannot have children may also use explicit empty open and close tags.
- Every non-self-closing element must have a matching close tag; bare HTML void syntax is invalid.
- **Comments** are accepted but do not produce components and are not preserved by the generator in the first version.
- Components that cannot have children may use **Bare Empty Element** syntax, such as `<img src="x.png">`.
- A successful **Parse Result** contains exactly one **Root Component**, which is a real pmndrs/uikit component, and a **Source Range Map**.
- A UIKitML source may contain **Stylesheet Blocks** anywhere in the source without creating UIKit components.
- A **Stylesheet Block** uses **Stylesheet Selectors**, not the full browser CSS selector language.
- UIKitML preserves **Style Hooks**; pmndrs/uikit owns style precedence and application semantics.
- `class` and `id` are universal **Style Hooks**.
- **Class Attribute Mapping** converts source `class` into UIKit `classList`.
- **Class Attribute Mapping** preserves class token order and duplicates after whitespace splitting.
- UIKitML performs **Schema Validation** for parseable element properties, inline styles, and stylesheet declarations when the relevant schema is known.
- UIKitML may pass merged properties to UIKit components while preserving **Property Provenance** in **Source Range Info**.
- **Property Merge** directly combines parsed element properties and inline style declarations into top-level UIKit component properties in implementation order; it is not a separate precedence model.
- Inline styles and stylesheet rule bodies share the same **Style Declaration Grammar** and produce the same diagnostic classes, differing only by target context.
- Stylesheet rules are not merged into component top-level properties during parsing; they remain retained stylesheet metadata plus class and ID hooks for pmndrs/uikit.
- UIKitML preserves authored element and stylesheet property values as strings before **Schema Validation**.
- **Property Value Preservation** keeps `"true"`, `"false"`, and numeric-looking values as strings; only bare boolean attributes become `true`.
- UIKitML does not compute final cascaded styles.
- Any stylesheet syntax error, unsupported selector, or invalid stylesheet declaration makes the **Parse Result** fail.
- Standard **HTML Entities** are decoded in text and element property values; invalid entities are parse errors.
- **Component Tag Names** are exact and case-sensitive, matching the names defined by built-ins or component sets.
- **Built-in Tags** use exact lowercase names; uppercase variants such as `<DIV>` are unknown tags.
- **Property Name Mapping** only accepts kebab-case source property names in element markup and style declarations; camelCase source property names are invalid.
- **Property Override** means duplicate element properties are allowed and the last value in source order wins.
- Event/listener source properties have no special UIKitML behavior; they are ordinary properties that pass or fail schema validation.
- Text content is represented as **Text Children**, not by collapsing the parent element itself into a Text component.
- **Forwarded Text Property** behavior follows the upstream pmndrs/uikitml pattern where generated text children can read text from their parent component when available.
- Whitespace-only text nodes are ignored, text-node edges are trimmed, HTML entities are decoded, and adjacent text nodes are merged where possible.
- A failed **Parse Result** contains one or more errors with **Source Ranges** when available.
- Failed **Parse Results** contain **UIKitML Errors** with stable string codes.
- UIKitML accumulates semantic and validation errors when parsing can continue; unrecoverable Nearley syntax failures may produce only the first syntax error.
- A **UIKit Component Tree** contains zero or more **Element Types**.
- A **Custom Element** is resolved through a caller-provided **Component Set** when a matching component exists.
- A **Component Set** is made of **Component Definitions**.
- `parse` accepts ordered **Component Sets** and resolves them into a **Component Registry**.
- The standard HTML-like built-ins are provided as a **Component Set**.
- `parse` includes the standard HTML-like **Component Set** by default.
- Callers may disable the standard HTML-like **Component Set** explicitly for fully custom parsing.
- The **Known Component Set** is composed from the active **Component Sets** supplied to `parse`.
- Later **Component Sets** may override earlier definitions, including standard HTML-like built-ins.
- A tag outside the **Known Component Set** is a validation error.
- **Child Support** is validated from the resolved **Component Definition**.
- A **Round Trip** preserves the semantic **UIKit Component Tree**, not necessarily the original formatting.
- The **Generator** accepts a real pmndrs/uikit component tree as its first argument.
- **Generation Metadata** may be passed as the generator's optional second argument.
- With **Generation Metadata**, the **Generator** preserves authoring provenance where possible; without it, the **Generator** emits canonical UIKitML.
- **Canonical UIKitML** emits retained stylesheets before the root component, uses `id` then `class` before alphabetized attributes, self-closes elements without children, uses explicit open and close tags for elements with children, and indents with two spaces.
- **Inline SVG** content is preserved as raw SVG and is not parsed or generated as UIKitML children.
- `<svg>...</svg>` always represents **Inline SVG**; `<img src="*.svg" />` remains an image-source component and does not parse external SVG content.
- A successful **Parse Result** contains a **Retained Stylesheet** in pmndrs/uikit's stylesheet shape.
- `parse` returns the **Retained Stylesheet** and does not mutate pmndrs/uikit's global stylesheet.
- The **Generator** emits **Retained Stylesheets** when the parse result or component tree preserves class, ID, and stylesheet information.
- The **Generator** should not flatten class-based styling into inline styles when retained stylesheet information is available.
- A parse or validation error reports a **Source Range** when location information is available.
- Successful component source ranges live in the **Source Range Map**, not in UIKit component props.
- The **Source Range Map** is runtime metadata keyed by UIKit component object identity and is not a serialized source map.
- **Source Range Info** is detailed enough to support IntelliSense, hover, diagnostics, and source navigation for tags, attributes, text, stylesheet rules, selectors, and declarations.

## Example dialogue

> **Dev:** "If a designer writes `<button class=\"primary\">Buy</button>`, do we build a DOM button?"
> **Domain expert:** "No. UIKitML only borrows HTML-like syntax; it produces a UIKit component tree with validated UIKit properties."

## Flagged ambiguities

- "component" may refer to a UIKit built-in component, a component-set component, or a custom tag in source. Use **Component Set** for extension libraries and **Custom Element** for source tags that need component-set resolution.
- The previous name **ElementJson** appears in upstream pmndrs/uikitml language. This project uses **UIKit Component Tree** unless compatibility with upstream data structures is being discussed explicitly.
- Upstream pmndrs/uikitml treats unknown tags as fallback containers. This project rejects tags outside the **Known Component Set** so parsing stays unambiguous.
- External CSS references are out of scope for the first version; only inline `<style>` blocks participate in styling.
- **Stylesheet Selectors** intentionally preserve the existing pmndrs/uikitml selector subset, including `.x > *`, `#x > *`, class selectors, ID selectors, state selectors like `:hover` and `:active`, and responsive selectors like `:sm`.
- Style precedence is not a UIKitML domain rule; it is delegated to pmndrs/uikit.
