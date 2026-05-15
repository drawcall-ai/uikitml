import {
  Container,
  ContainerPropertiesSchema,
  Image,
  ImagePropertiesSchema,
  Input,
  InputPropertiesSchema,
  Svg,
  SvgPropertiesSchema,
  Textarea,
  TextareaPropertiesSchema,
  Video,
  VideoPropertiesSchema,
} from "@pmndrs/uikit";
import type { ComponentConstructor, ComponentDefinition, ComponentSet } from "./types.js";
import { withFontFamilyEnum } from "./fonts.js";

const htmlOrigin = (name: string) => ({ kit: "html", name });

const container = (defaults?: Record<string, unknown>): ComponentDefinition => ({
  component: Container as unknown as ComponentConstructor,
  schema: withFontFamilyEnum(ContainerPropertiesSchema),
  canHaveChildren: true,
  defaults,
  origin: htmlOrigin("Container"),
});

export const htmlComponentSet: ComponentSet = {
  div: container(),
  p: container(),
  span: container(),
  li: container(),
  h1: container({ fontSize: 32, fontWeight: "bold" }),
  h2: container({ fontSize: 24, fontWeight: "bold" }),
  h3: container({ fontSize: 18.72, fontWeight: "bold" }),
  h4: container({ fontSize: 16, fontWeight: "bold" }),
  h5: container({ fontSize: 13.28, fontWeight: "bold" }),
  h6: container({ fontSize: 10.67, fontWeight: "bold" }),
  ol: container({ flexDirection: "column" }),
  ul: container({ flexDirection: "column" }),
  a: container({ cursor: "pointer" }),
  button: container({ verticalAlign: "middle", textAlign: "center", cursor: "pointer" }),
  img: {
    component: Image as unknown as ComponentConstructor,
    schema: withFontFamilyEnum(ImagePropertiesSchema),
    canHaveChildren: false,
    origin: htmlOrigin("Image"),
  },
  svg: {
    component: Svg as unknown as ComponentConstructor,
    schema: withFontFamilyEnum(SvgPropertiesSchema),
    canHaveChildren: false,
    origin: htmlOrigin("Svg"),
  },
  video: {
    component: Video as unknown as ComponentConstructor,
    schema: withFontFamilyEnum(VideoPropertiesSchema),
    canHaveChildren: false,
    origin: htmlOrigin("Video"),
  },
  input: {
    component: Input as unknown as ComponentConstructor,
    schema: withFontFamilyEnum(InputPropertiesSchema),
    canHaveChildren: false,
    origin: htmlOrigin("Input"),
  },
  textarea: {
    component: Textarea as unknown as ComponentConstructor,
    schema: withFontFamilyEnum(TextareaPropertiesSchema),
    canHaveChildren: false,
    defaults: { multiline: true },
    origin: htmlOrigin("Textarea"),
  },
};

export function resolveComponentRegistry(
  componentSets: ComponentSet[] | undefined,
  includeHtmlComponentSet = true,
): ComponentSet {
  return Object.assign({}, ...(includeHtmlComponentSet ? [htmlComponentSet] : []), ...(componentSets ?? []));
}
