# tickup Prime documentation

Private docs for the `@tickup/prime` package.

This package extends the public `tickup` core with premium rendering and pro feature guides.

The **reference example app** in [`../example/`](../example/) (Vite + React) exercises all product tiers, `chartOptions`, the compact symbol strip on Pulse, host symbol callbacks, and the imperative ref API; see [`../example/README.md`](../example/README.md). The example app itself is **not** published to npm.

## Contents

| # | Guide | Description |
|---|--------|-------------|
| 1 | [Glossary](./01-glossary.md) | Terms: intervals, ranges, products, placements, etc. |
| 2 | [Installation](./02-installation.md) | Peer dependencies, package install, styled-components |
| 3 | [Quick start](./03-quick-start.md) | Minimal embed, ref, controlled data |
| 4 | [Products & layout](./04-products-and-layout.md) | Pulse, Flow, Command, Desk; toolbars (public line) |
| 5 | [Props & chart options](./05-props-and-chart-options.md) | `TickUpHost`, `chartOptions`, shell theme + chart theme |
| 6 | [Imperative API](./06-imperative-api.md) | Ref handle: shapes, data, **`getVisibleRanges()`**, **`getCanvasSize()`**, view, context |
| 7 | [Data & live updates](./07-data-and-live-updates.md) | `intervalsArray`, `applyLiveData`, merge helpers |
| 8 | [Drawings & shapes](./08-drawings-and-shapes.md) | Toolbar tools, select/edit, programmatic shapes & patches |
| 9 | [Settings modal](./09-settings-modal.md) | In-app settings categories and persistence |
| 10 | [Toolbar & interactions](./10-toolbar-and-interactions.md) | Chart type, snapshot, crosshair, tooltip, pan/zoom |
| 11 | [Exports & advanced](./11-exports-and-advanced.md) | Full export list, `TickUpStage`, branding, init/update |
| 12 | [Overlays & indicators](./12-overlays-and-indicators.md) | SMA/EMA/VWAP/Bollinger, `overlays` / `overlayKinds` |
| 13 | [i18n & axes](./13-internationalization-and-axes.md) | Locale, RTL, currency, sessions, grid |
| 14 | [Legal & policies](./14-legal-and-policies.md) | Terms of Service, Privacy, Acceptable Use templates (`legal/`) |
| 15 | [Prime engine & Pro roadmap](./15-prime-engine-and-pro-roadmap.md) | Prime render profile, engine usage, roadmap |
| 16 | [Custom neon themes](./16-custom-neon-themes.md) | How to build and switch premium neon visual variants |
| 17 | [Prime enterprise — performance, features & licensing](./17-prime-enterprise-performance-security.md) | WebGL2 scale, unlimited history, magnet/VWAP/neon, local HMAC licensing, Comparison Lab benchmarking |

Prime package roadmap: [`../Roadmap.md`](../Roadmap.md)

## Older material

Additional notes and legacy pages may still live under [`../docs/`](../docs/) (roadmap, contributing, design). The **authoritative integration reference** is this `documentation/` folder.
