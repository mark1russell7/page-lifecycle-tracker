import { describe, expect, it } from "vitest";
import { SimulatedPage } from "./simulated-page.ts";
import {
  createVisitRecorder,
  MAX_EVENTS,
  parseStoredEvents,
  segmentsOf,
  serializeEvents,
  startVisit,
  timeInStates,
  VISIT_STORAGE_KEY,
  type VisitEvent,
  type VisitStorage,
} from "./visit.ts";

const LOAD: VisitEvent = { kind: "load", at: 1000, state: "active", navigation: "navigate" };
const BLUR: VisitEvent = { kind: "transition", at: 3000, from: "active", to: "passive", trigger: "blur" };
const HIDE: VisitEvent = { kind: "transition", at: 4000, from: "passive", to: "hidden", trigger: "visibilitychange" };

function memoryStorage(initial: Record<string, string> = {}): VisitStorage & { values: Map<string, string> } {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("segments of the state strip", () => {
  it("gives one segment for each event, and the last segment continues to now", () => {
    expect(segmentsOf([LOAD, BLUR, HIDE], 6000)).toEqual([
      { state: "active", start: 1000, end: 3000, open: false, cause: LOAD },
      { state: "passive", start: 3000, end: 4000, open: false, cause: BLUR },
      { state: "hidden", start: 4000, end: 6000, open: true, cause: HIDE },
    ]);
  });

  it("adds the time in each state", () => {
    expect(timeInStates(segmentsOf([LOAD, BLUR, HIDE], 6000))).toEqual({ active: 2000, passive: 1000, hidden: 2000, frozen: 0, terminated: 0 });
  });

  it("gives no negative segment when the clock is before the last event", () => {
    const [segment] = segmentsOf([LOAD], 500);
    expect(segment?.end).toBe(1000);
  });
});

describe("the stored visit", () => {
  it("reads the text that it wrote", () => {
    expect(parseStoredEvents(serializeEvents([LOAD, BLUR]))).toEqual([LOAD, BLUR]);
  });

  it("ignores text that is not JSON and entries that are not valid", () => {
    expect(parseStoredEvents(null)).toEqual([]);
    expect(parseStoredEvents("not json")).toEqual([]);
    expect(parseStoredEvents(JSON.stringify({ events: "no" }))).toEqual([]);
    const text = JSON.stringify({
      events: [BLUR, { kind: "transition", at: 1, from: "active", to: "gone", trigger: "blur" }, { kind: "load", at: "x" }, LOAD],
    });
    expect(parseStoredEvents(text)).toEqual([LOAD, BLUR]);
  });

  it("starts a visit with the earlier events of the tab, and keeps at most MAX_EVENTS", () => {
    const load: VisitEvent = { kind: "load", at: 5000, state: "active", navigation: "back_forward" };
    expect(startVisit([LOAD, BLUR], load)).toEqual([LOAD, BLUR, load]);
    expect(startVisit([{ ...BLUR, at: 9000 }], load)).toEqual([load]);
    const many = Array.from({ length: MAX_EVENTS + 20 }, (_, index): VisitEvent => ({ ...BLUR, at: index }));
    expect(startVisit(many, { ...load, at: 100_000 })).toHaveLength(MAX_EVENTS);
  });
});

describe("the visit recorder", () => {
  it("records each transition of the real tracker, and saves the visit", () => {
    const page = new SimulatedPage({ now: () => 50 });
    const storage = memoryStorage();
    const store = createVisitRecorder({ tracker: page.tracker, timeOrigin: 10_000, navigationType: "navigate", storage });
    let changes = 0;
    store.subscribe(() => changes++);
    expect(store.getSnapshot()).toEqual([{ kind: "load", at: 10_000, state: "active", navigation: "navigate" }]);

    page.act("blur");
    page.act("hide");
    const events = store.getSnapshot();
    expect(events.map((event) => (event.kind === "transition" ? `${event.from}>${event.to}:${event.trigger}` : event.kind))).toEqual([
      "load",
      "active>passive:blur",
      "passive>hidden:visibilitychange",
    ]);
    expect(changes).toBe(2);
    expect(parseStoredEvents(storage.values.get(VISIT_STORAGE_KEY) ?? null)).toEqual(events);
    store.dispose();
    page.act("show");
    expect(store.getSnapshot()).toHaveLength(3);
    page.dispose();
  });

  it("continues the stored visit of the tab after a new load", () => {
    const page = new SimulatedPage({ now: () => 0 });
    const storage = memoryStorage({ [VISIT_STORAGE_KEY]: serializeEvents([LOAD, BLUR]) });
    const store = createVisitRecorder({ tracker: page.tracker, timeOrigin: 20_000, navigationType: "back_forward", storage });
    expect(store.getSnapshot()).toEqual([LOAD, BLUR, { kind: "load", at: 20_000, state: "active", navigation: "back_forward" }]);
    store.dispose();
    page.dispose();
  });

  it("keeps the visit in memory when the storage fails", () => {
    const page = new SimulatedPage({ now: () => 0 });
    const storage: VisitStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
    };
    const store = createVisitRecorder({ tracker: page.tracker, timeOrigin: 0, navigationType: "navigate", storage });
    page.act("pagehide-persisted");
    expect(store.getSnapshot().at(-1)).toMatchObject({ kind: "transition", to: "frozen", trigger: "pagehide" });
    store.dispose();
    page.dispose();
  });
});
