import {
  createPageLifecycle,
  type LifecycleDocument,
  type LifecycleListener,
  type LifecycleListenerOptions,
  type LifecycleWindow,
} from "page-lifecycle-tracker";

/**
 * The two orders of the listeners at the target that experiment E1 of the
 * `lag` project measured on `window`:
 * - `registration`: Chromium 145 started the listeners in the order in which
 *   the page added them.
 * - `capture-first`: Firefox 146 and WebKit started the capture listeners
 *   first.
 */
export type DispatchOrder = "registration" | "capture-first";

export type Owner = "exporter" | "tracker";

type Entry = { type: string; listener: LifecycleListener; capture: boolean; owner: Owner };

/**
 * A model of `window` for the animation. It keeps the listeners and starts
 * them in one of the two measured orders. The tracker of the real library
 * adds its listeners to it.
 */
export class ModelWindow implements LifecycleWindow {
  private readonly entries: Entry[] = [];
  /** The owner of the next listeners that `addEventListener` adds. */
  owner: Owner = "tracker";

  addEventListener(type: string, listener: LifecycleListener, options?: LifecycleListenerOptions): void {
    this.entries.push({ type, listener, capture: options?.capture === true, owner: this.owner });
  }

  removeEventListener(type: string, listener: LifecycleListener, options?: LifecycleListenerOptions): void {
    const capture = options?.capture === true;
    const index = this.entries.findIndex((entry) => entry.type === type && entry.listener === listener && entry.capture === capture);
    if (index >= 0) this.entries.splice(index, 1);
  }

  /** This method starts the listeners of `event.type` in the order `order`. */
  dispatch(event: { type: string }, order: DispatchOrder, hooks: { before(owner: Owner): void; after(owner: Owner): void }): void {
    const matching = this.entries.filter((entry) => entry.type === event.type);
    const ordered = order === "registration" ? matching : [...matching.filter((entry) => entry.capture), ...matching.filter((entry) => !entry.capture)];
    for (const entry of ordered) {
      hooks.before(entry.owner);
      entry.listener(event);
      hooks.after(entry.owner);
    }
  }
}

/** One step of a scenario, in the order in which the code started. */
export type Step = {
  actor: "exporter" | "tracker" | "monitor";
  /** What occurs in the step, as a short fragment. */
  text: string;
  /** The values that the step sent, for a step that sends the batch. */
  sends?: readonly string[];
};

export type ScenarioId = "chromium" | "capture-first" | "export-phase" | "handle";

export type ScenarioResult = {
  id: ScenarioId;
  steps: readonly Step[];
  /** The values in the last batch. */
  sent: readonly string[];
  /** True if the last batch has the final value of the monitor. */
  complete: boolean;
};

/** The values that the monitor recorded before the end of the page. */
export const EARLY_VALUES = ["LCP", "CLS"] as const;
/** The value that the monitor records at the end of the page. */
export const FINAL_VALUE = "INP";

const DOCUMENT: LifecycleDocument = {
  visibilityState: "visible",
  hasFocus: () => true,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};

/**
 * This function operates one scenario with the real library. The scenario
 * has a monitor, an exporter and one `pagehide` event. The monitor records
 * its final value at the end of the page. The exporter sends the recorded
 * values.
 *
 * - `chromium`: the exporter added its own `pagehide` listener first, and
 *   the listeners start in the order of registration.
 * - `capture-first`: the same page, with the capture listeners first.
 * - `export-phase`: the exporter subscribes in the `export` phase. It
 *   subscribes before the monitor, and the order is still correct.
 * - `handle`: the exporter keeps its own listener, which starts first, but
 *   it gives the event to `handle(event)` before it sends.
 */
export function runScenario(id: ScenarioId): ScenarioResult {
  const window = new ModelWindow();
  const steps: Step[] = [];
  const recorded: string[] = [...EARLY_VALUES];
  let sent: readonly string[] = [];
  const send = (text: string): void => {
    sent = [...recorded];
    steps.push({ actor: "exporter", text, sends: sent });
  };

  let handleEvent: ((event: unknown) => void) | undefined;
  if (id !== "export-phase") {
    window.owner = "exporter";
    window.addEventListener("pagehide", (event) => {
      if (id === "handle") {
        steps.push({ actor: "exporter", text: "Its pagehide listener starts first. It calls handle(event)." });
        handleEvent?.(event);
        send("It sends the batch.");
      } else {
        send("Its pagehide listener sends the batch.");
      }
    });
    window.owner = "tracker";
  }

  const tracker = createPageLifecycle({ document: DOCUMENT, window, clock: { now: () => 1000 }, logger: { log: () => undefined } });
  handleEvent = (event) => tracker.handle(event);
  if (id === "export-phase") {
    tracker.subscribe(
      (transition) => {
        if (transition.to === "terminated") send("Export subscriber: it sends the batch.");
      },
      { phase: "export" },
    );
  }
  tracker.subscribe((transition) => {
    if (transition.to !== "terminated") return;
    recorded.push(FINAL_VALUE);
    steps.push({ actor: "monitor", text: `Observe subscriber: it records the final ${FINAL_VALUE}.` });
  });

  let before = 0;
  const event = { type: "pagehide", persisted: false, timeStamp: 900 };
  window.dispatch(event, id === "capture-first" ? "capture-first" : "registration", {
    before(owner) {
      if (owner !== "tracker") return;
      before = tracker.getTotalTransitions();
      // The step text depends on the result. The hook `after` completes it.
      steps.push({ actor: "tracker", text: "" });
    },
    after(owner) {
      if (owner !== "tracker") return;
      const index = steps.findIndex((step) => step.actor === "tracker" && step.text === "");
      const changed = tracker.getTotalTransitions() > before;
      const step = steps[index];
      if (step) {
        step.text = changed ? "Its capture listener: active to terminated." : "Its capture listener: the event is already handled. No change.";
      }
    },
  });
  if (id === "handle") {
    // handle() made the transition inside the listener of the exporter. Show it at that point.
    const at = steps.findIndex((step) => step.actor === "exporter");
    steps.splice(at + 1, 0, { actor: "tracker", text: "handle(event): active to terminated." });
  }
  tracker.dispose();
  return { id, steps, sent, complete: sent.includes(FINAL_VALUE) };
}

/**
 * This function does the `window` case of experiment E1 in this browser.
 * It adds a bubble listener first and a capture listener second. Then it
 * sends one event and gives the order. The event type is not a lifecycle
 * event, thus the shared tracker does not see it.
 */
export function measureWindowOrder(target: EventTarget): DispatchOrder | undefined {
  const type = "plt-site-listener-order";
  const order: string[] = [];
  const bubble = (): void => {
    order.push("bubble");
  };
  const capture = (): void => {
    order.push("capture");
  };
  target.addEventListener(type, bubble);
  target.addEventListener(type, capture, { capture: true });
  try {
    target.dispatchEvent(new Event(type));
  } finally {
    target.removeEventListener(type, bubble);
    target.removeEventListener(type, capture, { capture: true });
  }
  if (order[0] === "capture") return "capture-first";
  if (order[0] === "bubble") return "registration";
  return undefined;
}
