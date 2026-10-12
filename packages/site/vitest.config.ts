import { playwright } from "@vitest/browser-playwright";
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";
import { BROWSER_HOST, freePorts } from "./build/free-port.ts";

// The browser server gets a free port, not the default port of Vitest (refer to build/free-port.ts)
const browserPort = await freePorts()();

/**
 * The tests of the site. The Node.js project examines the build helpers and
 * the pure modules of the app. The browser project renders each route in
 * Chromium, with the real library.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: "site (node)",
            environment: "node",
            include: ["build/**/*.test.ts", "src/**/*.test.{ts,tsx}"],
            exclude: ["**/node_modules/**", "**/*.browser.test.{ts,tsx}"],
          },
        },
        {
          extends: true,
          test: {
            name: "site (browser)",
            include: ["src/**/*.browser.test.{ts,tsx}"],
            testTimeout: 60_000,
            // In Vitest 5, the browser server takes its port from the api option of the project
            api: { host: BROWSER_HOST, port: browserPort, strictPort: true },
            browser: {
              enabled: true,
              headless: true,
              provider: playwright(),
              screenshotFailures: false,
              instances: [{ browser: "chromium" }],
            },
          },
        },
      ],
    },
  }),
);
