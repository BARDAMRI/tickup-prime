# Contributing to TickUp Charts

Thank you for your interest in this open-source project.

## How to participate

Reach out or send contributions through any of these channels:

- **GitHub:** [github.com/BARDAMRI](https://github.com/BARDAMRI/) — open an [issue](https://github.com/BARDAMRI/tickup-charts/issues) or pull request on the [TickUp Charts](https://github.com/BARDAMRI/tickup-charts) repository.
- **Email:** [bardamri1702@gmail.com](mailto:bardamri1702@gmail.com)
- **Website:** [bardamri.com](https://bardamri.com)

## Before you open a PR

1. **Discuss** larger changes via an issue first when possible.
2. **Build and test** locally: `npm run build` and `npm test`.
3. **Match existing style** (TypeScript, React patterns, formatting used in `src/`).

## Package layout

- Default import **`tickup`** — canvas-focused API (`TickUpStage`, overlays, live data helpers, …).
- **`tickup/full`** — product shells (`TickUpHost`, `TickUpCommand`, …) and extended exports.

The example app under `example/` uses `tickup/full` for demos that include the full UI.

## Maintainers (repo collaborators)

Step-by-step **internal** runbooks live under **[`docs/internal/`](./docs/internal/README.md)**. That folder is **not** included in the npm package (see root `package.json` `"files"` and `.npmignore`). If the repository is **public** on GitHub, those files are still visible on the web—use a private repo or duplicate sensitive process docs elsewhere if required.

### Automated versioning (this repo)

The **[`Sync TickUp Core`](./.github/workflows/sync-core.yml)** workflow runs on **every push to `main`**, on **`repository_dispatch`** (`core_updated`), and on **manual `workflow_dispatch`**. Before committing dependency updates, it runs **`npm version patch --no-git-tag-version`** so the root **`package.json`** patch version always advances. The bot commit message ends with **`[skip ci]`** so that push does not re-trigger the same workflow (no infinite loop). You normally do **not** need to hand-edit the package version for routine merges to `main`.

## License

By contributing, you agree that your contributions will be licensed under the same terms as the project ([MIT](./LICENSE)).
