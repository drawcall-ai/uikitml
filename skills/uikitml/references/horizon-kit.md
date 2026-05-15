# Horizon Kit

Use `--kit horizon` for the Meta Horizon OS 3D/XR kit. Lucide icons and the HTML tags from `SKILL.md` are also available.

```xml
<meta preferred-color-scheme="dark" />
<Panel width="420" flex-direction="column" gap="12" padding="16">
  <Badge label="Live" variant="positive" />
  <Button variant="primary" size="sm">Deploy</Button>
</Panel>
```

Most components accept base Container styling props in addition to the listed props.

## Components

| Tag | Specific authored props | Children | Notes |
| --- | --- | --- | --- |
| `Avatar` | `src`, `attribution-active`, `attribution-src`, `size` (`xs`, `sm`, `md`, `lg`, `xl`), `selected` | No | Avatar image with optional status/attribution badge. |
| `Badge` | `variant` (`primary`, `secondary`, `positive`, `negative`), `label` | No | Compact label badge. |
| `Button` | `variant` (`primary`, `secondary`, `tertiary`, `onMedia`, `positive`, `negative`), `size` (`lg`, `sm`), `disabled`, `icon` | Yes | Pill button. Use bare `disabled` or `icon` boolean attributes. |
| `ButtonIcon` | Container props | Yes | Child wrapper for icons inside Button. Sizes nested icon children from the parent Button size. |
| `ButtonLabel` | Container props | Yes | Column wrapper for main and subtext labels inside Button. |
| `ButtonLabelSubtext` | Container props | Yes | Subtext label wrapper that inherits disabled/variant-aware color from ancestor Button. |
| `Checkbox` | `checked`, `default-checked`, `disabled`, `variant` (`normal`, `onMedia`) | No | Checkbox control. |
| `Divider` | `orientation` (`horizontal`, `vertical`) | Yes | One-pixel themed divider. Defaults to horizontal. |
| `Dropdown` | `size` (`lg`, `sm`), `value`, `default-value`, `open`, `default-open` | Yes | Compose with DropdownTextValue, DropdownButton, DropdownList, and DropdownListItem. |
| `DropdownAvatar` | Avatar props | No | Avatar variant sized from the parent Dropdown. |
| `DropdownButton` | Svg props | No | Chevron-down icon sized from the parent Dropdown. |
| `DropdownIcon` | Base Container props | Yes | Icon wrapper sized from the parent Dropdown; place Lucide icon children inside. |
| `DropdownList` | Base Container props | Yes | Absolute-positioned list shown when parent Dropdown is open. |
| `DropdownListItem` | `value` | Yes | Clickable item that updates the nearest parent Dropdown value. |
| `DropdownTextValue` | `placeholder` | No | Text display for the current parent Dropdown value or placeholder. |
| `IconIndicator` | `variant` (`none`, `good`, `poor`, `bad`) | No | Small status indicator with built-in SVG glyph. |
| `Input` | `size` (`lg`, `sm`), `variant` (`search`, `text`), `text-align` (`center`, `left`), `placeholder`, `value`, `default-value`, `disabled`, `tab-index`, `autocomplete`, `type` | No | Styled text/search input shell. |
| `InputField` | Input props plus `label` | No | Labeled field wrapper around Horizon Input. |
| `Panel` | Base Container props | Yes | Themed glass/material panel with default border radius and background material. |
| `ProgressBar` | `value` | No | Determinate progress bar. `value` is interpreted as a percent width. |
| `ProgressBarStepper` | Base Container props | Yes | Row container for ProgressBarStepperStep children. |
| `ProgressBarStepperStep` | `value` | No | Stepper segment. Bare `value` marks the segment filled. |
| `RadioGroup` | `value`, `default-value` | Yes | Compose with RadioGroupItem. |
| `RadioGroupItem` | `value` | Yes | Clickable row with built-in radio indicator and label children. |
| `Slider` | `value`, `default-value`, `min`, `max`, `step`, `size` (`sm`, `md`, `lg`), `left-label`, `right-label`, `value-format` (`percentage`) | No | Slider control. |
| `Toggle` | `checked`, `default-checked`, `disabled` | No | On/off switch. |

## Composition Patterns

```xml
<RadioGroup default-value="balanced">
  <RadioGroupItem value="eco">Eco Scan</RadioGroupItem>
  <RadioGroupItem value="balanced">Balanced</RadioGroupItem>
</RadioGroup>
```

```xml
<Dropdown default-value="manual">
  <DropdownTextValue placeholder="Mode" />
  <DropdownButton />
  <DropdownList>
    <DropdownListItem value="auto">Automatic</DropdownListItem>
    <DropdownListItem value="manual">Manual</DropdownListItem>
  </DropdownList>
</Dropdown>
```

```xml
<ProgressBarStepper>
  <ProgressBarStepperStep value />
  <ProgressBarStepperStep value />
  <ProgressBarStepperStep />
</ProgressBarStepper>
```
