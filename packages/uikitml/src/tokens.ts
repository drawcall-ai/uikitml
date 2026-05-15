import { decodeHTML } from "entities";
import type { SourceRange, UIKitMLError } from "./types.js";

export type ParsedAttribute = {
  name: string;
  value: string | true;
  nameRange: SourceRange;
  valueRange?: SourceRange;
  range: SourceRange;
};

export type OpenTagToken = {
  type: "openTag";
  tagName: string;
  attributes: ParsedAttribute[];
  range: SourceRange;
  tagNameRange: SourceRange;
};

export type CloseTagToken = {
  type: "closeTag";
  tagName: string;
  range: SourceRange;
  tagNameRange: SourceRange;
};

export type SelfClosingTagToken = {
  type: "selfClosingTag";
  tagName: string;
  attributes: ParsedAttribute[];
  range: SourceRange;
  tagNameRange: SourceRange;
};

export type TextToken = {
  type: "text";
  value: string;
  range: SourceRange;
};

export type CommentToken = {
  type: "comment";
  range: SourceRange;
};

export type StyleBlockToken = {
  type: "styleBlock";
  css: string;
  attributes: ParsedAttribute[];
  range: SourceRange;
  openTag: SourceRange;
  closeTag?: SourceRange;
  tagNameRange: SourceRange;
  contentRange: SourceRange;
};

export type RawSvgToken = {
  type: "rawSvg";
  tagName: "svg";
  raw: string;
  content: string;
  attributes: ParsedAttribute[];
  range: SourceRange;
  openTag: SourceRange;
  closeTag?: SourceRange;
  tagNameRange: SourceRange;
  contentRange?: SourceRange;
};

export type UIKitMLToken =
  | OpenTagToken
  | CloseTagToken
  | SelfClosingTagToken
  | TextToken
  | CommentToken
  | StyleBlockToken
  | RawSvgToken;

type TagScanResult = {
  tagName: string;
  attributes: ParsedAttribute[];
  selfClosing: boolean;
  range: SourceRange;
  tagNameRange: SourceRange;
  endOffset: number;
};

export function tokenize(source: string): { tokens: UIKitMLToken[]; errors: UIKitMLError[] } {
  const locator = createLocator(source);
  const tokens: UIKitMLToken[] = [];
  const errors: UIKitMLError[] = [];
  let offset = 0;

  while (offset < source.length) {
    if (source.startsWith("<!--", offset)) {
      const end = source.indexOf("-->", offset + 4);
      if (end === -1) {
        errors.push({
          code: "syntax",
          message: "Unclosed comment.",
          range: locator.range(offset, source.length),
        });
        break;
      }
      tokens.push({ type: "comment", range: locator.range(offset, end + 3) });
      offset = end + 3;
      continue;
    }

    if (source[offset] !== "<") {
      const next = source.indexOf("<", offset);
      const end = next === -1 ? source.length : next;
      const decoded = decodeHTML(source.slice(offset, end));
      const trimmed = decoded.trim();
      if (trimmed.length > 0) {
        tokens.push({ type: "text", value: trimmed, range: locator.range(offset, end) });
      }
      offset = end;
      continue;
    }

    if (source.startsWith("</", offset)) {
      const close = source.indexOf(">", offset + 2);
      if (close === -1) {
        errors.push({
          code: "syntax",
          message: "Unclosed closing tag.",
          range: locator.range(offset, source.length),
        });
        break;
      }
      const nameStart = offset + 2;
      const rawName = source.slice(nameStart, close).trim();
      const nameOffset = source.indexOf(rawName, nameStart);
      tokens.push({
        type: "closeTag",
        tagName: rawName,
        range: locator.range(offset, close + 1),
        tagNameRange: locator.range(nameOffset, nameOffset + rawName.length),
      });
      offset = close + 1;
      continue;
    }

    const scanned = scanOpenTag(source, offset, locator);
    if (!scanned.ok) {
      errors.push(scanned.error);
      offset = scanned.nextOffset;
      continue;
    }

    if (scanned.tag.tagName === "style" && !scanned.tag.selfClosing) {
      const closeStart = source.indexOf("</style>", scanned.tag.endOffset);
      if (closeStart === -1) {
        errors.push({
          code: "syntax",
          message: "Unclosed <style> block.",
          range: scanned.tag.range,
        });
        break;
      }
      const closeEnd = closeStart + "</style>".length;
      tokens.push({
        type: "styleBlock",
        css: source.slice(scanned.tag.endOffset, closeStart),
        attributes: scanned.tag.attributes,
        range: locator.range(offset, closeEnd),
        openTag: scanned.tag.range,
        closeTag: locator.range(closeStart, closeEnd),
        tagNameRange: scanned.tag.tagNameRange,
        contentRange: locator.range(scanned.tag.endOffset, closeStart),
      });
      offset = closeEnd;
      continue;
    }

    if (scanned.tag.tagName === "svg" && !scanned.tag.selfClosing) {
      const closeStart = source.indexOf("</svg>", scanned.tag.endOffset);
      if (closeStart === -1) {
        errors.push({
          code: "syntax",
          message: "Unclosed <svg> block.",
          range: scanned.tag.range,
        });
        break;
      }
      const closeEnd = closeStart + "</svg>".length;
      tokens.push({
        type: "rawSvg",
        tagName: "svg",
        raw: source.slice(offset, closeEnd),
        content: source.slice(scanned.tag.endOffset, closeStart),
        attributes: scanned.tag.attributes,
        range: locator.range(offset, closeEnd),
        openTag: scanned.tag.range,
        closeTag: locator.range(closeStart, closeEnd),
        tagNameRange: scanned.tag.tagNameRange,
        contentRange: locator.range(scanned.tag.endOffset, closeStart),
      });
      offset = closeEnd;
      continue;
    }

    if (scanned.tag.tagName === "style" && scanned.tag.selfClosing) {
      tokens.push({
        type: "styleBlock",
        css: "",
        attributes: scanned.tag.attributes,
        range: scanned.tag.range,
        openTag: scanned.tag.range,
        tagNameRange: scanned.tag.tagNameRange,
        contentRange: locator.range(scanned.tag.endOffset, scanned.tag.endOffset),
      });
    } else if (scanned.tag.tagName === "svg" && scanned.tag.selfClosing) {
      tokens.push({
        type: "rawSvg",
        tagName: "svg",
        raw: source.slice(offset, scanned.tag.endOffset),
        content: "",
        attributes: scanned.tag.attributes,
        range: scanned.tag.range,
        openTag: scanned.tag.range,
        tagNameRange: scanned.tag.tagNameRange,
      });
    } else if (scanned.tag.selfClosing) {
      tokens.push({ ...scanned.tag, type: "selfClosingTag" });
    } else {
      tokens.push({ ...scanned.tag, type: "openTag" });
    }
    offset = scanned.tag.endOffset;
  }

  return { tokens, errors };
}

function scanOpenTag(
  source: string,
  offset: number,
  locator: ReturnType<typeof createLocator>,
):
  | { ok: true; tag: TagScanResult }
  | { ok: false; error: UIKitMLError; nextOffset: number } {
  let cursor = offset + 1;
  const nameMatch = /^[A-Za-z][A-Za-z0-9._:-]*/.exec(source.slice(cursor));
  if (nameMatch == null) {
    const next = source.indexOf(">", cursor);
    return {
      ok: false,
      error: {
        code: "syntax",
        message: "Expected a tag name.",
        range: locator.range(offset, next === -1 ? source.length : next + 1),
      },
      nextOffset: next === -1 ? source.length : next + 1,
    };
  }

  const tagName = nameMatch[0];
  const tagNameStart = cursor;
  cursor += tagName.length;
  const attributes: ParsedAttribute[] = [];

  while (cursor < source.length) {
    cursor = skipWhitespace(source, cursor);
    if (source.startsWith("/>", cursor)) {
      const endOffset = cursor + 2;
      return {
        ok: true,
        tag: {
          tagName,
          attributes,
          selfClosing: true,
          range: locator.range(offset, endOffset),
          tagNameRange: locator.range(tagNameStart, tagNameStart + tagName.length),
          endOffset,
        },
      };
    }
    if (source[cursor] === ">") {
      const endOffset = cursor + 1;
      return {
        ok: true,
        tag: {
          tagName,
          attributes,
          selfClosing: false,
          range: locator.range(offset, endOffset),
          tagNameRange: locator.range(tagNameStart, tagNameStart + tagName.length),
          endOffset,
        },
      };
    }

    const attributeStart = cursor;
    const attrNameMatch = /^[^\s=/>]+/.exec(source.slice(cursor));
    if (attrNameMatch == null) {
      return {
        ok: false,
        error: {
          code: "syntax",
          message: "Expected a property name.",
          range: locator.range(cursor, cursor + 1),
        },
        nextOffset: cursor + 1,
      };
    }
    const name = attrNameMatch[0];
    const nameStart = cursor;
    cursor += name.length;
    cursor = skipWhitespace(source, cursor);

    let value: string | true = true;
    let valueRange: SourceRange | undefined;
    if (source[cursor] === "=") {
      cursor++;
      cursor = skipWhitespace(source, cursor);
      const quote = source[cursor];
      if (quote === `"` || quote === `'`) {
        const valueStart = cursor + 1;
        const valueEnd = source.indexOf(quote, valueStart);
        if (valueEnd === -1) {
          return {
            ok: false,
            error: {
              code: "syntax",
              message: `Unclosed property value for "${name}".`,
              range: locator.range(attributeStart, source.length),
            },
            nextOffset: source.length,
          };
        }
        value = decodeHTML(source.slice(valueStart, valueEnd));
        valueRange = locator.range(valueStart, valueEnd);
        cursor = valueEnd + 1;
      } else {
        const rawStart = cursor;
        const rawMatch = /^[^\s>]+/.exec(source.slice(cursor));
        if (rawMatch == null) {
          return {
            ok: false,
            error: {
              code: "syntax",
              message: `Expected a value for "${name}".`,
              range: locator.range(cursor, cursor + 1),
            },
            nextOffset: cursor + 1,
          };
        }
        value = decodeHTML(rawMatch[0]);
        valueRange = locator.range(rawStart, rawStart + rawMatch[0].length);
        cursor += rawMatch[0].length;
      }
    }

    attributes.push({
      name,
      value,
      nameRange: locator.range(nameStart, nameStart + name.length),
      valueRange,
      range: locator.range(attributeStart, cursor),
    });
  }

  return {
    ok: false,
    error: {
      code: "syntax",
      message: `Unclosed <${tagName}> tag.`,
      range: locator.range(offset, source.length),
    },
    nextOffset: source.length,
  };
}

function skipWhitespace(source: string, offset: number): number {
  let cursor = offset;
  while (/\s/.test(source[cursor] ?? "")) {
    cursor++;
  }
  return cursor;
}

function createLocator(source: string) {
  const lineStarts = [0];
  for (let index = 0; index < source.length; index++) {
    if (source[index] === "\n") {
      lineStarts.push(index + 1);
    }
  }

  function position(offset: number) {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (lineStarts[mid] <= offset) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    const line = Math.max(0, low - 1);
    return {
      offset,
      line,
      column: offset - lineStarts[line],
    };
  }

  return {
    range(start: number, end: number) {
      return { start: position(start), end: position(end) };
    },
  };
}
