import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "../lib/hooks.ts";
import { EARLY_VALUES, FINAL_VALUE, measureWindowOrder, runScenario, type DispatchOrder, type ScenarioId, type Step } from "./listener-order.ts";
import styles from "./ListenerOrder.module.css";

type Lane = {
  id: ScenarioId;
  title: string;
  setup: string;
  /** The measured order that this lane shows, for the result of this browser. */
  order?: DispatchOrder;
};

const LANES: readonly Lane[] = [
  {
    id: "chromium",
    title: "Chromium 145",
    setup: "The exporter added its pagehide listener first. Chromium starts the listeners of window in the order of registration.",
    order: "registration",
  },
  {
    id: "capture-first",
    title: "Firefox 146 and WebKit",
    setup: "The same page. These engines start the capture listener of the tracker first.",
    order: "capture-first",
  },
  {
    id: "export-phase",
    title: "Any engine, with phase: \"export\"",
    setup: "The exporter has no listener. It subscribes in the export phase, before the monitor subscribes.",
  },
  {
    id: "handle",
    title: "Any engine, with handle(event)",
    setup: "The exporter keeps its listener, and it starts first. It gives the event to the tracker before it sends.",
  },
];

const ACTOR_NAMES: Readonly<Record<Step["actor"], string>> = {
  exporter: "Exporter",
  tracker: "Tracker",
  monitor: "Monitor",
};

const STEP_MS = 1100;

function Batch({ values }: { values: readonly string[] }) {
  return (
    <span className={styles.batch}>
      {[...EARLY_VALUES, FINAL_VALUE].map((value) => {
        const isIn = values.includes(value);
        return (
          <span key={value} className={styles.value} data-missing={isIn ? undefined : ""}>
            {value}
            {isIn ? null : <span className="visually-hidden"> (not in the batch)</span>}
          </span>
        );
      })}
    </span>
  );
}

function ResultIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" className={styles.icon}>
      <circle cx="10" cy="10" r="8.5" />
      <path d="M6 10.4l2.6 2.6L14.2 7.4" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" className={styles.icon}>
      <path d="M10 2.2 18.4 17H1.6Z" />
      <path d="M10 8v4.2M10 14.4v.2" />
    </svg>
  );
}

/**
 * The animation of one `pagehide` in four setups. Each lane operates the
 * real library on a model of `window` that starts the listeners in the order
 * that experiment E1 measured. The numbers give the order in which the code
 * runs. The lane shows the batch that the exporter sent.
 */
export function ListenerOrder() {
  const results = useMemo(() => new Map(LANES.map((lane) => [lane.id, runScenario(lane.id)])), []);
  const longest = Math.max(...[...results.values()].map((result) => result.steps.length));
  // All steps show at first, so the static page and a reader without JavaScript see the full result.
  const [shown, setShown] = useState(longest);
  const [playing, setPlaying] = useState(false);
  const [yours, setYours] = useState<DispatchOrder | undefined>(undefined);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    setYours(measureWindowOrder(window));
  }, []);

  useEffect(() => {
    if (!playing) return undefined;
    if (shown >= longest) {
      setPlaying(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setShown((value) => value + 1), shown === 0 ? 450 : STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playing, shown, longest]);

  const play = (): void => {
    setShown(0);
    setPlaying(true);
  };
  const next = (): void => {
    setPlaying(false);
    setShown((value) => (value >= longest ? 1 : value + 1));
  };

  return (
    <figure className={styles.figure} data-motion={reducedMotion ? "reduced" : "full"}>
      <div className={styles.toolbar}>
        <div className={styles.buttons}>
          <button type="button" className="button" data-variant="primary" onClick={play} disabled={playing}>
            {shown >= longest ? "Play the pagehide again" : "Play"}
          </button>
          <button type="button" className="button" onClick={next}>
            Next step
          </button>
        </div>
        <p className={styles.progress} aria-live="polite">
          {shown >= longest ? "All steps show." : `Step ${shown} of ${longest}.`}
        </p>
      </div>
      {yours === undefined ? null : (
        <p className={styles.yours}>
          <strong>Your browser:</strong>{" "}
          {yours === "registration"
            ? "a test on window started the listeners in the order of registration, as Chromium did in experiment E1."
            : "a test on window started the capture listener first, as Firefox and WebKit did in experiment E1."}
        </p>
      )}
      <ol className={styles.lanes}>
        {LANES.map((lane) => {
          const result = results.get(lane.id);
          if (!result) return null;
          const done = shown >= result.steps.length;
          const isYours = lane.order !== undefined && lane.order === yours;
          return (
            <li key={lane.id} className={styles.lane} data-complete={result.complete ? "" : undefined} data-yours={isYours ? "" : undefined}>
              <div className={styles.laneHead}>
                <h3 className={styles.laneTitle}>
                  {lane.title}
                  {isYours ? <span className={styles.yoursBadge}>Your browser</span> : null}
                </h3>
                <p className={styles.setup}>{lane.setup}</p>
              </div>
              <ol className={styles.steps}>
                <li className={styles.event} aria-label="The browser sends pagehide to window">
                  <code>pagehide</code>
                </li>
                {result.steps.map((step, index) => (
                  <li
                    key={index}
                    className={styles.step}
                    data-actor={step.actor}
                    data-shown={index < shown ? "" : undefined}
                    aria-hidden={index < shown ? undefined : true}
                  >
                    <span className={styles.number}>{index + 1}</span>
                    <span className={styles.actor}>{ACTOR_NAMES[step.actor]}</span>
                    <span className={styles.text}>{step.text}</span>
                    {step.sends ? <Batch values={step.sends} /> : null}
                  </li>
                ))}
              </ol>
              <p className={styles.result} data-shown={done ? "" : undefined} aria-hidden={done ? undefined : true}>
                <ResultIcon ok={result.complete} />
                {result.complete
                  ? `The batch has the final ${FINAL_VALUE}.`
                  : `The exporter sent the batch before the monitor recorded the final ${FINAL_VALUE}. The value is lost.`}
              </p>
            </li>
          );
        })}
      </ol>
      <figcaption className={styles.caption}>
        Each lane operates the real tracker on a model of <code>window</code> that starts the listeners in the order of experiment E1. The values are
        examples.
      </figcaption>
    </figure>
  );
}

export default ListenerOrder;
