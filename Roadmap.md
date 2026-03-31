# TickUp Prime Roadmap

This roadmap tracks premium engine priorities for `@tickup/prime`.

## Near-term priorities

- WebGL rendering path for higher throughput in dense live feeds.
- Prime-only indicator set (Ichimoku, Volume Profile, Market Profile).
- Advanced drawing pack (Fibonacci retracement, trend-angle, long/short position overlays).
- Premium visual presets with stricter accessibility contrast controls.

## Platform direction

- Hybrid Canvas/WebGL fallback strategy for broad device support.
- Benchmark suite and frame-time telemetry for Prime performance budgets.
- Prime-specific plugin surface for proprietary overlays and tooling.

## Notes

- Prime depends on `tickup` (Core) and extends host behavior via engine patches.
- Roadmap items may ship incrementally; confirm current API in release notes before production use.
