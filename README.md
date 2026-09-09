# akki-core-backend

A small orchestration layer that turns external services into reliable, queryable application data.

This backend is designed to sit between provider APIs and the app layer. It fetches data, normalizes it, stores it, caches route responses, and exposes a consistent HTTP surface for downstream clients.

## What this project currently does

- Collects and stores scheduled data from GitHub, LeetCode, Roadmap.sh, and Spotify
- Runs background service tasks through the ORBIT/TASK pattern
- Exposes protected HTTP routes for profile, event, heatmap, list, and on-demand data
- Uses in-memory database records plus route-level caching for faster reads
- Supports frontend JWT creation and API-key authentication

## Runtime architecture

```text
External services
      │
      ▼
  src/services
      │
      ▼
  ORBIT / TASK scheduler
      │
      ▼
  src/server/storage
  (DatabaseManager + CacheManager)
      │
      ▼
  Fastify routes
      │
      ▼
  API clients / frontend apps
```

## Current integrations

- GitHub
- LeetCode
- Roadmap.sh
- Spotify

## API surface at a glance

### Core routes

- `GET /health`
- `POST /init`
- `GET /state`
- `GET /database/:key`
- `GET /gernal/heatmap`

### Service routes

- GitHub: `/github/profile`, `/github/heatmap`, `/github/events`, `/github/repositories`, `/github/repo-info`, `/github/activerepo`
- LeetCode: `/leetcode/profile`, `/leetcode/submission`, `/leetcode/heatmap`, `/leetcode/solutions`, `/leetcode/submissions`, `/leetcode/skills`
- Roadmap: `/roadmap/profile`, `/roadmap/heatmap`
- Spotify: `/spotify/profile`, `/spotify/current-playing`, `/spotify/playlists`, `/spotify/recently-played`, `/spotify/top-tracks`, `/spotify/top-artists`

## Documentation

| Document | Purpose |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Current runtime architecture and component flow |
| [docs/routes.md](docs/routes.md) | Route reference, auth, query parameters, and caveats |
| [docs/known-issues.md](docs/known-issues.md) | Known implementation gaps and current limitations |
| [docs/service/service.md](docs/service/service.md) | Service-layer contract and normalization rules |
| [docs/service/output.md](docs/service/output.md) | Service output shape notes |

## Local setup

```bash
npm install
npm start
```

The app starts on `http://localhost:3000` by default.

## Environment and secrets

Provider credentials and application secrets must be supplied through the local environment and should never be committed to source control.

## Current implementation notes

This repository is actively evolving. The current code already exposes a working route layer and scheduler, but some parts are still best understood as scaffolding rather than a fully finished orchestration platform.

Notable items:

- The route cache is implemented with a default TTL of 60 seconds.
- Database-originated cache entries are intentionally kept non-expiring until they are overwritten by a new upsert.
- Some route handlers are direct database reads, while others are cached route responses.
- A few documented behaviors are currently not implemented in the route code exactly as described in older docs.

## Development

```bash
npm test
```

## License

Source is available for educational viewing only.

See [Licence.md](Licence.md) for the full licensing terms.
