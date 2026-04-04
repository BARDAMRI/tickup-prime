import React, {useEffect, useMemo, useRef, useState} from 'react';
/**
 * Core (left): `@local-core/full` → Vite alias to sibling `tickup-core-final/src/full.ts`
 * (see `vite.config.ts`: `../tickup-core-final` from the Prime repo root).
 */
import {
  AxesPosition as CoreAxesPosition,
  ChartTheme as CoreChartTheme,
  ChartType as CoreChartType,
  OverlayKind as CoreOverlayKind,
  TickUpHost as CoreTickUpHost,
  TickUpRenderEngine as CoreEngine,
  TimeDetailLevel as CoreTimeDetailLevel,
} from '@local-core/full';
import {
  AxesPosition as PrimeAxesPosition,
  ChartTheme as PrimeChartTheme,
  ChartType as PrimeChartType,
  OverlayKind as PrimeOverlayKind,
  TickUpHost as PrimeTickUpHost,
  TickUpRenderEngine as PrimeEngine,
  TimeDetailLevel as PrimeTimeDetailLevel,
} from '@local-prime/full';

type CoreIndicatorKey = 'ema' | 'sma' | 'wma' | 'bbands';
type IntervalBar = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
};

type StreamEvent = {
  append: boolean;
  closeDelta: number;
  wickUp: number;
  wickDown: number;
  volDelta: number;
};

function formatHmsMs(d: Date): string {
  const p2 = (n: number) => String(n).padStart(2, '0');
  const p3 = (n: number) => String(n).padStart(3, '0');
  return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${p3(d.getMilliseconds())}`;
}

/**
 * Prime HUD: keeps rAF + FPS state **here** so parent re-renders do not hit TickUpHost
 * (avoids maximum update depth with TickUpStage’s layout sync on `intervalsArray`).
 */
function PrimeTelemetryStrip({streamTotal}: {streamTotal: number}) {
  const [lastPaint, setLastPaint] = useState(() => formatHmsMs(new Date()));
  const [fps, setFps] = useState(0);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let fpsT0 = performance.now();
    const loop = (now: number) => {
      frames += 1;
      const dt = now - fpsT0;
      if (dt >= 1000) {
        setFps(Math.round((frames * 1000) / dt));
        frames = 0;
        fpsT0 = now;
      }
      setLastPaint(formatHmsMs(new Date()));
      setPulse((p) => (p + 1) % 256);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const st = streamTotal.toLocaleString();
  return (
    <div className="panel-telemetry panel-telemetry--prime panel-telemetry--stacked">
      <div className="panel-telemetry__row">
        <span className="telemetry-label">Prime tier</span>
        <span
          className="heartbeat-dot heartbeat-dot--prime"
          style={{
            opacity: pulse % 2 === 0 ? 1 : 0.35,
            boxShadow: pulse % 2 === 0 ? '0 0 10px #38bdf8' : 'none',
          }}
          title="High-rate pulse (~display refresh)"
        />
        <span className="fps-pill">~{fps} FPS</span>
        <span className="telemetry-time">
          Last render: <span className="telemetry-time-value">{lastPaint}</span>
        </span>
      </div>
      <div className="telemetry-metrics telemetry-metrics--prime">
        Prime: {st} / {st} <span className="telemetry-unlimited">(Unlimited)</span>
      </div>
    </div>
  );
}

/** Core HUD: advances on `coreTick` (1 Hz) only — useEffect, not useLayoutEffect. */
function CoreTelemetryStrip({
  coreTick,
  streamTotal,
  coreCap,
}: {
  coreTick: number;
  streamTotal: number;
  coreCap: number;
}) {
  const [lit, setLit] = useState(true);
  const [lastRender, setLastRender] = useState(() => formatHmsMs(new Date()));

  useEffect(() => {
    setLastRender(formatHmsMs(new Date()));
    setLit((v) => !v);
  }, [coreTick]);

  const effective = Math.min(streamTotal, coreCap);
  const st = streamTotal.toLocaleString();
  const eff = effective.toLocaleString();
  const capped = streamTotal > coreCap;

  return (
    <div className="panel-telemetry panel-telemetry--stacked">
      <div className="panel-telemetry__row">
        <span className="telemetry-label">Core tier</span>
        <span
          className="heartbeat-dot heartbeat-dot--core"
          style={{opacity: lit ? 1 : 0.25}}
          title="1 Hz heartbeat (toggles once per second)"
        />
        <span className="telemetry-hint">1 Hz data</span>
        <span className="telemetry-time">
          Last render: <span className="telemetry-time-value telemetry-time-value--core">{lastRender}</span>
        </span>
      </div>
      <div className="telemetry-metrics">
        Core: {eff} / {st}{' '}
        {capped ? <span className="telemetry-capped">(Capped)</span> : <span style={{color: '#64748b'}}>(no cap)</span>}
      </div>
    </div>
  );
}

function makeInitialBars(count: number, intervalSec: number): IntervalBar[] {
  const out: IntervalBar[] = [];
  let t = 1_700_000_000 - count * intervalSec;
  let price = 118.7;
  for (let i = 0; i < count; i++) {
    const drift = Math.sin(i / 180) * 0.05 + 0.02;
    const noise = (Math.random() - 0.5) * 0.55;
    const o = price;
    const c = o + drift + noise;
    const h = Math.max(o, c) + Math.random() * 0.35;
    const l = Math.min(o, c) - Math.random() * 0.35;
    out.push({
      t,
      o: +o.toFixed(2),
      h: +h.toFixed(2),
      l: +l.toFixed(2),
      c: +c.toFixed(2),
      v: Math.max(1, Math.round(700 + Math.random() * 1200)),
    });
    t += intervalSec;
    price = c;
  }
  return out;
}

function nextBar(last: IntervalBar, intervalSec: number, event: StreamEvent): IntervalBar {
  const o = last.c;
  const c = o + event.closeDelta;
  const h = Math.max(o, c) + event.wickUp;
  const l = Math.min(o, c) - event.wickDown;
  return {
    t: last.t + intervalSec,
    o: +o.toFixed(2),
    h: +h.toFixed(2),
    l: +l.toFixed(2),
    c: +c.toFixed(2),
    v: Math.max(1, Math.round((last.v ?? 1000) + event.volDelta)),
  };
}

function jitterBar(last: IntervalBar, event: StreamEvent): IntervalBar {
  const c = +(last.c + event.closeDelta).toFixed(2);
  return {
    ...last,
    c,
    h: +Math.max(last.h, c, last.o).toFixed(2),
    l: +Math.min(last.l, c, last.o).toFixed(2),
    v: Math.max(1, Math.round((last.v ?? 1000) + event.volDelta)),
  };
}

function applyStreamEvent(prev: IntervalBar[], event: StreamEvent, intervalSec: number): IntervalBar[] {
  if (!prev.length) return prev;
  const last = prev[prev.length - 1];
  if (event.append) {
    return [...prev, nextBar(last, intervalSec, event)];
  }
  const next = [...prev];
  next[next.length - 1] = jitterBar(last, event);
  return next;
}

function randomStreamEvent(): StreamEvent {
  return {
    append: Math.random() > 0.92,
    closeDelta: (Math.random() - 0.5) * 0.45 + 0.02,
    wickUp: Math.random() * 0.35,
    wickDown: Math.random() * 0.35,
    volDelta: (Math.random() - 0.5) * 80,
  };
}

function capTail<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  return arr.slice(arr.length - max);
}

/** 10k stream vs Core render cap (see CORE_RENDER_CAP) — “5,000 bar wall” is visible. */
const INITIAL_BARS = 10_000;
/** Align with `MAX_CORE_CANDLES` in Core + Prime `useChartData.ts`. */
const CORE_RENDER_CAP = 5_000;
const MAX_PRIME_BARS = 50_000;
const CORE_THROTTLE_MS = 1_000;
const PRIME_TICK_MS = 1000 / 60;

export function ComparisonLab() {
  const intervalSec = 60;
  const intervalSecRef = useRef(intervalSec);
  intervalSecRef.current = intervalSec;

  const [primeBars, setPrimeBars] = useState<IntervalBar[]>(() => makeInitialBars(INITIAL_BARS, intervalSec));
  const primeBarsRef = useRef(primeBars);
  primeBarsRef.current = primeBars;

  const [coreBars, setCoreBars] = useState<IntervalBar[]>(() => makeInitialBars(INITIAL_BARS, intervalSec));
  const [coreTick, setCoreTick] = useState(0);

  const [toast, setToast] = useState<string | null>(null);
  const [coreIndicators, setCoreIndicators] = useState<Record<CoreIndicatorKey, boolean>>({
    ema: true,
    sma: true,
    wma: true,
    bbands: false,
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      const sec = intervalSecRef.current;
      setPrimeBars((prev) => capTail(applyStreamEvent(prev, randomStreamEvent(), sec), MAX_PRIME_BARS));
    }, PRIME_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const snap = primeBarsRef.current;
      setCoreBars(snap.length ? snap.map((b) => ({...b})) : snap);
      setCoreTick((t) => t + 1);
    }, CORE_THROTTLE_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const incomingBarCount = primeBars.length;
  const showCoreCapBadge = incomingBarCount > CORE_RENDER_CAP;

  const coreOverlayKinds = useMemo(() => {
    const kinds: any[] = [];
    if (coreIndicators.ema) kinds.push({kind: CoreOverlayKind.ema, period: 21});
    if (coreIndicators.sma) kinds.push({kind: CoreOverlayKind.sma, period: 50});
    if (coreIndicators.wma) kinds.push({kind: CoreOverlayKind.wma, period: 20});
    if (coreIndicators.bbands) kinds.push({kind: CoreOverlayKind.bbands_mid, period: 20});
    return kinds;
  }, [coreIndicators]);

  const tryToggleCoreIndicator = (k: CoreIndicatorKey) => {
    setCoreIndicators((prev) => {
      const currentlyOn = prev[k];
      if (currentlyOn) {
        return {...prev, [k]: false};
      }
      const active = Object.values(prev).filter(Boolean).length;
      if (active >= 3) {
        setToast('Core tier is limited to 3 indicators. Upgrade to Prime for unlimited analysis.');
        return prev;
      }
      return {...prev, [k]: true};
    });
  };

  const baseStyle = {
    showOverlayLine: true,
    showHistogram: false,
    showCrosshair: true,
    showCrosshairValues: true,
  };

  const coreChartOptions = useMemo(
    () => ({
      base: {
        ...baseStyle,
        engine: CoreEngine.standard,
        theme: CoreChartTheme.dark,
        chartType: CoreChartType.Candlestick,
        overlayKinds: coreOverlayKinds,
      },
      axes: {yAxisPosition: CoreAxesPosition.right, numberOfYTicks: 8},
    }),
    [coreOverlayKinds]
  );

  const primeChartOptions = useMemo(
    () => ({
      base: {
        ...baseStyle,
        engine: PrimeEngine.prime,
        theme: PrimeChartTheme.dark,
        chartType: PrimeChartType.Candlestick,
        overlayKinds: [
          {kind: PrimeOverlayKind.ema, period: 21},
          {kind: PrimeOverlayKind.sma, period: 50},
          {kind: PrimeOverlayKind.wma, period: 20},
          {kind: PrimeOverlayKind.bbands_mid, period: 20},
          {kind: PrimeOverlayKind.vwap},
        ],
      },
      axes: {yAxisPosition: PrimeAxesPosition.right, numberOfYTicks: 8},
    }),
    []
  );

  const coreInitialRange = useMemo(() => {
    if (!coreBars.length) return {start: 0, end: 1};
    const last = coreBars[coreBars.length - 1].t + intervalSec;
    return {start: last - 6 * 3600, end: last};
  }, [coreBars, intervalSec]);

  const primeInitialRange = useMemo(() => {
    if (!primeBars.length) return {start: 0, end: 1};
    const last = primeBars[primeBars.length - 1].t + intervalSec;
    return {start: last - 6 * 3600, end: last};
  }, [primeBars, intervalSec]);

  return (
    <div className="lab-shell">
      <div className="lab-header">
        <div className="lab-header__left">
          <div className="lab-title">Local comparison + telemetry</div>
          <div className="lab-subtitle">
            Left: Core from <code>@local-core/full</code> (sibling <code>tickup-core-final/src</code>). Right: Prime
            from <code>@local-prime/full</code>. Prime feed ~60 Hz; Core chart snapshots 1 Hz. Initial pump:{' '}
            {INITIAL_BARS.toLocaleString()} bars · Core engine cap: {CORE_RENDER_CAP.toLocaleString()} (generous standard).
          </div>
          <div className="lab-diagnostics" role="status">
            <span className="telemetry-capped">Diagnostics</span>
            <span> — Core: </span>
            <span>{Math.min(incomingBarCount, CORE_RENDER_CAP).toLocaleString()}</span>
            <span> / {incomingBarCount.toLocaleString()}</span>
            {incomingBarCount > CORE_RENDER_CAP ? (
              <span className="telemetry-capped"> (Capped at {CORE_RENDER_CAP.toLocaleString()})</span>
            ) : (
              <span style={{color: '#64748b'}}> (no cap)</span>
            )}
            <span className="lab-diagnostics-sep">|</span>
            <span>Prime: {incomingBarCount.toLocaleString()} / {incomingBarCount.toLocaleString()} </span>
            <span className="telemetry-unlimited">(Unlimited)</span>
          </div>
        </div>
        <div className="badge-row">
          <span className="badge">Core feed: {coreBars.length.toLocaleString()}</span>
          <span className="badge">Prime feed: {primeBars.length.toLocaleString()}</span>
        </div>
      </div>

      <div className="controls">
        <button type="button" className="btn" onClick={() => tryToggleCoreIndicator('ema')}>
          Core EMA
        </button>
        <button type="button" className="btn" onClick={() => tryToggleCoreIndicator('sma')}>
          Core SMA
        </button>
        <button type="button" className="btn" onClick={() => tryToggleCoreIndicator('wma')}>
          Core WMA
        </button>
        <button type="button" className="btn" onClick={() => tryToggleCoreIndicator('bbands')}>
          Core BBands Mid
        </button>
      </div>

      <div className="grid">
        <section className="panel">
          <CoreTelemetryStrip
            coreTick={coreTick}
            streamTotal={incomingBarCount}
            coreCap={CORE_RENDER_CAP}
          />
          {showCoreCapBadge ? (
            <div className="cap-warn" role="status">
              <span className="cap-warn-title">Data Capped at 5,000 bars</span>
              <span className="cap-warn-detail">
                Stream: {incomingBarCount.toLocaleString()} bars — engine renders latest {CORE_RENDER_CAP.toLocaleString()}
              </span>
            </div>
          ) : null}
          <div className="chart-wrap">
            <CoreTickUpHost
              intervalsArray={coreBars as any}
              chartOptions={coreChartOptions as any}
              themeVariant={CoreChartTheme.dark}
              showSidebar
              showTopBar
              showSettingsBar
              initialTimeDetailLevel={CoreTimeDetailLevel.Medium}
              initialVisibleTimeRange={coreInitialRange}
            />
          </div>
        </section>

        <section className="panel panel--prime">
          <PrimeTelemetryStrip streamTotal={incomingBarCount} />
          <div className="chart-wrap">
            <PrimeTickUpHost
              intervalsArray={primeBars as any}
              chartOptions={primeChartOptions as any}
              themeVariant={PrimeChartTheme.dark}
              showSidebar
              showTopBar
              showSettingsBar
              licenseValidationOverride={true}
              licenseUserIdentifier="comparison-lab@local"
              licenseKey="TICKUP-PRO-2026-BETA"
              initialTimeDetailLevel={PrimeTimeDetailLevel.Medium}
              initialVisibleTimeRange={primeInitialRange}
            />
          </div>
        </section>
      </div>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
