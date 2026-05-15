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
```


Code:

```ts
import { parse, generate } from "@drawcall/uikitml";

const result = parse("<div><h1>Hello XR</h1></div>");
if (result.success) generate(result.ast);
```
