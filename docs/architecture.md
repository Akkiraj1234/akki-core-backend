# Architecture

This document describes the current repository state rather than a future idealized design.

## 1. High-level flow

```text
src/main.js
  ├─ creates DatabaseManager
  ├─ creates CacheManager
  ├─ creates Orbit
  ├─ creates Server
  └─ starts the background task loop

Orbit
  ├─ loads worker maps from src/services
  ├─ creates Task instances
  └─ starts scheduled service workers

Server
  ├─ registers Fastify routes
  ├─ runs JWT and API-key protection
  └─ loads route modules from src/server/routes
```

## 2. Entry points

### `src/main.js`

This is the runtime bootstrap entry.

It performs the following steps:

1. Initializes configuration and decision engine
2. Creates the cache and database managers
3. Creates the ORBIT scheduler
4. Connects the database manager to the ORBIT channel
5. Starts the scheduler
6. Starts the Fastify server

### `src/server/server.js`

The `Server` class wraps Fastify and configures:

- rate limiting
- JWT authentication
- route registration

### `src/server/route.js`

This module is the central route loader. It:

- registers the core routes (`/health`, `/init`, `/state`, `/database/:key`)
- scans `src/server/routes/*.js`
- loads every file that exports `registerRoutes`

## 3. Infrastructure layer

Location: `src/infrastructure`

This layer currently provides the shared runtime plumbing used by the rest of the app.

### HTTP utilities

- `src/infrastructure/http/request.js`
- `src/infrastructure/http/tokenManager.js`

These files provide the request abstraction used by services and help normalize HTTP/network errors.

### Messaging and observer support

- `src/infrastructure/messaging/channel.js`
- `src/infrastructure/messaging/databus.js`
- `src/infrastructure/observer/decisionengine.js`
- `src/infrastructure/observer/resource_monitor.js`
- `src/infrastructure/reporter/logger.js`
- `src/infrastructure/reporter/reporter.js`

The current design shows the early shape of a more advanced event-driven system, but the implementation is still relatively lightweight.

## 4. Service layer

Location: `src/services`

Each provider service exports a `worker_map` that describes the scheduled tasks for that provider.

Current provider folders include:

- `github.js`
- `leetcode.js`
- `roadmap.js`
- `spotify.js`

Each service is expected to:

- fetch data using the shared HTTP helpers
- normalize the provider response into a stable internal shape
- return a `ServiceResponse`-style payload
- register its worker metadata in `worker_map`

## 5. Core orchestration layer

Location: `src/core`

### `orbit.js`

`Orbit` loads all JavaScript files in `src/services`, validates each `worker_map`, and builds `Task` instances for each provider.

### `task.js`

`Task` manages scheduled execution, service coordination, and task lifecycle handling for a worker group.

### Current status

The core orchestration files exist and are actively used in the boot flow, but they are still best described as a working scaffold rather than a fully mature orchestration engine.

## 6. Storage and cache layer

Location: `src/server/storage`

### `databaseManager.js`

`DatabaseManager` stores records in memory and supports:

- `upsert(key, data)`
- `get(key)`
- `snapshot()`
- attachment to the ORBIT channel

Important implementation detail:

- database-originated records are cached with `ttlMs: 0`, which means they remain available until replaced by a fresh upsert
- this is intentional and differs from standard route-cache TTL behavior

### `cacheManager.js`

`CacheManager` manages route response caching. Route caches are keyed by route and serialized query string.

Current default route cache TTL:

- 60,000 ms (60 seconds)

## 7. Route layer

Location: `src/server/routes`

The route layer is split by provider and auto-loaded by the central router.

Current route modules:

- `gernal_routes.js`
- `github_routes.js`
- `leetcode_routes.js`
- `roadmap_routes.js`
- `spotify_routes.js`

Each route module exports `registerRoutes`, which is invoked by the main route loader.

## 8. Authentication and protection

Core security behavior is configured in `src/server/route.js`:

- `x-api-key` is accepted if `AUTH_KEY` is configured
- otherwise, a request can authenticate with a frontend JWT created by `POST /init`
- protected endpoints require a valid frontend JWT with `user.type === "frontend"`

## 9. Data flow

The current runtime flow looks like this:

1. A scheduled worker fetches data from a provider
2. The service normalizes and returns a structured payload
3. `DatabaseManager` stores the result under a key like `github.profile`
4. Route handlers read from the database or route cache
5. Fastify returns the normalized payload to the caller

## 10. Current known gaps

This project is functional, but a few areas are still incomplete or inconsistent with older docs:

- the route cache is not a full persistent cache layer; it is in-memory only
- the ORBIT/TASK system is present but not yet a complete runtime orchestration platform
- some older route docs describe query filters that are not currently implemented in the handlers
- the `/gernal/heatmap` route keeps the historical typo in the path name for compatibility

## 11. Bottom line

The backend is currently best understood as a working, modular data-collection and API-exposure layer:

- providers fetch and normalize external data
- ORBIT schedules and coordinates workers
- DatabaseManager stores current state
- route handlers expose that state through Fastify
- CacheManager improves response reuse for repeat reads
