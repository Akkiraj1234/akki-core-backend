# akki-core-backend

Core backend infrastructure for personal data collectors and service adapters used by `akhand.dev`.

## Documentation

- [Architecture (Current State)](docs/architecture.md)
- [Runtime Contracts](docs/contracts.md)
- [Service Layer Guide](docs/service-layer.md)
- [Service Output Shapes](docs/service-outputs.md)
- [Legacy Blueprint Notes](docs/intro.md)

## Current Implementation Snapshot

- HTTP abstraction and error normalization in `src/infrastructure/http/request.js`
- Token refresh manager in `src/infrastructure/http/tokenManager.js`
- Service modules in `src/services/*`
- Core orchestrator (`orbit/databus`) is in scaffold stage

## Run

```bash
npm start
```

## Dev Script Runner

```bash
npm run tool
```

> Note
> License: Source available for educational viewing only. Reuse, modification, or redistribution of this code is not permitted.
