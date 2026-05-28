export const stylesheetSectionNames = [
  "hover",
  "active",
  "focus",
  "dark",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "placeholderStyle",
  "important",
] as const;

export type StylesheetSectionName = (typeof stylesheetSectionNames)[number];

const cssPseudoToSection = new Map<string, StylesheetSectionName>([
  ...stylesheetSectionNames.map((name) => [name, name] as const),
  ["placeholder-style", "placeholderStyle"],
]);

const sectionToCssPseudo = new Map<StylesheetSectionName, string>([
  ...stylesheetSectionNames.map((name) => [name, name] as const),
  ["placeholderStyle", "placeholder-style"],
]);

export function normalizeStylesheetSection(name: string): StylesheetSectionName | undefined {
  return cssPseudoToSection.get(name);
}

export function formatStylesheetSection(name: string): string {
  return sectionToCssPseudo.get(name as StylesheetSectionName) ?? name;
}
