# @drawcall/uikitml

Strict UIKitML parser and generator for `pmndrs/uikit`.

```ts
import { parse, generate, instantiate } from "@drawcall/uikitml";

const result = parse('<div class="card" width="100">Hello</div>');

if (result.success) {
  generate(result.ast);
  instantiate(result.ast);
}
```

Component sets are plain records:

```ts
parse(source, {
  componentSets: [
    {
      Button: {
        component: Button,
        schema: ButtonPropertiesSchema,
        canHaveChildren: true,
      },
    },
  ],
});
```

By default, the standard HTML-like component set is included before custom component sets. Later sets override earlier definitions.

## CLI

```sh
uikitml validate '<div><Sparkles /></div>'
uikitml render card.uikitml --width 800 --color-scheme dark --out card.png
uikitml convert card.uikitml --name Card --color-scheme dark --out Card.tsx
uikitml convert card.uikitml --to three --name createCard --out card.ts
```

Inputs are resolved as stdin with `-`, then an existing file path, otherwise inline source. The default kit includes built-ins and Lucide. Use `--kit horizon` to include Horizon.
`convert --to react` emits a React Three Fiber component. `convert --to three` (also accepted as `threejs`) emits vanilla Three.js uikit code with a component factory and `configureUIKitRenderer(renderer)`.

`validate` prints `0 errors` or a count followed by one diagnostic per line. Invalid UIKitML still exits `0`; CLI/runtime failures print `error ...` and exit nonzero.

Documents can pin a deterministic color scheme for kits with light/dark variants:

```xml
<meta preferred-color-scheme="dark" />
```

`render --color-scheme` and `convert --color-scheme` override the metadata when supplied.
