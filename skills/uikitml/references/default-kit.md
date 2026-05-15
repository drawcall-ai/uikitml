# Default Kit

Default is the Shadcn-style UIKitML kit. Lucide icons and the HTML tags from `SKILL.md` are also available.

| Component | Props to remember | Children | Notes |
| --- | --- | --- | --- |
| `Accordion` | container props | Yes | Root for accordion items. |
| `AccordionContent` | container props | Yes | Content area for an item. |
| `AccordionItem` | `value` | Yes | Item identity. |
| `AccordionTrigger` | container props | Yes | Click target for an item. |
| `AccordionTriggerIcon` | `src`, `content`, `keep-aspect-ratio` | No | Built-in trigger icon. |
| `Alert` | `variant` (`default`, `destructive`) | Yes | Alert shell. |
| `AlertDescription` | container props | Yes | Alert body text. |
| `AlertIcon` | container props | Yes | Icon slot; put a Lucide icon inside. |
| `AlertTitle` | container props | Yes | Alert title. |
| `AlertDialog` | `open`, `default-open` | Yes | Modal alert dialog root. |
| `AlertDialogAction` | container props | Yes | Action button. |
| `AlertDialogCancel` | container props | Yes | Cancel button. |
| `AlertDialogContent` | container props | Yes | Dialog panel. |
| `AlertDialogDescription` | container props | Yes | Dialog body text. |
| `AlertDialogFooter` | container props | Yes | Footer action row. |
| `AlertDialogHeader` | container props | Yes | Header stack. |
| `AlertDialogTitle` | container props | Yes | Dialog title. |
| `AlertDialogTrigger` | `dialog` is runtime-only | Yes | Trigger for a dialog. |
| `Avatar` | `src`, `object-fit`, `keep-aspect-ratio` | No | Image avatar. |
| `Badge` | `variant` (`default`, `secondary`, `destructive`, `outline`) | Yes | Inline badge. |
| `Button` | `variant` (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`), `size` (`default`, `sm`, `lg`, `icon`), `disabled` | Yes | Button shell. |
| `Card` | container props | Yes | Card shell. |
| `CardContent` | container props | Yes | Card body. |
| `CardDescription` | container props | Yes | Card supporting copy. |
| `CardFooter` | container props | Yes | Card footer. |
| `CardHeader` | container props | Yes | Card header stack. |
| `CardTitle` | container props | Yes | Card title. |
| `Checkbox` | `checked`, `default-checked`, `disabled` | No | Checkbox control. |
| `Dialog` | `open`, `default-open` | Yes | Modal dialog root. |
| `DialogContent` | container props | Yes | Dialog panel. |
| `DialogDescription` | container props | Yes | Dialog body text. |
| `DialogFooter` | container props | Yes | Footer action row. |
| `DialogHeader` | container props | Yes | Header stack. |
| `DialogTitle` | container props | Yes | Dialog title. |
| `DialogTrigger` | `dialog` is runtime-only | Yes | Trigger for a dialog. |
| `Input` | `placeholder`, `default-value`, `value`, `disabled`, `tab-index`, `autocomplete`, `type` | No | Text input. |
| `Label` | `disabled` | Yes | Label text. |
| `Menubar` | container props | Yes | Menubar root. |
| `MenubarMenu` | container props | Yes | Menu group. |
| `MenubarTrigger` | container props | Yes | Menu trigger. |
| `Pagination` | container props | Yes | Pagination root. |
| `PaginationContent` | container props | Yes | Pagination list. |
| `PaginationEllipsis` | container props | No | Built-in ellipsis. |
| `PaginationItem` | container props | Yes | Pagination item wrapper. |
| `PaginationLink` | `size` (`default`, `sm`, `lg`, `icon`), `is-active` | Yes | Page link. |
| `PaginationNext` | `size`, `is-active` | No | Built-in next link. |
| `PaginationPrevious` | `size`, `is-active` | No | Built-in previous link. |
| `Progress` | `value` | No | Progress bar. |
| `RadioGroup` | `value`, `default-value` | Yes | Radio group root. |
| `RadioGroupItem` | `value`, `disabled` | Yes | Radio option row. |
| `Separator` | `orientation` (`horizontal`, `vertical`) | Yes | Divider line. |
| `Skeleton` | container props | Yes | Loading placeholder. |
| `Slider` | `disabled`, `value`, `default-value`, `min`, `max`, `step` | No | Slider control. |
| `Switch` | `checked`, `default-checked`, `disabled` | No | Switch control. |
| `Tabs` | `value`, `default-value` | Yes | Tabs root. |
| `TabsContent` | `value` | Yes | Tab panel. |
| `TabsList` | container props | Yes | Tab trigger row. |
| `TabsTrigger` | `value`, `disabled` | Yes | Tab trigger. |
| `Textarea` | `placeholder` | No | Multiline input. |
| `Toggle` | `checked`, `default-checked`, `disabled`, `variant` (`default`, `outline`), `size` (`default`, `sm`, `lg`) | Yes | Toggle button. |
| `ToggleGroup` | `variant`, `size` | Yes | Toggle group root. |
| `ToggleGroupItem` | `checked`, `default-checked`, `disabled` | Yes | Toggle group item. |
| `Tooltip` | container props | Yes | Tooltip root. |
| `TooltipContent` | `side-offset` | Yes | Tooltip bubble. |
| `TooltipTrigger` | container props | Yes | Tooltip trigger. |
| `Video` | `controls`, media props such as `src` | No | Video with optional controls. |
| `VideoControls` | container props | No | Built-in controls overlay. |
