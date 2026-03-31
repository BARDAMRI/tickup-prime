# Custom Neon Themes (Prime)

This guide shows how to tailor the Prime visual language while keeping engine behavior stable.

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
