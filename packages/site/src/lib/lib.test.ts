import { describe, expect, it, vi } from "vitest";
import { routerBasename } from "../app/routes.tsx";
import { isCurrent, NAV_ITEMS } from "../app/navigation.ts";
import { cx } from "./cx.ts";
import { axisTicks, formatDuration, formatOffset, formatTick } from "./format.ts";
import { memoizePromise } from "./memoize-promise.ts";

describe("format", () => {
  it("gives durations as short text", () => {
    expect(formatDuration(-5)).toBe("0.0 s");
    expect(formatDuration(420)).toBe("0.4 s");
    expect(formatDuration(12_400)).toBe("12 s");
    expect(formatDuration(185_000)).toBe("3 min 05 s");
    expect(formatDuration(3_720_000)).toBe("1 h 02 min");
  });

  it("gives the offsets of the table", () => {
    expect(formatOffset(12_345)).toBe("12.3 s");
    expect(formatOffset(61_000)).toBe("1 min 01 s");
  });

  it("gives at most the maximum number of ticks, at a regular step", () => {
    expect(axisTicks(4_500, 6)).toEqual([0, 1000, 2000, 3000, 4000]);
    expect(axisTicks(65_000, 6)).toEqual([0, 15_000, 30_000, 45_000, 60_000]);
    for (const span of [1, 999, 50_000, 600_000, 10_000_000]) expect(axisTicks(span, 7).length).toBeLessThanOrEqual(8);
  });

  it("gives the text of the ticks", () => {
    expect(formatTick(0)).toBe("0 s");
    expect(formatTick(30_000)).toBe("30 s");
    expect(formatTick(120_000)).toBe("2 min");
    expect(formatTick(90_000)).toBe("1 min 30 s");
    expect(formatTick(3_600_000)).toBe("1 h");
  });
});

describe("small helpers", () => {
  it("joins class names", () => {
    expect(cx("a", false, undefined, "b", null, "")).toBe("a b");
  });

  it("starts a load one time, and tries again after a rejection", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(7);
    const get = memoizePromise(load);
    await expect(get()).rejects.toThrow("offline");
    await expect(get()).resolves.toBe(7);
    await expect(get()).resolves.toBe(7);
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("routes and navigation", () => {
  it("gives the router basename from the base URL of Vite", () => {
    expect(routerBasename("/")).toBe("/");
    expect(routerBasename("/page-lifecycle-tracker/")).toBe("/page-lifecycle-tracker");
    expect(routerBasename("https://cdn.example.org/plt/")).toBe("/plt");
  });

  it("marks the link of the current section", () => {
    const concepts = NAV_ITEMS.find((item) => item.label === "Concepts");
    if (!concepts) throw new Error("No Concepts link");
    expect(isCurrent(concepts, "/docs/concepts/marks")).toBe(true);
    expect(isCurrent(concepts, "/docs/conceptsx")).toBe(false);
    expect(isCurrent(concepts, "/docs/api")).toBe(false);
  });
});
