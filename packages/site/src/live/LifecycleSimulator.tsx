import { useRef, useState, type CSSProperties } from "react";
import type { LifecycleState } from "page-lifecycle-tracker";
import { formatOffset } from "../lib/format.ts";
import { LifecycleDiagram, type DiagramTransition } from "./LifecycleDiagram.tsx";
import { SimulatedPage, type SimulatedAction, type SimulatedEvent } from "./simulated-page.ts";
import { stateColor } from "./states.ts";
import styles from "./LifecycleSimulator.module.css";

type Snapshot = { state: LifecycleState; events: readonly SimulatedEvent[]; visibility: string; focused: boolean };

type Style = CSSProperties & Record<`--${string}`, string>;

function snapshotOf(page: SimulatedPage): Snapshot {
  return { state: page.tracker.getState(), events: [...page.events()], visibility: page.visibility, focused: page.focused };
}

function lastTransition(events: readonly SimulatedEvent[]): DiagramTransition | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.transition) return { ...event.transition, trigger: event.type, key: index };
  }
  return undefined;
}

function eventName(event: SimulatedEvent): string {
  return event.persisted === undefined ? event.type : `${event.type} (persisted: ${String(event.persisted)})`;
}

type ButtonSpec = { action: SimulatedAction; label: string; target: string };

/**
 * The simulator of the Page Lifecycle. It operates a private tracker of the
 * real library on a simulated document and window. Each button sends DOM events,
 * and the diagram shows the state that the tracker gives.
 */
export function LifecycleSimulator() {
  const page = useRef<SimulatedPage>(null);
  page.current ??= new SimulatedPage();
  const [snapshot, setSnapshot] = useState<Snapshot>(() => snapshotOf(page.current ?? new SimulatedPage()));
  const start = useRef(performance.now());

  const act = (action: SimulatedAction): void => {
    if (!page.current) return;
    page.current.act(action);
    setSnapshot(snapshotOf(page.current));
  };
  const reset = (): void => {
    page.current?.dispose();
    page.current = new SimulatedPage();
    start.current = performance.now();
    setSnapshot(snapshotOf(page.current));
  };

  const ended = snapshot.state === "terminated";
  const buttons: readonly ButtonSpec[] = [
    { action: snapshot.focused ? "blur" : "focus", label: snapshot.focused ? "blur" : "focus", target: "window" },
    { action: snapshot.visibility === "visible" ? "hide" : "show", label: `visibilitychange (to ${snapshot.visibility === "visible" ? "hidden" : "visible"})`, target: "document" },
    { action: "freeze", label: "freeze", target: "document" },
    { action: "resume", label: "resume", target: "document" },
    { action: "pagehide-persisted", label: "pagehide (persisted)", target: "window" },
    { action: "pageshow-persisted", label: "pageshow (persisted)", target: "window" },
    { action: "pagehide", label: "pagehide", target: "window" },
  ];
  const rows = [...snapshot.events].reverse().slice(0, 7);

  return (
    <div className={styles.simulator} data-sim-state={snapshot.state}>
      <div className={styles.panel}>
        <div className={styles.controls} role="group" aria-label="Events for the simulated page">
          {buttons.map((button) => (
            <button key={button.action} type="button" className={styles.event} onClick={() => act(button.action)} disabled={ended}>
              <code>{button.label}</code>
              <span className={styles.target}>{button.target}</span>
            </button>
          ))}
          <button type="button" className={styles.event} onClick={() => act("chromium-restore")} disabled={ended}>
            <code>resume, visibilitychange, pageshow</code>
            <span className={styles.target}>A restore, as Chromium does it</span>
          </button>
        </div>
        <dl className={styles.dom}>
          <div>
            <dt>
              <code>document.visibilityState</code>
            </dt>
            <dd>
              <code>"{snapshot.visibility}"</code>
            </dd>
          </div>
          <div>
            <dt>
              <code>document.hasFocus()</code>
            </dt>
            <dd>
              <code>{String(snapshot.focused)}</code>
            </dd>
          </div>
          <div>
            <dt>
              <code>tracker.getState()</code>
            </dt>
            <dd>
              <code className={styles.state} style={{ "--dot": stateColor(snapshot.state) } as Style}>
                "{snapshot.state}"
              </code>
            </dd>
          </div>
        </dl>
        {ended ? (
          <p className={styles.ended} role="status">
            The simulated page is in the <code>terminated</code> state. No event can change its state. Reset the simulator to start a new
            page.
          </p>
        ) : null}
        <div className={styles.logHead}>
          <h3 className={styles.logTitle}>Events</h3>
          <button type="button" className="button" onClick={reset}>
            Reset the simulator
          </button>
        </div>
        {rows.length === 0 ? (
          <p className={styles.empty}>Select an event. The table shows each event and the transition that it caused.</p>
        ) : (
          <div className={styles.logWrap} role="region" aria-label="The events of the simulator" tabIndex={0}>
            <table className={styles.log}>
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Event</th>
                  <th scope="col">Result</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((event, index) => (
                  <tr key={snapshot.events.length - index}>
                    <td className={styles.time}>{formatOffset(event.at - start.current)}</td>
                    <td>
                      <code>{eventName(event)}</code>
                    </td>
                    <td>
                      {event.transition ? (
                        <span>
                          <code>{event.transition.from}</code> to <code>{event.transition.to}</code>
                        </span>
                      ) : (
                        <span className={styles.noChange}>No change</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className={styles.stage}>
        <LifecycleDiagram
          state={snapshot.state}
          last={lastTransition(snapshot.events)}
          label={`The state diagram of the simulated page. Its state is ${snapshot.state}.`}
        />
        <p className={styles.note}>The simulator does not check that a browser can send each event in each state. It shows what the tracker does with each event.</p>
      </div>
    </div>
  );
}

export default LifecycleSimulator;
