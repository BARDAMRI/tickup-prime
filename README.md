# TickUp Prime: The High-Performance WebGL Engine for Professional Trading Platforms

TickUp Prime is the **commercial, proprietary tier** of TickUp Charts. It targets desks and fintech products that need **10×-class throughput** versus Core, **institutional overlays**, and a **polished pro visual system**—with **local-only license verification** and **no telemetry** of your market data.

Showcase: [https://BARDAMRI.github.io/tickup-charts/](https://BARDAMRI.github.io/tickup-charts/)

---

## Why Prime Wins

| Capability | Core | Prime (licensed + WebGL2) |
|------------|------|---------------------------|
| History in render path | Last **5,000** candles | **Unlimited** (100k+ bars; WebGL batching) |
| Data commit rate | **~1 Hz** throttle | **Native refresh** (60fps with your feed) |
| VWAP (UTC daily reset) | — | **Institutional VWAP** in overlay pipeline |
| Drawing magnet | — | **OHLC snap** to the bar under the crosshair |
| Visuals | Standard | **Neon luxury** (high-saturation candles + glow overlays/drawings) |
| Evaluation watermark | N/A | **Removed** when the license validates |

---

## WebGL 2.0 Acceleration

Prime’s commercial path **requires WebGL 2.0**. The renderer targets GPU-backed batches so large series stay interactive at **60 FPS-class** refresh when your feed allows it, including **100k+** candles on capable hardware. If WebGL2 is unavailable, Prime falls back to a **blocked / evaluation** posture (watermark + Core-style limits) so behavior stays predictable. Deeper technical and benchmarking notes: [enterprise guide](./documentation/17-prime-enterprise-performance-security.md).

---

## Magnetic Snapping (Pro)

Drawing tools, when magnet is enabled for licensed Prime, snap prices to the **nearest OHLC** of the candle **anchored to crosshair time** (last bar with `t ≤` crosshair time on a sorted series). That keeps trendlines and zones aligned with the same price action you see on the candles.

---

## Institutional Indicators: VWAP Pro

Prime ships **VWAP** with **UTC daily session reset**: typical price \((H+L+C)/3\) weighted by volume, cumulative within each UTC day. It is injected into the overlay stack when your license unlocks Prime styling (see `TickUpHost` merge logic).

---

## Neon Luxury Polish

With a valid Prime unlock, the host merges a **neon palette** (e.g. high-saturation bull/bear) and **glow** on overlays and drawing chrome—distinct from Core’s flatter look.

---

## Local activation (`licenseKey` + `licenseUserIdentifier`)

Install Core (peer) and Prime:

```bash
npm install tickup @tickup/prime
```

**Option A — async HMAC check (recommended):**

```tsx
import { TickUpHost } from 'tickup/full';
import { createTickUpPrimeEngine, validateLicense } from '@tickup/prime';

const licenseKey = 'TKUP-PRO-<YOUR_SIGNATURE>';
const licenseUserIdentifier = 'trader@yourfirm.com';

const ok = await validateLicense(licenseKey, licenseUserIdentifier);

<TickUpHost
  intervalsArray={data}
  chartOptions={createTickUpPrimeEngine().getChartOptionsPatch()}
  licenseKey={licenseKey}
  licenseUserIdentifier={licenseUserIdentifier}
  licenseValidationOverride={ok}
/>;
```

**Option B — trust server-side validation and pass the result:**

```tsx
<TickUpHost
  chartOptions={createTickUpPrimeEngine().getChartOptionsPatch()}
  licenseKey={licenseKey}
  licenseUserIdentifier={licenseUserIdentifier}
  licenseValidationOverride={true}
/>
```

When `licenseValidationOverride` is `true`, evaluation UI and watermarks clear **immediately** (no full reload required).

---

## Privacy & security

- License checks use **local HMAC-SHA256** verification compatible with issued `TKUP-…` keys. **No chart data** and **no OHLC series** are sent to TickUp or third parties for validation.
- Your app decides when to call `validateLicense` and what to pass into `licenseValidationOverride`.

---

## npm package contents (proprietary build)

The published package **`files`** field ships **`dist/`** (bundled **obfuscated** ESM/CJS via `vite-plugin-javascript-obfuscator`), **TypeScript declarations**, plus `LICENSE` and this `README`. **Source under `src/` is not published**—clone access is separate from the customer tarball.

```bash
npm run build
```

Runs `tsc`, dual Vite library builds (`TICKUP_LIB_ENTRY=index|full`), and declaration emit. Set `TICKUP_SKIP_OBFUSCATE=1` only for local debugging.

---

## Local comparison lab (Core vs Prime)

The **`example/`** app includes a **Comparison** view: left pane pulls **`tickup-core-final`** from your disk (5k cap / 1Hz behavior), right pane runs **this repo’s Prime** build with **telemetry** (Core 1 Hz heartbeat vs Prime FPS clock). Use it to demo the performance gap on your machine.

---

## Documentation & support

- **Enterprise / integration depth:** [`documentation/17-prime-enterprise-performance-security.md`](./documentation/17-prime-enterprise-performance-security.md) — WebGL2 & 100k+ scale, unlimited Prime history, magnet & VWAP, local HMAC licensing, watermark troubleshooting, Comparison Lab benchmarking.
- **Integration recipes & edge cases:** [`documentation/18-prime-integration-recipes-and-edge-cases.md`](./documentation/18-prime-integration-recipes-and-edge-cases.md) — runtime Core ↔ Prime swap, offline cached license, WebGL blocked behavior, heavy overlays, neon presets.
- Docs hub: [https://BARDAMRI.github.io/tickup-charts/](https://BARDAMRI.github.io/tickup-charts/)
- Full package index: [`documentation/README.md`](./documentation/README.md)
- Roadmap: [`Roadmap.md`](./Roadmap.md)
- Commercial licensing: `bardamri1702@gmail.com`
