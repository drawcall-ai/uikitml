<p align="center">
  <img src="./assets/uikitml-logo.png" alt="UIKitML logo" width="160" />
</p>

# UIKitML

Generate immersive 3D interfaces for Three.js, React Three Fiber, IWSDK, and
more with HTML syntax. Perfect for AI workflows.

```sh
npx skills add drawcall-ai/uikitml
```

## What It Is

UIKitML is a small HTML-like format for spatial UI. AI agents can write it,
validate it, preview it, and turn it into real 3D interface code.

```text
prompt / Pencil design / .pen file
  -> .uikitml
  -> PNG preview
  -> Three.js / React Three Fiber / IWSDK / more
```

Use it for AI-generated XR panels, dashboards, controls, and design-to-code
workflows.

## Why

- Strict markup, so agents get clear errors.
- Built-in Lucide, default, Horizon, and immersive UI references.
- Works well with Pencil: inspect a design, generate UIKitML, render, compare, convert.

## Quick Start

```sh
uikitml validate ./screen.uikitml --kit horizon
uikitml render ./screen.uikitml --kit horizon --out screen.png
uikitml convert ./screen.uikitml --kit horizon --name Screen --out Screen.tsx
uikitml convert ./screen.uikitml --to three --kit horizon --name createScreen --out screen.ts
```


Code:

```ts
import { parse, generate } from "@drawcall/uikitml";

const result = parse("<div><h1>Hello XR</h1></div>");
if (result.success) generate(result.ast);
```

## Custom fonts

Declare runtime TTF or WOFF2 fonts with CSS `@font-face`, then use the family
name in attributes, inline styles, or stylesheet rules:

```xml
<style>
  @font-face {
    font-family: "Brand Sans";
    src: url("/fonts/BrandSans-Regular.woff2") format("woff2");
    font-weight: 400;
  }

  @font-face {
    font-family: "Brand Sans";
    src: url("/fonts/BrandSans-Bold.ttf") format("truetype");
    font-weight: 700;
  }

  .title { font-family: "Brand Sans"; font-weight: 700; }
</style>

<h1 class="title">Launch ready</h1>
```

UIKitML supports `.ttf` and `.woff2` URLs and the CSS `font-family`, `src`, and
`font-weight` descriptors. `font-weight` defaults to `normal`. Runtime and
vanilla Three.js conversion use `TTFLoader`. React conversion uses `useTTF`
and requires a `Suspense` boundary. `.woff2` sources are decompressed to TTF
before MSDF generation, so converted output also needs `woff2-encoder`.

See the
[minimal editor source](./examples/minimal-editor/src/default.uikitml) for a
working multiple-weight example.
