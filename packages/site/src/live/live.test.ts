import type { LifecycleState, LifecycleTrigger } from "page-lifecycle-tracker";
import { describe, expect, it } from "vitest";
import { EDGES, edge, edgeFor, LANDSCAPE, PORTRAIT } from "./diagram-geometry.ts";
import { EARLY_VALUES, FINAL_VALUE, ModelWindow, runScenario } from "./listener-order.ts";
import { SimulatedPage } from "./simulated-page.ts";
import { isLifecycleState, isLifecycleTrigger, STATE_TEXT, STATES, TRIGGERS } from "./states.ts";

describe("the states", () => {
  it("has a text for each state and recognizes the names", () => {
    expect(Object.keys(STATE_TEXT).sort()).toEqual([...STATES].sort());
    expect(isLifecycleState("frozen")).toBe(true);
    expect(isLifecycleState("discarded")).toBe(false);
    expect(isLifecycleTrigger("pageshow")).toBe(true);
    expect(isLifecycleTrigger("unload")).toBe(false);
    expect(TRIGGERS).toHaveLength(7);
  });
});

describe("the geometry of the diagram", () => {
  it.each([LANDSCAPE, PORTRAIT])("puts each node and the box of the visible states inside the view box ($name)", (layout) => {
    for (const state of STATES) {
      const box = layout.nodes[state];
      expect(box.x - box.width / 2, state).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width / 2, state).toBeLessThanOrEqual(layout.viewBox.width);
      expect(box.y - box.height / 2, state).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height / 2, state).toBeLessThanOrEqual(layout.viewBox.height);
    }
    for (const state of ["active", "passive"] as const) {
      const box = layout.nodes[state];
      expect(box.x - box.width / 2).toBeGreaterThan(layout.group.x);
      expect(box.x + box.width / 2).toBeLessThan(layout.group.x + layout.group.width);
    }
  });

  it("has the same edges in both layouts", () => {
    expect(new Set(EDGES.map((item) => item.id)).size).toBe(EDGES.length);
    expect(PORTRAIT.edges.map((item) => item.id).sort()).toEqual(LANDSCAPE.edges.map((item) => item.id).sort());
    expect(edge("freeze").label).toBe("freeze");
    expect(() => edge("nothing" as never)).toThrow();
  });

  it.each<[LifecycleState, LifecycleState, LifecycleTrigger, string | undefined]>([
    ["active", "passive", "blur", "blur"],
    ["passive", "active", "focus", "focus"],
    ["active", "hidden", "visibilitychange", "toHidden"],
    ["passive", "hidden", "visibilitychange", "toHidden"],
    ["hidden", "passive", "visibilitychange", "toVisible"],
    ["hidden", "frozen", "freeze", "freeze"],
    ["frozen", "hidden", "resume", "resume"],
    ["hidden", "terminated", "pagehide", "hiddenToTerminated"],
    ["active", "frozen", "pagehide", "toBackForwardCache"],
    ["passive", "terminated", "pagehide", "visibleToTerminated"],
    ["frozen", "active", "pageshow", "fromBackForwardCache"],
    // Chromium sends resume and visibilitychange before pageshow. The restore is still a pageshow transition.
    ["active", "active", "pageshow", "fromBackForwardCache"],
    ["frozen", "terminated", "pagehide", undefined],
  ])("shows %s to %s from %s on the edge %s", (from, to, trigger, expected) => {
    expect(edgeFor({ from, to, trigger })).toBe(expected);
  });
});

describe("the simulated page", () => {
  it("gives the transitions of the real tracker for each action", () => {
    const page = new SimulatedPage({ now: () => 0 });
    const results: string[] = [];
    for (const action of ["blur", "focus", "hide", "freeze", "resume", "show", "pagehide-persisted", "pageshow-persisted", "pagehide"] as const) {
      page.act(action);
      const last = page.events().at(-1);
      results.push(last?.transition ? `${last.transition.from}>${last.transition.to}` : "none");
    }
    expect(results).toEqual([
      "active>passive",
      "passive>active",
      "active>hidden",
      "hidden>frozen",
      "frozen>hidden",
      "hidden>active",
      "active>frozen",
      "frozen>active",
      "active>terminated",
    ]);
    expect(page.tracker.getState()).toBe("terminated");
    page.dispose();
  });

  it("makes a restore as Chromium does: resume, visibilitychange, then pageshow, which is always a transition", () => {
    const page = new SimulatedPage({ now: () => 0 });
    page.act("hide");
    page.act("pagehide-persisted");
    page.act("chromium-restore");
    const restore = page.events().slice(-3);
    expect(restore.map((event) => event.type)).toEqual(["resume", "visibilitychange", "pageshow"]);
    expect(restore.map((event) => event.transition && `${event.transition.from}>${event.transition.to}`)).toEqual([
      "frozen>hidden",
      "hidden>active",
      "active>active",
    ]);
    page.dispose();
  });
});

describe("the listener order of experiment E1", () => {
  it("starts the listeners of the model window in the two measured orders", () => {
    const target = new ModelWindow();
    const order: string[] = [];
    target.owner = "exporter";
    target.addEventListener("pagehide", () => order.push("bubble"));
    target.owner = "tracker";
    target.addEventListener("pagehide", () => order.push("capture"), { capture: true });
    const hooks = { before: () => undefined, after: () => undefined };
    target.dispatch({ type: "pagehide" }, "registration", hooks);
    target.dispatch({ type: "pagehide" }, "capture-first", hooks);
    expect(order).toEqual(["bubble", "capture", "capture", "bubble"]);
  });

  it("loses the final value only when Chromium starts the listener of the exporter first", () => {
    const chromium = runScenario("chromium");
    expect(chromium.complete).toBe(false);
    expect(chromium.sent).toEqual([...EARLY_VALUES]);
    expect(chromium.steps.map((step) => step.actor)).toEqual(["exporter", "tracker", "monitor"]);

    for (const id of ["capture-first", "export-phase", "handle"] as const) {
      const result = runScenario(id);
      expect(result.complete, id).toBe(true);
      expect(result.sent, id).toContain(FINAL_VALUE);
    }
  });

  it("records the final value before the exporter sends, in the export phase", () => {
    expect(runScenario("export-phase").steps.map((step) => step.actor)).toEqual(["tracker", "monitor", "exporter"]);
  });

  it("handles the event one time when the exporter calls handle(event)", () => {
    const steps = runScenario("handle").steps;
    expect(steps.map((step) => step.actor)).toEqual(["exporter", "tracker", "monitor", "exporter", "tracker"]);
    expect(steps.at(-1)?.text).toMatch(/already handled/);
  });
});
