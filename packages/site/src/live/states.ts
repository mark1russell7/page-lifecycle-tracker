import type { LifecycleState, LifecycleTrigger } from "page-lifecycle-tracker";

/** The five states, in the order of the legend and of the tables. */
export const STATES: readonly LifecycleState[] = ["active", "passive", "hidden", "frozen", "terminated"];

/** The text of a state for the site. Each state also has the CSS tokens `--state-<name>` and `--state-<name>-wash`. */
export type StateText = {
  /** A short fragment for the diagram, for example "Visible, with the focus". */
  summary: string;
  /** One sentence for the status line, without the state name. */
  sentence: string;
};

export const STATE_TEXT: Readonly<Record<LifecycleState, StateText>> = {
  active: { summary: "Visible, with the focus", sentence: "The page is visible, and it has the focus." },
  passive: { summary: "Visible, no focus", sentence: "The page is visible, but another window has the focus." },
  hidden: { summary: "Not visible", sentence: "The page is not visible, for example in a background tab." },
  frozen: { summary: "Tasks stopped", sentence: "The browser stopped the tasks of the page." },
  terminated: { summary: "Unloaded", sentence: "The page unloads. No later transition can occur." },
};

/** The CSS color of a state. */
export function stateColor(state: LifecycleState): string {
  return `var(--state-${state})`;
}

/** The light CSS color of a state, for the fill behind text. */
export function stateWash(state: LifecycleState): string {
  return `var(--state-${state}-wash)`;
}

/** The events that cause the transitions, in the order of the tables. */
export const TRIGGERS: readonly LifecycleTrigger[] = ["focus", "blur", "visibilitychange", "freeze", "resume", "pagehide", "pageshow"];

/** True if `value` is the name of a state. */
export function isLifecycleState(value: unknown): value is LifecycleState {
  return typeof value === "string" && (STATES as readonly string[]).includes(value);
}

/** True if `value` is the name of a trigger. */
export function isLifecycleTrigger(value: unknown): value is LifecycleTrigger {
  return typeof value === "string" && (TRIGGERS as readonly string[]).includes(value);
}
