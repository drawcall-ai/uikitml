# @drawcall/uikitml

`@drawcall/uikitml` parses a strict HTML-like UIKitML subset into an AST, can generate UIKitML back from that AST, and can instantiate real `pmndrs/uikit` components when needed.

## Workspace

- `packages/uikitml` - parser, component sets, generator, tests
- `examples/minimal-editor` - live UIKitML editor and Three.js preview

## API Sketch

```ts
import { parse, generate, instantiate } from "@drawcall/uikitml";

const result = parse(`
  <style>
    .card { background-color: #111827; padding: 12; }
  </style>
  <div class="card">
    <h1>Hello UIKitML</h1>
  </div>
`);

if (result.success) {
  const markup = generate(result.ast);
  const component = instantiate(result.ast);
}
```

## CLI

```sh
uikitml validate '<div><Sparkles /></div>'
uikitml render card.uikitml --width 800 --color-scheme dark --out card.png
uikitml convert card.uikitml --name Card --color-scheme dark --out Card.tsx
```

`validate` prints a compact validation block and exits `0` for valid and invalid UIKitML:

```text
0 errors
```

```text
2 errors
3:12 unknown-component Unknown component <Foo>.
5:20 invalid-property-name Invalid property name "backgroundColor" on element "<div>". Use "background-color".
```

Inputs are resolved as `-` for stdin, then an existing file path, otherwise inline source. Lucide icons and HTML-like tags are always available. The default kit is Shadcn-style; `--kit horizon` switches to the Meta Horizon iOS-style 3D/XR kit.

Documents can pin kit theme-sensitive defaults with top-level metadata:

```xml
<meta preferred-color-scheme="dark" />
```

`render --color-scheme` and `convert --color-scheme` override that metadata when supplied.

`render` writes a PNG file and prints:

```text
rendered card.png 742x318
```

`convert` writes React/UIKit TSX and prints:

```text
converted Card.tsx
```

## Agent Skill

Install the UIKitML agent skill from this repository:

```sh
npx skills add drawcall-ai/uikitml
```

The skill lives in `skills/uikitml` and includes references for the default kit, Lucide icons, and Horizon kit.

## Current Notes

- Unknown component tags are errors.
- Component tag names are exact and case-sensitive.
- Source property names in element markup and style declarations are kebab-case only and are converted to camelCase UIKit props.
- Inline styles and stylesheet rule bodies use the same style declaration grammar and diagnostics.
- Property values are preserved as authored strings; bare boolean element properties are represented as `true`.
- `class` is parsed as a UIKit `classList` string array and `id` is passed through as a style hook.
- `parse` returns an AST with source metadata and UIKit-shaped stylesheet data.
- `instantiate` creates live UIKit components from the AST and does not perform schema validation.
- Built-in component validation uses the Zod schemas exported by `@pmndrs/uikit`.

## Commands

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build
```
