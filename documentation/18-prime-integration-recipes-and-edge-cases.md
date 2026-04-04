# Prime integration recipes & edge cases

Patterns for **runtime engine switching**, **offline / air-gapped** licensing, **WebGL absence**, **many overlays**, and **starter neon palettes**. Pair with the [enterprise guide](./17-prime-enterprise-performance-security.md) and [Prime engine](./15-prime-engine-and-pro-roadmap.md).

---

## 1. Common integration patterns

### 1.1 Dynamic engine swap (Core ↔ Prime at runtime)

Use the host **`ref`** **`setEngine`** API so `chartOptions.base.engine` and the bundled patch stay aligned.

**Prime on (licensed + WebGL2 OK):**

```tsx
import { useLayoutEffect, useRef } from 'react';
import { TickUpHost, type TickUpHostHandle } from 'tickup/full';
import {
  createTickUpPrimeEngine,
  TickUpPrime,
  TickUpStandardEngine,
  getTickUpPrimeThemePatch,
} from '@tickup/prime';
import { ChartTheme } from 'tickup/full';

const ref = useRef<TickUpHostHandle>(null);

// Preferred when shell theme tracks Prime light/dark:
useLayoutEffect(() => {
  ref.current?.setEngine(createTickUpPrimeEngine(ChartTheme.dark));
}, []);

// Or fixed dark Prime:
useLayoutEffect(() => {
  ref.current?.setEngine(TickUpPrime);
}, []);
```

**Standard (Core-style) engine:**

```tsx
useLayoutEffect(() => {
  ref.current?.setEngine(TickUpStandardEngine);
}, []);
```

**Keep `chartOptions` in sync:** After `setEngine`, merge **`getTickUpPrimeThemePatch(theme)`** (or your custom neon partials) into the **`chartOptions`** you pass to **`TickUpHost`**, so toolbar glass and plot theme do not fight the engine id. See [Props & chart options](./05-props-and-chart-options.md).

**`createTickUpPrimeEngine` and WebGL2:** That factory **throws** if `window` exists and **WebGL2 is unavailable** (guard in the Prime package). For a **runtime toggle** that must not crash, either:

- Call **`setEngine(TickUpPrime)`** (object export — does not throw on WebGL), and let **`TickUpHost`** apply **blocked / evaluation** behavior when WebGL2 is missing, **or**
- Pre-flight in your app with **`canvas.getContext('webgl2')`**; if null, call **`setEngine(TickUpStandardEngine)`** and skip **`createTickUpPrimeEngine`**.

### 1.2 Offline mode + cached license

**`validateLicense`** in `@tickup/prime` is **local-only**: **HMAC-SHA256** via **Web Crypto**. It does **not** open network sockets. A user with **no internet** can still unlock Prime **if**:

1. **`licenseKey`** and **`licenseUserIdentifier`** are available (e.g. read from **`localStorage`**, IndexedDB, or your desktop shell).
2. The page runs in a context where **`crypto.subtle`** is available (**HTTPS** or secure localhost).

**Recipe:**

1. On successful login / entitlement, **persist** `licenseKey` + `licenseUserIdentifier` (and optional “last validated at” timestamp) in your store.
2. On cold start **offline**, hydrate props from cache and call **`validateLicense`** as usual — it remains **purely local**.
3. Optionally set **`licenseValidationOverride={true}`** after you trust a **signed offline bundle** from your own backend, so the UI does not wait on async HMAC during the first paint.

**Caveats:**

- **First-time activation** while offline still requires the user to have received keys through some **prior online** or **IT-provisioned** channel.
- **Rotation / revocation** is not enforced by the bundled local validator alone — use **server checks** when online and shorten cache TTLs if policy requires.

---

## 2. No-fly zone — WebGL 2.0 unavailable

**The host does *not* silently rewrite `chartOptions.base.engine` from `'prime'` to `'standard'`.** If the product is configured as **Prime** but WebGL2 is missing:

| Layer | Behavior |
|-------|----------|
| **`chartOptions.base.engine`** | Stays **`prime`** unless **your** code calls **`setEngine(TickUpStandardEngine)`** or merges a standard patch. |
| **Data pipeline (`useChartData`)** | **`primePerformanceUnlocked`** is **false** → **same limits as Core**: last **5,000** bars in the render pipeline and **~1 Hz** commit throttle. This is a **behavioral** fallback, not a renamed engine. |
| **Pro features** | **Magnet, unlimited history, neon unlock** are **off** (`proFeaturesEnabled` false). |
| **UI** | **Red banner**: WebGL2 required for commercial mode. **Evaluation watermark** on the plot (with Prime engine + blocked WebGL). |
| **`createTickUpPrimeEngine()`** | **Throws** in the browser when WebGL2 is absent — avoid calling it without a pre-check or **try/catch** (see §1.1). |
| **`TickUpPrime` constant** | Does **not** throw on use; **`setEngine(TickUpPrime)`** is safe, then the host applies gating above. |

**Summary for support docs:** Prime without WebGL2 is **not** “Core branding” — it is **Prime evaluation / degraded data path** until WebGL2 works or the integrator **explicitly** switches to **`TickUpStandardEngine`**.

**Rendering note:** The **WebGL2** check is enforced in **`TickUpHost`** as the **commercial readiness** gate for unlimited history and full refresh behavior, consistent with the [enterprise guide](./17-prime-enterprise-performance-security.md).

---

## 3. Heavy-load scenarios — many indicators (50+ overlays)

There is **no hard-coded cap** on overlay count in the overlay drawer: **`drawOverlays`** iterates **`seriesList`** and strokes each series over the visible index range; each overlay’s values come from **`computeSeriesBySpec`**, which walks the **full** `intervals` array when data changes.

**Scaling (conceptual):**

- **CPU:** Roughly **O(N × M)** work per full recompute, **N** = bars, **M** = overlay count — plus **per-frame** stroke work over visible bars × M.
- **Canvas:** Each overlay may apply **shadow/glow** (`glowBlur` / `glowColor`) — many glowing strokes are **expensive** on the 2D canvas.

**Soft limits (operational, not enforced in code):**

| Band | Guidance |
|------|----------|
| **~1–15 overlays** | Typical product charts; profile rarely dominated by overlay math. |
| **~15–40** | Still viable on modern desktops if bars are moderate and updates are batched; prefer **solid** lines or **low** `glowBlur` for secondary series. |
| **50+** | Treat as **stress** configuration: expect **frame-time growth** and **main-thread** spikes on pan/zoom; reduce **`glowBlur`**, drop redundant series when zoomed out, or **throttle** parent re-renders / `intervalsArray` churn. |

**Mitigations:**

- Merge redundant indicators server-side where possible.
- Use **`connectNulls`** intentionally to avoid pathological moveTo/lineTo patterns.
- For dozens of studies, consider **user-selectable** bundles (show at most *k* at once).

---

## 4. Custom neon branding — three starter presets

Below are **partial** `chartOptions.base.style` trees you can **deep-merge** into **`getTickUpPrimeThemePatch(theme)`** (or your existing Prime `chartOptions`). Use your app’s **`deepMerge`** helper so nested keys combine correctly.

### 4.1 “Cyberpunk” (dark, high contrast)

Electric cyan / magenta, strong glow on overlays and drawings.

```ts
const neonPresetCyberpunk = {
  base: {
    style: {
      backgroundColor: '#070714',
      grid: { lineColor: 'rgba(0, 255, 200, 0.12)', color: 'rgba(0, 255, 200, 0.12)' },
      axes: { textColor: '#e0fff7', lineColor: 'rgba(0, 255, 200, 0.2)' },
      candles: {
        bullColor: '#00ffd5',
        bearColor: '#ff2bd6',
        upColor: '#00ffd5',
        downColor: '#ff2bd6',
        borderColor: 'rgba(224, 255, 247, 0.35)',
      },
      overlay: {
        lineColor: '#c77dff',
        lineWidth: 1.8,
        glowColor: 'rgba(199, 125, 255, 0.92)',
        glowBlur: 12,
      },
      drawings: {
        glowColor: 'rgba(0, 255, 213, 0.55)',
        glowBlur: 9,
        selected: { glowColor: 'rgba(255, 43, 214, 0.75)', glowBlur: 14 },
      },
    },
  },
};
```

### 4.2 “Ghost White” (light shell, soft neon)

Frosted / institutional light background; accents stay readable, glow **subtle**. Merge alongside **`getTickUpPrimeThemePatch(ChartTheme.light)`** and set host **`themeVariant`** to light so shell and plot agree.

```ts
const neonPresetGhostWhite = {
  base: {
    // When merging full options, set base.theme to ChartTheme.light from `tickup`
    style: {
      backgroundColor: '#f8fafc',
      grid: { lineColor: 'rgba(14, 165, 233, 0.14)', color: 'rgba(14, 165, 233, 0.14)' },
      axes: { textColor: '#0f172a', lineColor: 'rgba(15, 23, 42, 0.12)' },
      candles: {
        bullColor: '#059669',
        bearColor: '#db2777',
        upColor: '#059669',
        downColor: '#db2777',
        borderColor: 'rgba(15, 23, 42, 0.18)',
      },
      overlay: {
        lineColor: '#6366f1',
        lineWidth: 1.6,
        glowColor: 'rgba(99, 102, 241, 0.35)',
        glowBlur: 4,
      },
      drawings: {
        glowColor: 'rgba(14, 165, 233, 0.35)',
        glowBlur: 4,
        selected: { glowColor: 'rgba(99, 102, 241, 0.45)', glowBlur: 6 },
      },
    },
  },
};
```

### 4.3 “Classic Pro” (dark terminal, restrained glow)

Dense dark UI, amber / teal accents — closer to **classic terminal** aesthetics with **moderate** glow so lines stay sharp at high bar counts.

```ts
const neonPresetClassicPro = {
  base: {
    style: {
      backgroundColor: '#0c0f0e',
      grid: { lineColor: 'rgba(45, 212, 191, 0.1)', color: 'rgba(45, 212, 191, 0.1)' },
      axes: { textColor: '#d1fae5', lineColor: 'rgba(209, 250, 229, 0.15)' },
      candles: {
        bullColor: '#2dd4bf',
        bearColor: '#fbbf24',
        upColor: '#2dd4bf',
        downColor: '#fbbf24',
        borderColor: 'rgba(209, 250, 229, 0.25)',
      },
      overlay: {
        lineColor: '#f59e0b',
        lineWidth: 1.5,
        glowColor: 'rgba(245, 158, 11, 0.45)',
        glowBlur: 5,
      },
      drawings: {
        glowColor: 'rgba(45, 212, 191, 0.4)',
        glowBlur: 5,
        selected: { glowColor: 'rgba(251, 191, 36, 0.55)', glowBlur: 7 },
      },
    },
  },
};
```

**Usage sketch:**

```tsx
// chartOptions={mergeDeep(getTickUpPrimeThemePatch(ChartTheme.dark), neonPresetCyberpunk)}
```

Tune **`glowBlur`** down when stacking **many** overlays (§3).

---

## See also

- [Enterprise guide](./17-prime-enterprise-performance-security.md) — licensing matrix, magnet/VWAP depth, obfuscation.
- [Custom neon themes](./16-custom-neon-themes.md) — merge discipline and theme switching.
- [Imperative API](./06-imperative-api.md) — `setEngine`, data, ranges.
