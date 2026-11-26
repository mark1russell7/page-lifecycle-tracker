# Roadmap

This file is the plan of page-lifecycle-tracker. The Status page of the site reads it.

| ID | Item | Status | Summary |
| --- | --- | --- | --- |
| C1 | The conventions check in CI | in progress | CI starts `pnpm check:conventions`, the rules of `@mark1russell7/conventions`. The package has no console call. A new call fails at once, and each call fails from 2027-01-20. |
| C2 | The shared fake event target | later | The tests use `createFakeEventTarget` of `@mark1russell7/rigor-testkit/fakes` in place of the local copy (#82). |
| C3 | The API report in CI | later | The root script `check:api` compares the public API of the package with its report. Next, the repository keeps the report, and CI starts the script. |
| C4 | Playwright from the shared action in CI | later | The shared CI has no input for the action `setup-playwright`, so the setup line of `ci.yml` installs Chromium. When the shared CI gets that input, `ci.yml` uses it, and the exception of the rule `playwright-install` goes. |
| C5 | Typed keys of the CSS modules | later | `vite/client` types each CSS module of the site with an index signature, so a wrong class name is not a type error. The site tsconfig turns off `noPropertyAccessFromIndexSignature` for these reads. When each CSS module has a declaration with its class names, the option goes on, and the exception of the rule `cue-preset` goes. |
