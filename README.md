# TickUp Prime: Institutional-Grade WebGL Charting

TickUp Prime is the commercial edition of TickUp, built for desks that require premium rendering throughput, advanced tooling, and a seamless paid unlock flow.

Live showcase: [https://BARDAMRI.github.io/tickup-charts/](https://BARDAMRI.github.io/tickup-charts/)

## Why Prime

- **WebGL 2.0 acceleration**: Prime enforces a WebGL2-capable runtime and unlocks high-density rendering paths designed for large datasets and low-latency interaction.
- **Magnetic Snapping (Pro)**: Drawing tools can snap to nearest OHLC levels for cleaner, faster technical annotation.
- **VWAP Pro (daily reset)**: Built-in volume-weighted average price calculation with UTC daily reset for intraday precision.
- **Neon Luxury theme**: Exclusive high-contrast palette, glow-enhanced overlays, and premium chart chrome.

## Quick Start (License Unlock)

Install Core + Prime:

```bash
npm install tickup @tickup/prime
```

Activate Prime with license props:

```tsx
import { TickUpHost } from 'tickup/full';
import { createTickUpPrimeEngine, validateLicense } from '@tickup/prime';

const licenseKey = 'TKUP-PRO-XXXX';
const userIdentifier = 'desk@yourfirm.com';
const isValid = await validateLicense(licenseKey, userIdentifier);

<TickUpHost
  intervalsArray={data}
  chartOptions={createTickUpPrimeEngine().getChartOptionsPatch()}
  licenseKey={licenseKey}
  licenseUserIdentifier={userIdentifier}
  licenseValidationOverride={isValid}
/>;
```

When `licenseValidationOverride` becomes `true`, evaluation watermarking and upgrade blockers are removed immediately without page reload.

## Feature Details

### WebGL 2.0 in Prime

Prime is configured with a WebGL2 runtime requirement for commercial unlock. This ensures Prime sessions run on capable GPU-backed environments before premium paths are enabled.

### Magnetic Snapping

Prime-only drawing assistant:

- Finds the candle nearest to cursor time.
- Snaps drawing price to nearest OHLC value.
- Improves trendline/zone placement consistency under high volatility.

### VWAP Pro

VWAP formula:

`sum(typical_price * volume) / sum(volume)` where `typical_price = (high + low + close) / 3`

Prime implementation resets accumulators daily (UTC session boundary), so intraday anchors stay accurate.

### Neon Luxury Visuals

Prime unlock applies:

- Neon green/red high-saturation candles.
- Purple-blue glow profile for premium overlays.
- Glow-enhanced drawing objects and selected states.

## Privacy & Security

TickUp Prime license verification is local-only (HMAC-SHA256 compatible path).

- No user trading data is transmitted during validation.
- No chart payload is sent to external verification services.
- Validation result is consumed directly by host props in your app runtime.

## Documentation

- Prime docs hub: [https://BARDAMRI.github.io/tickup-charts/](https://BARDAMRI.github.io/tickup-charts/)
- Prime roadmap: [`Roadmap.md`](./Roadmap.md)

## Commercial Support

For commercial licensing and enterprise onboarding: `bardamri1702@gmail.com`
