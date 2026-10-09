# page-lifecycle-tracker

[![npm](https://img.shields.io/npm/v/page-lifecycle-tracker)](https://www.npmjs.com/package/page-lifecycle-tracker)
[![CI](https://github.com/mark1russell7/page-lifecycle-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/mark1russell7/page-lifecycle-tracker/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/page-lifecycle-tracker)](https://github.com/mark1russell7/page-lifecycle-tracker/blob/main/LICENSE)

`page-lifecycle-tracker` follows the state of a web page in the [Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api): `active`, `passive`, `hidden`, `frozen` and `terminated`. It is for libraries that measure a page and send telemetry, for example real-user monitoring and OpenTelemetry exporters.

The website has a live state diagram of your own tab, guides and the API reference: <https://mark1russell7.github.io/page-lifecycle-tracker/>.

```ts
import { getPageLifecycle } from "page-lifecycle-tracker";

const lifecycle = getPageLifecycle();

lifecycle.subscribe(({ from, to, trigger }) => {
  console.log(`${from} → ${to} (${trigger})`); // active → hidden (visibilitychange)
});
```

## Why this library

- **One tracker for the page.** `getPageLifecycle()` gives the same tracker to each library of the page, also to two copies of the package. Thus the libraries see the same transitions in the same sequence.
- **Monitors before exporters.** A subscriber in the `export` phase starts after all subscribers in the `observe` phase. Thus the final values of the monitors go into the last export of the page, in each browser. Chromium starts the `pagehide` listeners of `window` in the sequence of their registration. An exporter that listens to `pagehide` itself can send the data before the monitors record it.
- **The back/forward cache.** A `pagehide` with `persisted` gives the state `frozen`. A restore (`pageshow` with `persisted`) is always a transition, also when the state does not change.
- **The time of the event.** Each transition has the `timeStamp` of its browser event, not the time at which the script handled it.
- **Marks.** `mark()` and `resolve()` give the transitions of a measurement window. A monitor can discard a sample when the page was hidden or frozen during the window.
- **No dependencies.** The package is small, and it has no side effects at import.

## Install

```sh
npm install page-lifecycle-tracker
```

The package is an ES module. It operates in all browsers that have the `visibilitychange` event.

## Use

### Follow the state

```ts
import { getPageLifecycle, isVisibleState } from "page-lifecycle-tracker";

const lifecycle = getPageLifecycle();
if (!isVisibleState(lifecycle.getState())) pauseAnimations();

const unsubscribe = lifecycle.subscribe(({ to }) => {
  if (isVisibleState(to)) resumeAnimations();
  else pauseAnimations();
});
```

`getState()` reads `document.visibilityState` again at each call. The browser changes `visibilityState` before it sends `visibilitychange`, thus a timer callback between the two also sees the page as hidden.

### Send telemetry at the end of the page

```ts
lifecycle.subscribe(({ to }) => {
  if (to === "hidden" || to === "frozen") exporter.flush();
  if (to === "terminated") exporter.shutdown();
}, { phase: "export" });
```

The `observe` subscribers of the same transition start first, whatever the sequence of the subscriptions.

### Discard the samples of a window with a change of state

```ts
import { summarizeTransitions } from "page-lifecycle-tracker";

const mark = lifecycle.mark();
const start = performance.now();
await measure();
const changes = summarizeTransitions(lifecycle.resolve(mark));
if (changes.wasHidden || changes.wasFrozen) discardSample();
```

Resolve or cancel each mark. The tracker keeps the transitions only while a mark is open.

### Handle an event first

An exporter that must keep its own `pagehide` listener can give the event to the tracker first:

```ts
addEventListener("pagehide", (event) => {
  lifecycle.handle(event); // the subscribers record the end of the page now
  exporter.shutdown();
});
```

The tracker handles each event object one time. Its own listener then ignores the event.

## API

| Export | What it does |
|---|---|
| `getPageLifecycle(options?)` | Gives the shared tracker of the page. The first use makes it with `options`. |
| `createPageLifecycle(options?)` | Makes a new tracker that the page does not share. The defaults are `document`, `globalThis` and `performance`. |
| `PageLifecycle` | The tracker: `getState()`, `subscribe(listener, { phase })`, `mark()`, `resolve(mark)`, `cancel(mark)`, `handle(event)`, `dispose()`. |
| `isVisibleState(state)` | True for `active` and `passive`. |
| `summarizeTransitions(transitions)` | Gives `wasHidden`, `wasFrozen`, `wasTerminated`, `wasRestoredFromBFCache`, `wasFocused`, `wasBlurred` and `transitionCount`. |
| `eventTime(event, now)` | The `timeStamp` of an event, or `now` when the time stamp is not in `performance.now()` time. |
| `resetSharedPageLifecycle()` | Removes and disposes of the shared tracker. Tests use it. |

## The states

| State | Meaning | Triggers into the state |
|---|---|---|
| `active` | The page is visible and has the input focus. | `focus`, `visibilitychange`, `pageshow` |
| `passive` | The page is visible, but another window or frame has the focus. | `blur`, `visibilitychange`, `pageshow` |
| `hidden` | The page is not visible. | `visibilitychange`, `resume` |
| `frozen` | The browser stopped the tasks of the page, or the page is in the back/forward cache. | `freeze`, `pagehide` with `persisted` |
| `terminated` | The page unloads. | `pagehide` without `persisted` |

Only Chromium sends `freeze` and `resume`. In Firefox and Safari, the page becomes `frozen` only at a `pagehide` with `persisted`. The tracker does not listen to `beforeunload` or `unload`, because they can stop the back/forward cache.

## Origin

The tracker comes from [lag](https://github.com/mark1russell7/lag), a library that measures the lag of the main thread in browsers. The tests of lag operate it in Chromium, Firefox, WebKit, Chrome, Safari and Safari on iOS.

## License

MIT
