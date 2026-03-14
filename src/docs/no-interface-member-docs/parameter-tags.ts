import type { CommentLine, ParameterMemberTag } from "./types";

/** Extracts the parameter name from an `@param` tag line. */
const parameterTagPattern = /@param\s+(?:\{[^}]*\}\s+)?(?<name>[^\s-]+)/u;

/**
 * Defines stripJsdocLine.
 * @param line Input line value.
 * @returns Return value output.
 * @example
 * ```typescript
 * stripJsdocLine();
 * ```
 */
const stripJsdocLine = (line: string): string =>
  line.replace(/^\s*\/?\**\s?/u, "").trim();

/**
 * Defines stripDefaultValue.
 * @param rawName Input rawName value.
 * @returns Return value output.
 * @example
 * ```typescript
 * stripDefaultValue();
 * ```
 */
const stripDefaultValue = (rawName: string): string => {
  const [head = ""] = rawName.split("=");

  return head;
};

/**
 * Normalizes normalizeParameterName.
 * @param rawName Input rawName value.
 * @returns Return value output.
 * @example
 * ```typescript
 * normalizeParameterName();
 * ```
 */
const normalizeParameterName = (rawName: string): string =>
  stripDefaultValue(rawName)
    .replace(/^\[/u, "")
    .replace(/\]$/u, "")
    .replace(/\?$/u, "");

/**
 * Gets getParameterName.
 * @param content Input content value.
 * @returns Return value output.
 * @example
 * ```typescript
 * getParameterName();
 * ```
 */
const getParameterName = (content: string): string | undefined => {
  if (!content.startsWith("@param")) {
    return void 0;
  }

  const match = parameterTagPattern.exec(content);
  const rawName = match?.groups?.["name"] ?? "";
  const normalized = normalizeParameterName(rawName);

  return normalized.length > 0 ? normalized : void 0;
};

/**
 * Extracts member path details from a normalized parameter name.
 * @param normalized Normalized parameter name.
 * @returns Member path details when available.
 * @example
 * ```typescript
 * const member = getMemberName("props.title");
 * ```
 */
const getMemberName = (
  normalized: string,
):
  | undefined
  | {
      /** BaseName field value. */
      baseName: string;

      /** MemberPath field value. */
      memberPath: string;
    } => {
  const dotIndex = normalized.indexOf(".");

  if (dotIndex <= 0) {
    return void 0;
  }

  const baseName = normalized.slice(0, dotIndex);
  const memberPath = normalized.slice(dotIndex + 1).trim();

  return memberPath.length > 0 ? { baseName, memberPath } : void 0;
};

/**
 * Parses a `@param` tag line into a member tag when applicable.
 * @param line Comment line metadata.
 * @returns Parsed parameter member tag when present.
 * @example
 * ```typescript
 * const tag = parseParameterTagLine(line);
 * ```
 */
const parseParameterTagLine = (
  line: CommentLine,
): ParameterMemberTag | undefined => {
  const content = stripJsdocLine(line.text);
  const normalized = getParameterName(content);

  if (normalized === void 0) {
    return void 0;
  }

  const member = getMemberName(normalized);

  if (member === void 0) {
    return void 0;
  }

  return {
    baseName: member.baseName,
    fullName: normalized,
    line,
  };
};

export { parseParameterTagLine };
