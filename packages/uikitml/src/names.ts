export function kebabToCamel(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

export function camelToKebab(name: string): string {
  return name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

export function isKebabPropertyName(name: string): boolean {
  return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name);
}

export function formatInvalidPropertyNameMessage(name: string, context: string): string {
  const suggestion = camelToKebab(name);
  const help = suggestion !== name ? ` Use "${suggestion}".` : " Use kebab-case.";
  return `Invalid property name "${name}" on ${context}.${help}`;
}
