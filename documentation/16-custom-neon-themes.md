# Custom Neon Themes (Prime)

This guide shows how to tailor the Prime visual language while keeping engine behavior stable.

## 0) Wire Prime engine into `TickUpHost`

Always pass Prime through the host ref so runtime behavior and visuals stay aligned.

```tsx
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ChartTheme,
  TickUpHost,
  type Interval,
  type TickUpHostHandle,
} from 'tickup/full';
import {
  createTickUpPrimeEngine,
  getTickUpPrimeThemePatch,
} from '@tickup/prime';

type Theme = ChartTheme.light | ChartTheme.dark;

export function PrimeHostExample({ data }: { data: Interval[] }) {
  const ref = useRef<TickUpHostHandle>(null);
  const [theme, setTheme] = useState<Theme>(ChartTheme.dark);
  const primeEngine = useMemo(() => createTickUpPrimeEngine(theme), [theme]);

  useLayoutEffect(() => {
    ref.current?.setEngine(primeEngine);
  }, [primeEngine]);

  return (
    <TickUpHost
      ref={ref}
      intervalsArray={data}
      themeVariant={theme}
      onThemeVariantChange={setTheme}
      chartOptions={getTickUpPrimeThemePatch(theme)}
      showTopBar
      showSettingsBar
    />
  );
}
```

## 1) Start from a Prime patch

Use `getTickUpPrimeThemePatch(theme)` or `createTickUpPrimeEngine(theme)` as your baseline.

## 2) Override only style keys you own

Recommended override areas:

- `base.style.backgroundColor`
- `base.style.grid.lineColor`
- `base.style.axes.textColor`
- `base.style.candles.bullColor` / `bearColor`
- `base.style.line.color`
- `base.style.area.fillColor` / `strokeColor`

Avoid replacing full chart option trees unless needed; merge partial overrides instead.

## 3) Keep contrast readable

- Dark themes: keep axis/tooltip text high-contrast against plot background.
- Light themes: reduce neon alpha to avoid washed labels.
- Crosshair overlays should remain visible over candles and area fills.

## 4) Runtime switching

When users toggle app theme, switch Prime engine variants with:

- `setEngine(createTickUpPrimeEngine('dark'))`
- `setEngine(createTickUpPrimeEngine('light'))`

This keeps Prime visuals synchronized with shell theme changes.
