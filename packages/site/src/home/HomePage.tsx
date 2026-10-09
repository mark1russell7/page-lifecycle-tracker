import { lazy, Suspense, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router";
import { SITE_NAME } from "../app/site.ts";
import { mdxComponents } from "../mdx/component-map.tsx";
import { LiveInstrument } from "../live/LiveInstrument.tsx";
import { stateColor } from "../live/states.ts";
import { currentState, useVisitEvents } from "../live/use-visit.ts";
import Example from "./example.mdx";
import { InstallCommand } from "./InstallCommand.tsx";
import styles from "./Home.module.css";

const ListenerOrder = lazy(() => import("../live/ListenerOrder.tsx"));

type Feature = { name: ReactNode; text: ReactNode; to: string; link: string };

const FEATURES: readonly Feature[] = [
  {
    name: <code>getState()</code>,
    text: (
      <>
        The current state. Each call reads <code>document.visibilityState</code> again, thus a timer between the change and its{" "}
        <code>visibilitychange</code> event also gets <code>hidden</code>.
      </>
    ),
    to: "/docs/concepts/states-and-transitions",
    link: "States and transitions",
  },
  {
    name: (
      <>
        <code>subscribe(listener, {"{ phase }"})</code>
      </>
    ),
    text: (
      <>
        All <code>observe</code> subscribers of a transition start before all <code>export</code> subscribers, whatever the order of the scripts.
      </>
    ),
    to: "/docs/concepts/shared-tracker-and-phases",
    link: "The subscriber phases",
  },
  {
    name: <code>getPageLifecycle()</code>,
    text: <>One tracker for the page, under a global symbol. Two libraries, or two copies of the package, share it.</>,
    to: "/docs/concepts/shared-tracker-and-phases",
    link: "The shared tracker",
  },
  {
    name: <code>handle(event)</code>,
    text: <>An exporter whose own listener starts first gives the event to the tracker. The tracker handles each event object one time.</>,
    to: "/docs/concepts/listener-order",
    link: "Capture phase and listener order",
  },
  {
    name: (
      <>
        <code>mark()</code> and <code>resolve()</code>
      </>
    ),
    text: (
      <>
        Ask which transitions occurred in a measurement window. <code>summarizeTransitions()</code> gives flags, for example <code>wasHidden</code>.
      </>
    ),
    to: "/docs/concepts/marks",
    link: "Marks",
  },
  {
    name: <>Back/forward cache</>,
    text: (
      <>
        A restore from the bfcache is always a transition with the trigger <code>pageshow</code>, also when the state was visible already.
      </>
    ),
    to: "/docs/concepts/back-forward-cache",
    link: "Back/forward cache restores",
  },
];

const READ_NEXT: readonly { title: string; links: readonly { to: string; label: string }[] }[] = [
  {
    title: "Concepts",
    links: [
      { to: "/docs/concepts/states-and-transitions", label: "States and transitions, with a simulator" },
      { to: "/docs/concepts/listener-order", label: "Capture phase and listener order" },
      { to: "/docs/concepts/back-forward-cache", label: "Back/forward cache and pagehide" },
      { to: "/docs/concepts/freeze-and-resume", label: "The freeze event and the resume event" },
    ],
  },
  {
    title: "Recipes",
    links: [
      { to: "/docs/recipes/flush-opentelemetry", label: "Flush OpenTelemetry at the end of the page" },
      { to: "/docs/recipes/pause-timers-while-hidden", label: "Pause timers while the page is hidden" },
      { to: "/docs/recipes/discard-samples-with-marks", label: "Discard the samples of a hidden window" },
      { to: "/docs/recipes/detect-bfcache-restore", label: "Detect a back/forward cache restore" },
    ],
  },
  {
    title: "Reference",
    links: [
      { to: "/docs/api", label: "API reference" },
      { to: "/docs/browser-support", label: "Browser support" },
      { to: "/docs/getting-started", label: "Getting started" },
    ],
  },
];

type Style = CSSProperties & Record<`--${string}`, string>;

/** The home page: the live instrument, an example, the listener order, the features and the documentation. */
export function HomePage() {
  // The light behind the hero has the color of the current state of this page.
  const state = currentState(useVisitEvents());
  return (
    <div className={styles.page}>
      <title>{`${SITE_NAME}: Page Lifecycle API state for JavaScript`}</title>
      <section className={styles.hero} aria-labelledby="home-title" style={{ "--hero-glow": stateColor(state) } as Style}>
        <div className={styles.heroHead}>
          <h1 id="home-title" className={styles.title}>
            Follow a web page through the Page Lifecycle API
          </h1>
          <div className={styles.heroAside}>
            <p className={styles.lead}>
              <code>{SITE_NAME}</code> is a small TypeScript library for monitoring and telemetry code. It follows <code>active</code>,{" "}
              <code>passive</code>, <code>hidden</code>, <code>frozen</code> and <code>terminated</code>. Your monitors record their last values before
              your exporter sends them.
            </p>
            <InstallCommand />
            <p className={styles.actions}>
              <Link className="button" data-variant="primary" to="/docs/getting-started">
                Read the guide
              </Link>
              <Link className="button" to="/docs/api">
                Read the API reference
              </Link>
            </p>
          </div>
        </div>
        <LiveInstrument />
      </section>

      <section className={styles.example} aria-labelledby="example-title">
        <div className={styles.exampleText}>
          <h2 id="example-title" className={styles.sectionTitle}>
            Start with a few lines
          </h2>
          <p>
            Get the shared tracker. Read the state, and subscribe to each transition. Each transition has <code>from</code>, <code>to</code>,{" "}
            <code>trigger</code> and the <code>timeStamp</code> of its browser event.
          </p>
          <p>
            The package is ESM, with TypeScript types and no dependencies. It uses <code>visibilitychange</code>, <code>pagehide</code>,{" "}
            <code>pageshow</code>, <code>freeze</code> and <code>resume</code>, and no <code>unload</code> listener.
          </p>
          <p>
            <Link to="/docs/getting-started">Read the full guide</Link>
          </p>
        </div>
        <div className={`prose ${styles.exampleCode}`}>
          <Example components={mdxComponents} />
        </div>
      </section>

      <section className={styles.order} aria-labelledby="order-title">
        <div className={styles.orderText}>
          <h2 id="order-title" className={styles.sectionTitle}>
            Observers before exporters at pagehide, in Chromium too
          </h2>
          <p>
            At the end of a page, a monitor records its final values, and an exporter sends the last batch. The order of these two listeners decides
            if the final values get out.
          </p>
          <p>
            In experiment E1 of the <code>lag</code> project, Chromium started the <code>pagehide</code> listeners of <code>window</code> in the order of
            registration. Firefox and WebKit started the capture listeners first. Play one <code>pagehide</code> in the four setups.
          </p>
        </div>
        <Suspense
          fallback={
            <p className={styles.loading} aria-busy="true" data-loading="">
              The animation of the listener order loads.
            </p>
          }
        >
          <ListenerOrder />
        </Suspense>
      </section>

      <section className={styles.features} aria-labelledby="features-title">
        <h2 id="features-title" className={styles.sectionTitle}>
          visibilitychange, pagehide, freeze and the bfcache in one API
        </h2>
        <dl className={styles.featureList}>
          {FEATURES.map((feature) => (
            <div key={feature.link} className={styles.feature}>
              <dt className={styles.featureName}>{feature.name}</dt>
              <dd className={styles.featureText}>
                <p>{feature.text}</p>
                <Link to={feature.to}>{feature.link}</Link>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.next} aria-labelledby="next-title">
        <h2 id="next-title" className={styles.sectionTitle}>
          Read the documentation
        </h2>
        <div className={styles.nextGroups}>
          {READ_NEXT.map((group) => (
            <nav key={group.title} aria-label={group.title} className={styles.nextGroup}>
              <h3 className={styles.nextTitle}>{group.title}</h3>
              <ul>
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </section>
    </div>
  );
}
