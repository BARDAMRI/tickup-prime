# TickUp Prime — Premium Financial Engine

`@tickup/prime` is the premium rendering and product extension for TickUp Charts.
It adds the neon visual profile, Prime-tier shell behavior, and pro-focused roadmap modules.

## Peer Dependency

This package requires **tickup (Core)** as a peer dependency.

## Installation

```bash
npm install tickup @tickup/prime
```

Also ensure your app has compatible peers:

- `react >=18`
- `styled-components >=6`

## Usage

Use Prime from your chart host via the engine API:

```tsx
import { useRef } from 'react';
import { TickUpCommand, type TickUpHostHandle } from 'tickup/full';
import { TickUpPrime, createTickUpPrimeEngine } from '@tickup/prime';

export function PrimeExample() {
  const ref = useRef<TickUpHostHandle>(null);

  const enablePrimeDark = () => {
    ref.current?.setEngine(TickUpPrime);
  };

  const enablePrimeLight = () => {
    ref.current?.setEngine(createTickUpPrimeEngine('light'));
  };

  return (
    <TickUpCommand
      ref={ref}
      intervalsArray={[]}
      defaultSymbol="DEMO"
    />
  );
}
```

## Documentation

- Prime documentation hub: [https://BARDAMRI.github.io/tickup-charts/](https://BARDAMRI.github.io/tickup-charts/)
- Prime engine and roadmap guide: [https://BARDAMRI.github.io/tickup-charts/](https://BARDAMRI.github.io/tickup-charts/)
- Custom neon theming guide: [https://BARDAMRI.github.io/tickup-charts/](https://BARDAMRI.github.io/tickup-charts/)
- Prime roadmap: `Roadmap.md`

## License

See repository policy for private package usage and commercial terms.
