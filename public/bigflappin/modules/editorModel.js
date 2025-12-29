export const VALUE_TYPES = Object.freeze({
  string: "string",
  number: "number",
  boolean: "boolean",
  null: "null",
  object: "object",
  array: "array"
});

export function inferValueType(value) {
  if (value === null || value === undefined) return VALUE_TYPES.null;
  if (Array.isArray(value)) return VALUE_TYPES.array;
  const t = typeof value;
  if (t === "string") return VALUE_TYPES.string;
  if (t === "number") return VALUE_TYPES.number;
  if (t === "boolean") return VALUE_TYPES.boolean;
  if (t === "object") return VALUE_TYPES.object;
  return VALUE_TYPES.string;
}

export function createDefaultValue(type) {
  switch (type) {
    case VALUE_TYPES.string:
      return "";
    case VALUE_TYPES.number:
      return 0;
    case VALUE_TYPES.boolean:
      return false;
    case VALUE_TYPES.object:
      return {};
    case VALUE_TYPES.array:
      return [];
    case VALUE_TYPES.null:
    default:
      return null;
  }
}

export function coerceValue(type, raw) {
  if (type === VALUE_TYPES.number) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  if (type === VALUE_TYPES.boolean) return Boolean(raw);
  if (type === VALUE_TYPES.null) return null;
  return raw;
}

export function normalizeKey(key) {
  return String(key || "").trim();
}
