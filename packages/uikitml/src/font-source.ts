export function isWoff2FontSource(src: string): boolean {
  return /\.woff2(?:[?#]|$)/i.test(src);
}

export function isRuntimeFontSource(src: string): boolean {
  return /\.(?:ttf|woff2)(?:[?#]|$)/i.test(src);
}

export function findRuntimeFontSource(value: string): string | undefined {
  const urlPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi;
  for (const match of value.matchAll(urlPattern)) {
    const url = (match[1] ?? match[2] ?? match[3])?.trim();
    if (url != null && isRuntimeFontSource(url)) {
      return url;
    }
  }
  return undefined;
}
