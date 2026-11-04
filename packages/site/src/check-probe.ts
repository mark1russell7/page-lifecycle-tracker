/**
 * The probe of the simulator. The site check of the Pages workflow starts it in a browser at each width, before the
 * deploy. A failed check stops the deploy.
 *
 * The probe drives the core of the site: the real tracker on a simulated page. Each event moves the state, the end of
 * the page stops the buttons, and the reset gives a new page.
 *
 * The site check reads this TypeScript file directly. It removes the types and the `export` line, and it starts the
 * result as the body of an async function.
 */

// The site check gives these helpers to the probe.
declare const check: (name: string, ok: unknown, detail?: unknown) => boolean;
declare const until: <T>(fn: () => T | Promise<T>, ms?: number) => Promise<T>;
declare const $: (selector: string) => Element | null;
declare const $$: (selector: string) => Element[];
declare const click: (target: string | Element) => void;

const CONTROLS = '[aria-label="Events for the simulated page"]';
const LOG = '[aria-label="The events of the simulator"]';

/** This function gives the button of an event. The label is the first element of the button. */
const button = (label: string): HTMLButtonElement | undefined =>
  $$(`${CONTROLS} button`).find((b) => b.firstElementChild?.textContent === label) as HTMLButtonElement | undefined;
/** This function gives the state that the tracker of the simulated page tells. */
const state = (): string => {
  const term = $$("dt").find((dt) => dt.textContent === "tracker.getState()");
  return term?.nextElementSibling?.textContent?.replaceAll('"', "").trim() ?? "";
};
/** This function gives the count of rows in the log of events. */
const logged = (): number => $$(`${LOG} tbody tr`).length;

/** This function sends an event, and it checks the state that the event gives. */
const send = async (label: string, next: string): Promise<void> => {
  click(button(label) as Element);
  check(`the event ${label} gives the state ${next}`, await until(() => state() === next), state());
};

check("the simulator starts", await until(() => $(CONTROLS) !== null), $("main")?.textContent?.slice(0, 200));
check("a new page is active", await until(() => state() === "active"), state());
check("a new page has no events", logged() === 0, logged());

await send("blur", "passive");
await send("visibilitychange (to hidden)", "hidden");
await send("freeze", "frozen");
await send("resume", "hidden");
check("the log shows each event", await until(() => logged() === 4), logged());

// The end of the page stops each button of an event.
await send("pagehide", "terminated");
check("a page that ended takes no event", await until(() => $$(`${CONTROLS} button`).every((b) => (b as HTMLButtonElement).disabled)), $(`${CONTROLS}`)?.textContent);
check("a page that ended says so", $('[role="status"]')?.textContent?.includes("terminated"), $('[role="status"]')?.textContent);

// The reset gives a new page.
click($$("button").find((b) => b.textContent?.trim() === "Reset the simulator") as Element);
check("the reset gives a new page", await until(() => state() === "active" && logged() === 0), state());

export {};
