# 🧠 akki-core-backend

> **A small orchestration layer for turning external services into reliable application data.**

Applications often depend on multiple external services, each with different APIs, response formats, authentication models, limits, and failure modes.

`akki-core-backend` sits between those services and the application, handling the work around the data — fetching, normalizing, scheduling, storing, caching, and exposing it through an API.

## The Idea

```text
                 External Services
                         │
                         ▼
                  Service Layer
                         │
              ┌──────────┴──────────┐
              │                     │
         Scheduled              On-Demand
              │                     │
            ORBIT                  Route
              │                     │
             TASK                 Cache
              │                     │
           FETCHER              FETCHER
              │                     │
           Database           External API
              │
              ▼
              API
```

The system has two main paths:

* **Scheduled** — recurring data is collected and persisted.
* **On-demand** — request-specific data is fetched when needed.

Each layer has a focused responsibility. Services handle external platforms, workers handle background execution, the database holds collected state, and routes expose application behavior.

## Principles

* **Separate the work.** Fetching, orchestration, storage, caching, and HTTP are different concerns.
* **Normalize early.** Provider-specific differences stay inside their service adapters.
* **Collect when useful.** Frequently used data can be collected in advance.
* **Fetch when necessary.** Request-specific data stays on the on-demand path.
* **Keep state useful.** Stored data remains available when external services are unavailable.
* **Prefer simple boundaries.** Every component should have a clear responsibility.

> **The backend is not the service. It is the layer that makes services usable.**

## Integrations

Currently supported:

* GitHub
* LeetCode
* Roadmap.sh
* Spotify

The runtime also provides:

* ORBIT / TASK background orchestration
* Scheduled data collection
* Database snapshots
* On-demand execution
* Cache management
* Fastify HTTP routes
* JWT and API-key authentication
* Request rate limiting

## API

Production API:

[api.akhand.dev](https://api.akhand.dev?utm_source=chatgpt.com)

Health check:

```bash
curl https://api.akhand.dev/health
```

Protected endpoints can be accessed using a short-lived JWT or the configured API key.

Service routes are organized by provider:

```text
/github/*
/leetcode/*
/roadmap/*
/spotify/*
```

## Documentation

| Document                                               | Purpose                     |
| ------------------------------------------------------ | --------------------------- |
| [`docs/routes.md`](./docs/routes.md)                   | HTTP API and route behavior |
| [`docs/architecture.md`](./docs/architecture.md)       | System architecture         |
| [`docs/contracts.md`](./docs/contracts.md)             | Runtime contracts           |
| [`docs/config.md`](./docs/config.md)                   | Configuration               |
| [`docs/service/service.md`](./docs/service/service.md) | Service architecture        |
| [`docs/service/output.md`](./docs/service/output.md)   | Service output structures   |

More detailed design notes and platform documentation are available in [`docs/`](./docs/).

## Development

```bash
npm install
npm start
```

The development server runs on `http://localhost:3000` by default.

Provider credentials and application secrets must be supplied through the local environment and must never be committed.

## Status

`akki-core-backend` is an actively evolving project. The architecture is intentionally kept small as new services and execution patterns are introduced.

## License

Source available for **educational viewing only**.

Reuse, modification, and redistribution are not permitted.

See [`Licence.md`](./Licence.md) for the complete terms.
