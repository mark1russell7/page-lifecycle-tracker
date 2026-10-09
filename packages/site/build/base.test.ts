import { describe, expect, it } from "vitest";
import { normalizeBase } from "./base.ts";

describe("normalizeBase", () => {
  it("gives / for an empty value", () => {
    expect(normalizeBase(undefined)).toBe("/");
    expect(normalizeBase("")).toBe("/");
    expect(normalizeBase(" / ")).toBe("/");
  });

  it("adds the slashes at the start and the end", () => {
    expect(normalizeBase("page-lifecycle-tracker")).toBe("/page-lifecycle-tracker/");
    expect(normalizeBase("/page-lifecycle-tracker")).toBe("/page-lifecycle-tracker/");
    expect(normalizeBase("/page-lifecycle-tracker/")).toBe("/page-lifecycle-tracker/");
    expect(normalizeBase("a/b")).toBe("/a/b/");
  });

  it("keeps a full URL and adds only the slash at the end", () => {
    expect(normalizeBase("https://cdn.example.org/plt")).toBe("https://cdn.example.org/plt/");
    expect(normalizeBase("https://cdn.example.org/plt/")).toBe("https://cdn.example.org/plt/");
  });
});
