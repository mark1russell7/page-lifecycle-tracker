type Listener = (event?: unknown) => void;

type Registration = { type: string; listener: Listener; capture: boolean };

/** A fake event target that records its listeners. */
export type FakeEventTarget = {
  addEventListener(type: string, listener: Listener, options?: { capture?: boolean }): void;
  removeEventListener(type: string, listener: Listener, options?: { capture?: boolean }): void;
  /** This method sends the event to the capture listeners first, as a browser does at the target. */
  dispatch(type: string, event?: unknown): void;
  listeners(): Registration[];
};

/** This function makes a fake event target for the tests. */
export function createFakeEventTarget(): FakeEventTarget {
  const listeners: Registration[] = [];
  return {
    addEventListener(type, listener, options) {
      listeners.push({ type, listener, capture: options?.capture === true });
    },
    removeEventListener(type, listener, options) {
      const index = listeners.findIndex((l) => l.type === type && l.listener === listener && l.capture === (options?.capture === true));
      if (index >= 0) listeners.splice(index, 1);
    },
    dispatch(type, event) {
      const matching = listeners.filter((l) => l.type === type);
      for (const l of [...matching.filter((m) => m.capture), ...matching.filter((m) => !m.capture)]) l.listener(event);
    },
    listeners() {
      return [...listeners];
    },
  };
}
