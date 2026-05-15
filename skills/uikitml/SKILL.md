---
name: uikitml
description: Write, validate, render, and convert UIKitML for pmndrs/uikit interfaces. Use when working with .uikitml files, authoring 3D user interfaces, choosing default/Lucide/Horizon components, fixing UIKitML validation errors, or using the @drawcall/uikitml CLI.
---

# UIKitML

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
- Layout is UIKit flex layout: `display` supports `flex` (the default), `none`, and `contents`; positioning supports static/default flow and `position-type="absolute"`.
- Text is trimmed and HTML entities are decoded.
- Plain `.uikitml` cannot express function props such as callbacks or icon constructors.

Supported stylesheet selectors: `.class`, `#id`, `:hover`, `:active`, `:focus`, `:sm`, `:md`, `:lg`, `:xl`, `:2xl`, and `> *`.

HTML tags are always available: `div`, `p`, `span`, `li`, `h1`-`h6`, `ol`, `ul`, `a`, `button`, `img`, `svg`, `video`, `input`, `textarea`. They map to base UIKit Container/Image/Svg/Video/Input/Textarea behavior.

Lucide icons are always available as PascalCase self-closing tags, for example `<Search />` or `<Activity />`.

## CLI

The CLI belongs to the `@drawcall/uikitml` package. Do not assume a globally installed CLI binary exists. In this repo, use the local built entrypoint:

```sh
node packages/uikitml/dist/cli.js validate '<Card><Badge>Live</Badge></Card>'
node packages/uikitml/dist/cli.js render card.uikitml --width 800 --height 600 --color-scheme dark --out card.png
node packages/uikitml/dist/cli.js convert card.uikitml --name Card --color-scheme dark --out Card.tsx
```

When using an installed/resolvable package outside this repo, invoke the package by name:

```sh
npx @drawcall/uikitml validate '<Card><Badge>Live</Badge></Card>'
npx @drawcall/uikitml render card.uikitml --width 800 --height 600 --color-scheme dark --out card.png
npx @drawcall/uikitml convert card.uikitml --name Card --color-scheme dark --out Card.tsx
```

Inputs resolve as stdin with `-`, then file path, then inline source. The default kit is selected by omitting `--kit`; use `--kit horizon` for the Meta Horizon iOS-style 3D/XR kit. Lucide icons and HTML tags are available either way.

`validate` prints diagnostics and exits 0 for valid or invalid UIKitML. CLI/runtime failures print `error ...` and exit nonzero.

## References

- `references/default-kit.md`: Shadcn-style default kit component catalog.
- `references/horizon-kit.md`: Meta Horizon OS 3D/XR kit component catalog.
- `references/lucide-kit.md`: Lucide icon name inventory.
