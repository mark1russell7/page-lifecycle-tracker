# page-lifecycle-tracker

[![npm](https://img.shields.io/npm/v/page-lifecycle-tracker)](https://www.npmjs.com/package/page-lifecycle-tracker)
[![CI](https://github.com/mark1russell7/page-lifecycle-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/mark1russell7/page-lifecycle-tracker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

The state of a web page in the Page Lifecycle API, for monitoring and telemetry libraries. The package is in [`packages/page-lifecycle-tracker`](packages/page-lifecycle-tracker), and its README describes it. The website is in [`packages/site`](packages/site): <https://mark1russell7.github.io/page-lifecycle-tracker/>.

## Develop

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm lint:ste
```

- `pnpm --filter page-lifecycle-tracker build` writes the npm build to `packages/page-lifecycle-tracker/dist`.
- `pnpm --filter ./packages/site dev` starts the website.

## Release

1. Set the version in `packages/page-lifecycle-tracker/package.json`.
2. Push a tag with the same version, for example `v0.2.0`.

The workflow `release.yml` tests the package and publishes it to npm with a provenance statement.
