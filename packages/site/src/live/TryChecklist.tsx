import type { ReactNode } from "react";
import type { VisitEvent } from "./visit.ts";
import styles from "./LiveInstrument.module.css";

/** The results of the three experiments of the home page, from the events of the visit. */
export type ExperimentResults = {
  blurred: boolean;
  hiddenAndBack: boolean;
  restored: boolean;
  /** True if the page loaded again after a Back navigation, with no restore from the back/forward cache after it. */
  loadedAgain: boolean;
};

/** This function finds which experiments the visitor did. */
export function experimentResults(events: readonly VisitEvent[]): ExperimentResults {
  let loadedAgain = false;
  let restored = false;
  events.forEach((event, index) => {
    if (event.kind === "load" && index > 0 && event.navigation === "back_forward") loadedAgain = true;
    if (event.kind === "transition" && event.trigger === "pageshow") {
      restored = true;
      loadedAgain = false;
    }
  });
  return {
    blurred: events.some((event) => event.kind === "transition" && event.trigger === "blur"),
    hiddenAndBack: events.some((event) => event.kind === "transition" && event.from === "hidden" && (event.to === "active" || event.to === "passive")),
    restored,
    loadedAgain,
  };
}

function Check({ done }: { done: boolean }) {
  return (
    <svg className={styles.check} viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" data-done={done ? "" : undefined}>
      <circle cx="10" cy="10" r="8.5" />
      {done ? <path d="M6 10.4l2.6 2.6L14.2 7.4" /> : null}
    </svg>
  );
}

function Item({ done, children, result }: { done: boolean; children: ReactNode; result: string }) {
  return (
    <li className={styles.item} data-done={done ? "" : undefined}>
      <Check done={done} />
      <div>
        <p className={styles.itemText}>{children}</p>
        <p className={styles.itemResult}>
          <span className="visually-hidden">{done ? "Done. " : "Not done. "}</span>
          {result}
        </p>
      </div>
    </li>
  );
}

/** The experiments that the home page asks the visitor to do. Each item becomes done when its transition occurs. */
export function TryChecklist({ events, awayHref }: { events: readonly VisitEvent[]; awayHref: string }) {
  const results = experimentResults(events);
  return (
    <ul className={styles.checklist}>
      <Item done={results.blurred} result={results.blurred ? "You got blur: active to passive." : "Expect active to passive, from blur."}>
        Click outside the browser window. Then click in the page again.
      </Item>
      <Item
        done={results.hiddenAndBack}
        result={results.hiddenAndBack ? "You got visibilitychange two times." : "Expect hidden, then active again, from visibilitychange."}
      >
        Go to another tab or app, or minimize the window. Then come back.
      </Item>
      <Item
        done={results.restored}
        result={
          results.restored
            ? "The browser restored the page from the back/forward cache: pageshow."
            : results.loadedAgain
              ? "The browser loaded the page again. It did not restore the page from the back/forward cache."
              : "Expect frozen, then a restore from pageshow."
        }
      >
        <a href={awayHref}>Leave this page</a>, then come back with the Back button of the browser.
      </Item>
    </ul>
  );
}
