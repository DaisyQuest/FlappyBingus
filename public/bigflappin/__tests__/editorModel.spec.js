import { describe, expect, it } from "vitest";
import {
  VALUE_TYPES,
  coerceValue,
  createDefaultValue,
  inferValueType,
  normalizeKey
} from "../modules/editorModel.js";

describe("editor model helpers", () => {
  it("infers value types accurately", () => {
    expect(inferValueType("hi")).toBe(VALUE_TYPES.string);
    expect(inferValueType(42)).toBe(VALUE_TYPES.number);
    expect(inferValueType(false)).toBe(VALUE_TYPES.boolean);
    expect(inferValueType(null)).toBe(VALUE_TYPES.null);
    expect(inferValueType([])).toBe(VALUE_TYPES.array);
    expect(inferValueType({})).toBe(VALUE_TYPES.object);
  });

  it("creates sensible defaults", () => {
    expect(createDefaultValue(VALUE_TYPES.string)).toBe("");
    expect(createDefaultValue(VALUE_TYPES.number)).toBe(0);
    expect(createDefaultValue(VALUE_TYPES.boolean)).toBe(false);
    expect(createDefaultValue(VALUE_TYPES.array)).toEqual([]);
    expect(createDefaultValue(VALUE_TYPES.object)).toEqual({});
    expect(createDefaultValue(VALUE_TYPES.null)).toBeNull();
  });

  it("coerces values for numeric and boolean types", () => {
    expect(coerceValue(VALUE_TYPES.number, "7")).toBe(7);
    expect(coerceValue(VALUE_TYPES.number, "oops")).toBe(0);
    expect(coerceValue(VALUE_TYPES.boolean, 1)).toBe(true);
    expect(coerceValue(VALUE_TYPES.boolean, 0)).toBe(false);
  });

  it("normalizes keys by trimming whitespace", () => {
    expect(normalizeKey("  key ")).toBe("key");
    expect(normalizeKey(123)).toBe("123");
  });
});
