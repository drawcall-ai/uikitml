---
name: uikitml
description: Write, validate, render, and convert UIKitML for pmndrs/uikit interfaces. Use when working with .uikitml files, authoring spatial 3D UI or UI targeting VR/AR, using Three.js, @react-three/fiber, or IWSDK, choosing default/Lucide/Horizon components, fixing UIKitML validation errors, or using the @drawcall/uikitml CLI.
---

# UIKitML

## When to Use

Use UIKitML for spatial 3D UI or UI targeting VR/AR devices. For HUD UI in projects that do not target VR/AR devices, use HTML directly instead.

UIKitML is strict HTML-like markup for pmndrs/uikit. Use one root component. Top-level `<style>` blocks and `<meta preferred-color-scheme="dark|light|system" />` may sit beside the root.

Kits provide PascalCase component tags. The default kit is Shadcn-style; the Horizon kit is for Meta Horizon iOS-style 3D/XR interfaces. Lucide icons and HTML tags are available with either kit. For exact component names and props, read the matching reference.

```xml
<meta preferred-color-scheme="dark" />
<style>
  .card { width: 360; flex-direction: column; gap: 12; padding: 16; border-radius: 12; }
  .row { flex-direction: row; align-items: center; gap: 8; }
</style>

<Card class="card">
  <CardHeader class="row"><Activity width="18" height="18" /><CardTitle>Status</CardTitle></CardHeader>
  <CardContent><Badge>Live</Badge></CardContent>
</Card>
```

## Language

- Tags are exact and case-sensitive.
- Use kebab-case prop names in UIKitML; they become camelCase UIKit props.
- Use explicit closing or self-closing tags.
- Bare attributes become `true`: `<Button disabled />`.
- `class` becomes `classList`; `id` is passed through and can be styled.
- Inline styles use the same declaration syntax as `<style>`: `<Card style="padding: 16; gap: 8" />`.
- `font-family` accepts bundled MSDF font names: `crimson-text`, `fira-code`, `inconsolata`, `inter`, `lato`, `libre-baskerville`, `merriweather`, `montserrat`, `nunito`, `open-sans`, `playfair-display`, `poppins`, `raleway`, `roboto`, `source-code-pro`, `space-mono`, and `work-sans`.
- Custom TTF families use CSS `@font-face` with `font-family`, a `.ttf` URL in `src`, and an optional `font-weight` (`normal` by default). Use the declared family name in `font-family`. React conversion uses `useTTF` and requires a `Suspense` boundary.
- Layout is UIKit flex layout: `display` supports `flex` (the default), `none`, and `contents`; positioning supports static/default flow and `position-type="absolute"`.
- Text is trimmed and HTML entities are decoded.
- Plain `.uikitml` cannot express function props such as callbacks or icon constructors.

Supported stylesheet selectors: `.class`, `#id`, `:hover`, `:active`, `:focus`, `:sm`, `:md`, `:lg`, `:xl`, `:2xl`, and `> *`.

HTML tags are always available: `div`, `p`, `span`, `li`, `h1`-`h6`, `ol`, `ul`, `a`, `button`, `img`, `svg`, `video`, `input`, `textarea`. They map to base UIKit Container/Image/Svg/Video/Input/Textarea behavior.

Lucide icons are always available as PascalCase self-closing tags, for example `<Search />` or `<Activity />`.

## CLI

The CLI belongs to the `@drawcall/uikitml` package. Invoke the package by name:

```sh
npx @drawcall/uikitml validate '<Card><Badge>Live</Badge></Card>'
npx @drawcall/uikitml render card.uikitml --width 800 --height 600 --color-scheme dark --out card.png
npx @drawcall/uikitml convert card.uikitml --name Card --color-scheme dark --out Card.tsx
npx @drawcall/uikitml convert card.uikitml --to three --name createCard --out card.ts
npx @drawcall/uikitml feedback 'unexpected render output for valid Horizon markup'
```

Inputs resolve as stdin with `-`, then file path, then inline source. The default kit is selected by omitting `--kit`; use `--kit horizon` for the Meta Horizon iOS-style 3D/XR kit. Lucide icons and HTML tags are available either way.

`validate` prints diagnostics and exits 0 for valid or invalid UIKitML. CLI/runtime failures print `error ...` and exit nonzero.

Conversion targets: default `convert` emits @react-three/fiber code; `convert --to three` emits raw Three.js code. IWSDK consumes `.uikitml` files directly, so no conversion is needed there.

Use `feedback` to report non-user problems: suspected UIKitML bugs, unexpected parser/render/convert behavior, misleading diagnostics, or other tool failures. Keep reports concise and include the command, expected behavior, and actual behavior when known.

## References

- `references/default-kit.md`: Shadcn-style default kit component catalog.
- `references/horizon-kit.md`: Meta Horizon OS 3D/XR kit component catalog.
- `references/lucide-kit.md`: Lucide icon name inventory.
