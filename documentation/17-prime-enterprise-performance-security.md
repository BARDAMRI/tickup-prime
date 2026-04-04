# Prime enterprise guide — performance, exclusive features & licensing

This guide is the **integration-facing reference** for teams shipping TickUp Prime in production: why WebGL2 and unlimited history matter, how Pro-only drawing and indicators behave, how **local** license validation works, and how to **stress-test** Core vs Prime.

---

## 1. Prime power — performance & scale

### Why WebGL 2.0 matters

Prime’s commercial rendering path targets **WebGL 2.0**. The engine batches large OHLC series on the GPU instead of repainting the full history on a 2D canvas every frame. That matters because:

- **Frame budget:** At 60 FPS you have ~16 ms per frame. CPU canvas paths that walk tens of thousands of segments per paint become the bottleneck; GPU instancing/batching amortizes that work.
- **Interaction:** Pan, zoom, and crosshair updates stay responsive when the plotted domain still contains **100k+** candles, because the heavy lifting stays on the graphics pipeline your users already have.
- **Predictability:** If WebGL2 is **not** available, Prime runs in an **evaluation / blocked** posture: evaluation watermark plus **Core-style** limits (history cap and ~1 Hz data commit throttle) so behavior stays safe and comparable to Standard tier.

### Unlimited history (no Prime data cap)

When **all** of the following are true, the chart data hook runs in **full-performance Prime mode** (`primePerformanceUnlocked`):

- `chartOptions.base.engine === 'prime'`
- A **valid** license (see [§3](#3-licensing-integration-security-guide))
- **WebGL 2.0** available in the browser

In that mode:

- There is **no** artificial truncation of `intervalsArray` to 5,000 bars for rendering.
- There is **no** Core ~1 Hz throttle on committing data to the render context — your feed can drive **native refresh rates** (e.g. 60 Hz) and the chart can keep up, subject to device limits.

**Contrast:** Standard Core (or evaluation Prime) keeps the **last 5,000** candles in the render pipeline and batches full commits at **~1 Hz**. See [Data & live updates](./07-data-and-live-updates.md).

### WebGL optimization tips (developers & power users)

Prime cannot exceed what the **browser + GPU + OS** provide. Use this checklist when profiling **60 FPS-class** behavior with **100k+** candles:

| Area | Recommendation |
|------|------------------|
| **GPU & drivers** | Prefer **discrete GPU** on laptops; install current vendor drivers. Corporate images sometimes ship outdated drivers that throttle WebGL. |
| **Browser** | Use a **current Chromium-class** or **Firefox** build with **hardware acceleration** enabled. Disable “use software rendering only” in browser flags/settings when safe for your policy. |
| **Power** | On battery, OS **power saving** may downclock the GPU — test **plugged in** for representative desk performance. |
| **Display** | Very high **refresh rates** (120 Hz+) still help pan/zoom feel; the chart’s work scales with **data + pixels**, not only Hz — reduce **browser zoom** if the page is scaled up (more pixels to fill). |
| **DevTools** | **Close** Performance / Debugger heavy panels while measuring; DevTools can cap frame rate. Prefer **throttling off** when validating peak FPS. |
| **Context loss** | If users **sleep/resume** or **RDP** into a session, WebGL contexts can be lost — your app may need a **reload** path; watch for canvas errors in support logs. |
| **Other tabs** | Competing WebGL / video decode tabs share the same GPU budget — document **single-chart** vs **multi-chart** expectations for terminal layouts. |

If WebGL2 is blocked after optimization, Prime remains in **evaluation** mode (see [§3](#3-licensing-integration-security-guide)); do not assume commercial performance.

---

## 2. Exclusive feature manual

### 2.1 Magnetic snapping — engine physics

**Purpose:** While drawing (e.g. trend lines), the **Y** coordinate under the pointer can **snap** to a real **OHLC** level on the candle that corresponds to **crosshair time**, so annotations line up with the same prices you see in the candle tooltip.

**How to enable:** Licensed Prime + sidebar: toggle the **magnet** on the drawing toolbar. The canvas receives **`magnetEnabled && proFeaturesEnabled`**; if either is false, **raw** pointer price is used (no snap).

#### Phase A — Anchor bar (time axis), binary search

1. Inputs: **`mouseTime`** (crosshair time in **unix seconds**, same domain as `Interval.t`) and a series **`intervals`** sorted by **non-decreasing** `t`.
2. **Edge clamps:** If `mouseTime ≤ first.t`, the anchor is the **first** bar; if `mouseTime ≥ last.t`, the anchor is the **last** bar.
3. **Interior:** A **binary search** finds the **rightmost** index `best` such that `intervals[best].t ≤ mouseTime` (classic “last true” partition).  
   - **Complexity:** **O(log n)** comparisons per snap query — constant memory, suitable for **100k+** bars without scanning the full array on every `mousemove`.
4. **Invariant:** The anchor is always the candle **at or before** the crosshair time (not the nearest bar by time distance). That matches how traders read “the bar under the cursor.”

#### Phase B — OHLC priority and distance (price axis)

There is **no** minimum snap radius, **no** pixel threshold, and **no** “magnet strength” slider in the engine: **every** snap evaluates the full price domain.

1. Let **`rawPrice`** be the pointer’s **Y → price** before snap.
2. Build the candidate set **`[open, high, low, close]`** of the anchor bar (order **O, H, L, C**).
3. Compute **absolute price distance** `d = |p − rawPrice|` for each candidate `p`.
4. Choose the candidate with the **smallest** `d`. If two candidates tie on distance, the **earlier** one in the **O → H → L → C** list wins (because the loop uses strict **`<`** when updating the best distance).

**Implications for enterprise QA:**

- Snapping is **global in price** — the closest OHLC always wins, even if it is far from the pointer in screen space (zoomed-out views).
- **High** and **low** compete fairly with **open** and **close**; there is no hard-coded preference for close-only snaps.
- **NaN / non-finite** `rawPrice` bypasses snapping and returns **`rawPrice`** unchanged.

Implementation reference: `src/engines/prime/premium/magneticSnap.ts` (`intervalAtOrBefore`, `snapPriceToNearestOHLC`).

### 2.2 VWAP Pro — technical specification

#### Calculation and UTC session resets

1. **Bar clock:** Each row uses **`t`** as **unix seconds**. The engine derives the **UTC calendar date** with `Date` in UTC: **year–month–day** forms a **`dayKey`** string.
2. **Reset rule:** Whenever **`dayKey`** differs from the previous bar’s day, **cumulative numerator and denominator are zeroed:**  
   `cumPV = 0`, `cumV = 0`.  
   That is a **calendar-day VWAP in UTC**, not exchange session RTH unless your bars are already session-filtered upstream.
3. **Typical price** per contributing bar: \((H + L + C) / 3\).
4. **Volume gate:** If **`v`** is missing or non-finite, the output at that index is **`null`** (line gap); **cumPV / cumV are not incremented** for that bar. The **dayKey** still advances from **`t`** so day boundaries stay aligned even across sparse volume.
5. **VWAP value:** For contributing bars, \(\text{VWAP}_i = \text{cumPV} / \text{cumV}\) after updating cumulatives for that bar.

#### Interaction with the data feed

| Feed behavior | Effect on VWAP |
|---------------|----------------|
| **Live append** of new bars | Each new bar extends the cumulative sums for its UTC day; prior days are unchanged. |
| **Historical prepend** or **full replace** | The series is recomputed from scratch in array order — ensure **`t`** is **sorted** and **v** is populated where you expect a continuous line. |
| **Timezone / DST** | Resets follow **UTC only**; local exchange midnight is **not** used unless you shift or label data accordingly in your pipeline. |
| **Missing volume** | **Null** points break the stroke unless your overlay uses **connectNulls**; cumulative state does not “skip” day detection. |

#### Visual styling (Prime VWAP)

When **`proFeaturesEnabled`** is true, `TickUpHost` **merges** `OverlayKind.vwap` into **`base.overlayKinds`** and applies **Prime-only** stroke styling under **`base.style.overlay`** (not the flat Core defaults), including:

- **`lineColor`** — accent for the VWAP path (e.g. violet family in the shipped merge).
- **`lineWidth`** — slightly heavier than thin reference lines for readability on dense charts.
- **`glowColor` / `glowBlur`** — canvas **shadow** on stroke so the VWAP reads as part of the **neon** overlay stack (see [§2.3](#23-neon-luxury-styling) and [Custom neon themes](./16-custom-neon-themes.md)).

You may **override** these keys in **`chartOptions`** after the host merge; avoid duplicating **`vwap`** in **`overlayKinds`** unless intentional.

**Standard deviation bands:** The automatic merge is a **single VWAP** series only. Add **`OverlaySpecs.bbandsUpper` / `bbandsLower`** (and optional **`bbandsMid`**) for σ envelopes. See [Overlays & indicators](./12-overlays-and-indicators.md).

**Data requirement:** Institutional VWAP quality requires **trustworthy, bar-aligned volume** (`v`).

### 2.3 Neon luxury styling

Licensed Prime applies a **high-saturation** candle palette and **glow** on overlays and drawing chrome (distinct from Standard’s flatter defaults).

Default merged values (conceptual — tune via `chartOptions`):

| Area | Role |
|------|------|
| `base.style.candles` | Bull / bear / up / down hex accents (e.g. vivid green / magenta-red vocabulary). |
| `base.style.overlay` | `lineColor`, `lineWidth`, **`glowColor`**, **`glowBlur`** — canvas shadow used when stroking overlay lines. |
| `base.style.drawings` | Default **`glowColor` / `glowBlur`** for shapes; **`selected`** variant with stronger glow for the active shape. |

For theme switching and safe overrides, see [Custom neon themes](./16-custom-neon-themes.md).

---

## 3. Licensing integration (security guide)

### 3.1 Activation flow

1. Install **`tickup`** (peer) and **`@tickup/prime`**.
2. Pass **`licenseKey`** and **`licenseUserIdentifier`** into **`TickUpHost`** (or your wrapper). The identifier is typically a stable **account id** or **email** your issuance process expects.
3. Optionally call **`validateLicense(licenseKey, licenseUserIdentifier)`** from `@tickup/prime` and pass the boolean as **`licenseValidationOverride`** when you already validated server-side or want **immediate** UI unlock without waiting for the internal async check.

Props (see `TickUpHost` in source):

| Prop | Purpose |
|------|---------|
| `licenseKey` | Issued key (`TKUP-…` format or documented master beta key in dev). |
| `licenseUserIdentifier` | Normalized participant string included in the HMAC payload (required for `TKUP-…` keys). |
| `licenseValidationOverride` | When `boolean`, **overrides** async validation for watermark / Pro gating. |

### 3.2 Local validation — privacy first

- **`validateLicense`** runs **entirely in the browser** using the **Web Crypto API** (**HMAC-SHA256**).
- The payload is derived from the **user identifier** and **plan segment** encoded in the key — **not** from your OHLC series or chart state.
- **No chart data** is transmitted to TickUp or third parties for validation by this API; your app remains responsible for key distribution and optional server-side checks.

### 3.3 Troubleshooting — evaluation watermark will not clear

The **in-chart evaluation watermark** and **Core-style limits** apply when **`primeEngineEval`** is true. That happens if **any** of:

| Condition | What to do |
|-----------|------------|
| **Invalid or missing license** | Confirm `licenseKey` / `licenseUserIdentifier` match issuance rules; call `validateLicense` and log the result during integration. |
| **`licenseValidationOverride` stuck false** | If you intend server-side trust, pass `licenseValidationOverride={true}` after your backend approves. |
| **WebGL 2.0 blocked** | User browser/GPU/driver blocks WebGL2 — Prime stays in blocked mode (banner + watermark). Test on supported hardware; try another browser or update drivers. |
| **`SubtleCrypto` unavailable** | Non-secure context or very old environment — local HMAC fails; use HTTPS or `licenseValidationOverride` from a trusted server path. |

**Prime tier product strip:** If you use **`productId: 'prime'`** without a valid key, a separate **evaluation strip** above the chart reminds you to pass `licenseKey` — distinct from the canvas watermark but part of the same gating story.

### 3.4 License status & UI failure matrix

`validateLicense` in the published package returns a **boolean** only — it does **not** emit typed error codes. The table below maps **integration statuses** your SecOps or support team can use to **reason about behavior** and align with **what the host actually renders**.

**Definitions (host internals):**

- **`isLicenseValid`** — after async `validateLicense` **or** immediate `licenseValidationOverride` when that prop is a **boolean**.
- **`primeEngineEval`** — Prime **engine** + (**not** `isLicenseValid` **or** WebGL2 blocked): **evaluation watermark** on the plot + Core-style data limits.
- **`primeTierEval`** — `productId: 'prime'` + **not** `isLicenseValid`: **amber evaluation strip** above the chart (in addition to any engine eval state).
- **`primeWebGLBlocked`** — Prime engine but **no** WebGL2: **red banner** (“requires WebGL 2.0…”).

| License status (contract / support) | `validateLicense()` | Typical `isLicenseValid` | Canvas eval watermark | Red WebGL banner | Prime tier strip (`productId: 'prime'`) | Magnet / unlimited history / neon unlock |
|---------------------------------------|---------------------|--------------------------|------------------------|------------------|-------------------------------------------|----------------------------------------|
| **ValidKey** | `true` | `true` (unless override `false`) | Off | Off | Off | **On** (if WebGL2 OK) |
| **InternalMasterKey** *(documented dev escape hatch only)* | `true` (exact string match before `TKUP-…` parsing; **no** `licenseUserIdentifier` required) | `true` | Off | Off | Off | **On** (if WebGL2 OK) |
| **MissingKey** | `false` (`undefined` / empty key) | `false` | **On** (Prime engine) | If no WebGL2 | **On** if Prime tier | **Off** |
| **EmptyKey** | `false` (whitespace-only) | `false` | **On** | If no WebGL2 | **On** if Prime tier | **Off** |
| **InvalidKeyFormat** | `false` (not `TKUP-…`, or too few `-` segments to parse plan + signature) | `false` | **On** | If no WebGL2 | **On** if Prime tier | **Off** |
| **IdentityError** | `false` (valid `TKUP-…` shape but **empty** `licenseUserIdentifier` after trim) | `false` | **On** | If no WebGL2 | **On** if Prime tier | **Off** |
| **SignatureMismatch** | `false` (HMAC short signature ≠ key tail) | `false` | **On** | If no WebGL2 | **On** if Prime tier | **Off** |
| **CryptoUnavailable** | `false` (`globalThis.crypto.subtle` missing — insecure context or unsupported env) | `false` | **On** | If no WebGL2 | **On** if Prime tier | **Off** |
| **OverrideValid** | *(skipped)* | `true` (`licenseValidationOverride={true}`) | Off | Off | Off | **On** (if WebGL2 OK) |
| **OverrideInvalid** | *(skipped)* | `false` (`licenseValidationOverride={false}`) | **On** | If no WebGL2 | **On** if Prime tier | **Off** |
| **WebGLBlocked** | `true` or `false` | Either | **On** whenever engine is Prime and (invalid license **or** no WebGL2) | **On** | Per tier + license | **Off** until WebGL2 works |
| **Expired** | *Not implemented in local API* | Your app decides | Your app should gate or use override | If Prime + no WebGL2 | Your tier props | Per your policy |
| **DomainMismatch** | *Not implemented in local API* | Your app decides | Same as **Expired** | Same | Same | Same |

**Notes for enterprise integrators**

- **Expired** and **DomainMismatch** are **policy** outcomes you enforce **server-side** or in your entitlement service. The bundled **`validateLicense`** does not parse JWT expiry or DNS allowlists — map those checks to **`licenseValidationOverride`** or hide Prime until your backend approves.
- **IdentityError** is easy to miss in QA: always pass a **non-empty** `licenseUserIdentifier` for production `TKUP-…` keys (usually lowercased email or stable account id, matching issuance).
- A **valid license** with **WebGL blocked** still shows **evaluation** behavior for the **engine** (watermark + limits) until the client gets a capable GPU context — licensing and **hardware capability** are **both** required for Pro unlock.

---

## 4. Performance benchmarking — Comparison Lab

Use the **side-by-side Comparison Lab** to demonstrate throughput and UX differences on real hardware.

### Option A — `example/` (bundled in this repo)

1. Build the library from the repo root: `npm run build`.
2. From `example/`: `npm install` (if needed), then `npm run dev`.
3. Open the app and switch to the **Comparison** view (Core vs Prime panes).
4. Observe **telemetry:** Core shows a **~1 Hz** heartbeat on the data/render strip; Prime shows a **high-frequency** render clock. With a large injected history (e.g. **10k** bars), Core should reflect the **5,000-bar** render cap and cap warning; Prime shows **full stream** behavior.

### Option B — `example-comparison-local/` (Core source from disk)

For apples-to-apples against a sibling **`tickup-core-final`** checkout, use **`example-comparison-local/`** (Vite aliases point at local Core + Prime `src`). Same workflow: **stress the feed**, compare **FPS / heartbeat**, **visible bar counts**, and **pan/zoom** smoothness.

### What to record for stakeholders

- **History size** in the feed vs **bars actually rendered** on Core vs Prime.
- **Update rate** of the mock or real stream vs perceived chart smoothness.
- **WebGL2** availability in target browsers (enterprise policy often affects GPU features).

---

## 5. Production build integrity (obfuscation & source maps)

The **`@tickup/prime`** npm tarball is intended as **proprietary** distribution: customers receive **`dist/`** bundles and **TypeScript declarations**, not the full `src/` tree (see root `package.json` **`files`** and `README`).

### Obfuscation (release builds)

For **`npm run build`** with obfuscation **enabled** (default; disable only with **`TICKUP_SKIP_OBFUSCATE=1`** for local debugging), the Vite pipeline applies **`javascript-obfuscator`** to **library source** under `src/` (not `node_modules`). Typical options include **string array encoding**, **identifier renaming**, **dead-code injection**, and related transforms — raising the cost of **casual reverse engineering** and **casual copying** of internals.

- **Peer boundary:** `react`, `react-dom`, `styled-components`, and **`tickup`** remain **external**; obfuscation targets **Prime package internals**, not your app’s whole bundle.
- **Security realism:** Obfuscation is **not** encryption. Treat it as **deterrence** and **IP hygiene**; combine with **license legal terms**, **server-side entitlement** where appropriate, and **secret rotation** for signing keys.

### Why production builds omit source maps

In **`vite.config.ts`**, **`build.sourcemap`** is tied to **`TICKUP_SKIP_OBFUSCATE`**: **obfuscated** release builds emit **no** Rollup source maps to npm. Reasons:

1. **Source maps would map minified/obfuscated code back to original structure**, largely defeating the purpose of shipping an obfuscated `dist/`.
2. **Smaller artifacts** and **faster installs** for consumers.
3. **Reduced accidental leakage** of file and identifier layout in customer environments.

For **first-party debugging**, build with **`TICKUP_SKIP_OBFUSCATE=1`** (and thus **source maps on**) against a **clone** of the repository — never assume source maps exist inside the published tarball.

---

## See also

- [Prime integration recipes & edge cases](./18-prime-integration-recipes-and-edge-cases.md) — dynamic `setEngine`, offline licensing, WebGL absence, 50+ overlays, neon presets.
- [Prime engine & Pro roadmap](./15-prime-engine-and-pro-roadmap.md) — engine vs tier, light/dark glass.
- [Custom neon themes](./16-custom-neon-themes.md) — merging palettes safely.
- [Overlays & indicators](./12-overlays-and-indicators.md) — Bollinger and other calcs.
- Root [`README.md`](../README.md) — quick activation snippets and tier table.
