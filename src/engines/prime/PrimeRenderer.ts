import {TickUpRenderEngine, type ChartOptions, type DeepRequired} from 'tickup';

export function isPrimeEngine(options: DeepRequired<ChartOptions> | ChartOptions): boolean {
    return options.base?.engine === TickUpRenderEngine.prime;
}
