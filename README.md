# tickup Prime - The High-Performance Pro Engine

`@tickup/prime` is the premium rendering and product extension for TickUp Charts.
It adds the neon visual profile, Prime-tier shell behavior, and pro-focused roadmap modules.

## Requirements

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

- Prime engine and roadmap: `documentation/15-prime-engine-and-pro-roadmap.md`
- Custom neon theming guide: `documentation/16-custom-neon-themes.md`

## License

See repository policy for private package usage and commercial terms.
