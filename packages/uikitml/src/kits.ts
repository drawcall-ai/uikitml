import { SvgPropertiesSchema } from "@pmndrs/uikit";
import * as Horizon from "@pmndrs/uikit-horizon";
import { componentSchemas as horizonSchemas } from "@pmndrs/uikit-horizon/dist/schemas.js";
import * as Lucide from "@pmndrs/uikit-lucide";
import type { z } from "zod";
import type { ComponentConstructor, ComponentSet } from "./types.js";
import { withFontFamilyEnum } from "./fonts.js";

export type KitName = "default" | "horizon";

export function resolveKitComponentSets(kit: KitName = "default"): ComponentSet[] {
  switch (kit) {
    case "default":
      return [lucideComponentSet];
    case "horizon":
      return [lucideComponentSet, horizonComponentSet];
  }
}

export const lucideComponentSet = createLucideComponentSet();
export const horizonComponentSet = createHorizonComponentSet();

function createLucideComponentSet(): ComponentSet {
  const componentSet: ComponentSet = {};
  const entries = Object.entries(Lucide as Record<string, unknown>);

  for (const [name, value] of entries) {
    if (!/^[A-Z]/.test(name) || name.endsWith("Icon") || typeof value !== "function") {
      continue;
    }
    componentSet[name] = {
      component: value as ComponentConstructor,
      schema: withFontFamilyEnum(SvgPropertiesSchema as z.ZodType),
      canHaveChildren: false,
      origin: { kit: "lucide", name },
    };
  }

  return componentSet;
}

function createHorizonComponentSet(): ComponentSet {
  const componentSet: ComponentSet = {};
  const components = Horizon as Record<string, unknown>;

  for (const [name, schema] of Object.entries(horizonSchemas)) {
    const component = components[name];
    if (typeof component !== "function") {
      continue;
    }
    componentSet[name] = {
      component: component as ComponentConstructor,
      schema: withFontFamilyEnum(schema as z.ZodType),
      canHaveChildren: true,
      origin: { kit: "horizon", name },
    };
  }

  return componentSet;
}
