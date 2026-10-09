import type { MDXComponents } from "mdx/types";
import { createElement, lazy, Suspense, type ComponentType } from "react";
import { Callout } from "../components/Callout.tsx";
import { CodeBlock } from "../components/CodeBlock.tsx";
import { MdxLink } from "../components/MdxLink.tsx";
import { MarkdownTable } from "../components/ScrollTable.tsx";
import { Tab, Tabs } from "../components/Tabs.tsx";
import { LiveState } from "../live/LiveState.tsx";

/** This function wraps a large component, so that its code loads only when a page uses it. */
function lazyComponent<P extends object>(load: () => Promise<{ default: ComponentType<P> }>, loadingText: string): ComponentType<P> {
  const Lazy = lazy(load);
  function LazyComponent(props: P) {
    return (
      <Suspense
        fallback={
          <p aria-busy="true" data-loading="">
            {loadingText}
          </p>
        }
      >
        {createElement(Lazy, props)}
      </Suspense>
    );
  }
  return LazyComponent;
}

const LifecycleSimulator = lazyComponent<object>(() => import("../live/LifecycleSimulator.tsx"), "The simulator loads.");
const ListenerOrder = lazyComponent<object>(() => import("../live/ListenerOrder.tsx"), "The animation of the listener order loads.");

/**
 * The components that MDX pages can use without an import. To add a
 * component, import it and add one line here.
 */
export const mdxComponents = {
  // The overrides of Markdown elements
  a: MdxLink,
  pre: CodeBlock,
  table: MarkdownTable,

  // The components, in alphabetical order
  Callout,
  LifecycleSimulator,
  ListenerOrder,
  LiveState,
  Tab,
  Tabs,
} satisfies MDXComponents;
