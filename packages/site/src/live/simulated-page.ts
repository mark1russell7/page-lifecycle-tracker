import {
  createPageLifecycle,
  type Clock,
  type LifecycleDocument,
  type LifecycleState,
  type LifecycleTrigger,
  type LifecycleWindow,
  type PageLifecycle,
} from "page-lifecycle-tracker";

/** The buttons of the simulator. Each sends DOM events to the simulated page. */
export type SimulatedAction =
  | "focus"
  | "blur"
  | "hide"
  | "show"
  | "freeze"
  | "resume"
  | "pagehide-persisted"
  | "pagehide"
  | "pageshow-persisted"
  | "chromium-restore";

/** One DOM event that the simulator sent, and its result. */
export type SimulatedEvent = {
  /** The time of the event, in `performance.now()` time. */
  at: number;
  type: LifecycleTrigger;
  persisted?: boolean;
  /** The transition that the event caused, if one occurred. */
  transition?: { from: LifecycleState; to: LifecycleState };
};

type SimulatedDocument = LifecycleDocument & EventTarget;

/**
 * A page with a simulated `document` and `window`, and a private tracker
 * from the real library (`createPageLifecycle()`). The simulator sends
 * events to it. The shared tracker of the real page does not see them.
 */
export class SimulatedPage {
  visibility: "visible" | "hidden" = "visible";
  focused = true;
  readonly tracker: PageLifecycle;
  private readonly document: SimulatedDocument;
  private readonly window: EventTarget;
  private readonly log: SimulatedEvent[] = [];
  private pending: SimulatedEvent | undefined;

  constructor(clock: Clock = performance) {
    const target = new EventTarget();
    // Getters, so that the tracker reads the current simulated values.
    Object.defineProperty(target, "visibilityState", { get: () => this.visibility });
    Object.defineProperty(target, "hasFocus", { value: () => this.focused });
    this.document = target as SimulatedDocument;
    this.window = new EventTarget();
    this.tracker = createPageLifecycle({
      document: this.document,
      window: this.window as unknown as LifecycleWindow,
      clock,
      logger: { log: () => undefined },
    });
    this.tracker.subscribe(({ from, to }) => {
      if (this.pending) this.pending.transition = { from, to };
    });
  }

  /** The events that the simulator sent, the oldest first. */
  events(): readonly SimulatedEvent[] {
    return this.log;
  }

  private send(type: LifecycleTrigger, target: "document" | "window", persisted?: boolean): void {
    const event = new Event(type);
    if (persisted !== undefined) Object.defineProperty(event, "persisted", { value: persisted });
    const record: SimulatedEvent = { at: event.timeStamp, type, ...(persisted === undefined ? {} : { persisted }) };
    this.pending = record;
    (target === "document" ? this.document : this.window).dispatchEvent(event);
    this.pending = undefined;
    this.log.push(record);
  }

  /** This method does one action: it changes the DOM properties and sends the events of the action. */
  act(action: SimulatedAction): void {
    switch (action) {
      case "focus":
        this.focused = true;
        this.send("focus", "window");
        break;
      case "blur":
        this.focused = false;
        this.send("blur", "window");
        break;
      case "hide":
        this.visibility = "hidden";
        this.send("visibilitychange", "document");
        break;
      case "show":
        this.visibility = "visible";
        this.send("visibilitychange", "document");
        break;
      case "freeze":
        this.send("freeze", "document");
        break;
      case "resume":
        this.send("resume", "document");
        break;
      case "pagehide-persisted":
        this.send("pagehide", "window", true);
        break;
      case "pagehide":
        this.send("pagehide", "window", false);
        break;
      case "pageshow-persisted":
        this.visibility = "visible";
        this.send("pageshow", "window", true);
        break;
      case "chromium-restore":
        // Chromium restores a page from the back/forward cache with resume, visibilitychange and then pageshow.
        this.send("resume", "document");
        this.visibility = "visible";
        this.send("visibilitychange", "document");
        this.send("pageshow", "window", true);
        break;
    }
  }

  /** This method removes the listeners of the tracker. */
  dispose(): void {
    this.tracker.dispose();
  }
}
