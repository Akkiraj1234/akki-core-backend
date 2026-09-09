# Route reference

This document reflects the current implementation in the repository as of 2026-09-09.

## Authentication

Protected routes accept either of these methods:

1. API key: send `x-api-key` with the configured `AUTH_KEY`
2. Frontend JWT: call `POST /init` and send the returned token as a bearer token

### Token flow

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/init | jq -r .token)
curl http://localhost:3000/state \
  -H "Authorization: Bearer $TOKEN"
```

## Core routes

### `GET /health`

Public health endpoint.

```bash
curl http://localhost:3000/health
```

Response:

```json
{ "ok": true }
```

### `POST /init`

Creates a frontend JWT valid for 1 hour.

```bash
curl -X POST http://localhost:3000/init
```

Response:

```json
{
  "ok": true,
  "token": "<jwt>",
  "expiresIn": "1h"
}
```

### `GET /state`

Returns the current database snapshot and cache size.

### `GET /database/:key`

Returns the stored raw record for a database key.

```bash
curl http://localhost:3000/database/github.profile \
  -H "Authorization: Bearer $TOKEN"
```

## Combined heatmap route

### `GET /gernal/heatmap`

This route is intentionally named with the historical typo `gernal` because the route file is named `gernal_routes.js`.

It returns the latest stored year for each provider when data is available:

- GitHub: `github.heatmap`
- LeetCode: `leetcode.heatmap.history`
- Roadmap: `roadmap.profile.activity.heatmap`

Response shape:

```json
{
  "ok": true,
  "data": {
    "github": { "year": "2025", "data": { "years": { "2025": { ... } } } },
    "leetcode": { "year": "2025", "data": { "years": { "2025": { ... } } } },
    "roadmap": { "year": "2025", "data": { "years": { "2025": { ... } } } }
  }
}
```

## GitHub routes

All GitHub routes require authentication.

| Route | Current behavior |
| --- | --- |
| `GET /github/profile` | Returns stored `github.profile` directly from the database |
| `GET /github/heatmap` | Returns only the most recent year from `github.heatmap` |
| `GET /github/events` | Cached route; supports `n` and optional `repo` / `repoName` filter |
| `GET /github/repositories` | Cached route; supports `n` and optional `sort=latest/updated` |
| `GET /github/repo-info` | On-demand GitHub fetch using the GitHub service adapter |
| `GET /github/activerepo` | Returns stored `github.activerepo` data directly |

### GitHub query parameters

#### `GET /github/events`

- `n`: number of events to return, default `10`
- `repo`: exact repository name filter
- `repoName`: alias for `repo`

Example:

```bash
curl "http://localhost:3000/github/events?n=5&repo=Akkiraj1234/project" \
  -H "Authorization: Bearer $TOKEN"
```

#### `GET /github/repositories`

- `n`: number of repositories to return
- `sort`: `latest` or `updated`

Example:

```bash
curl "http://localhost:3000/github/repositories?n=5&sort=latest" \
  -H "Authorization: Bearer $TOKEN"
```

### Important note on GitHub heatmap filters

The current route implementation returns only the latest year and does not apply `from` / `to` filtering in the handler.

## LeetCode routes

All LeetCode routes require authentication.

| Route | Current behavior |
| --- | --- |
| `GET /leetcode/profile` | Returns stored `leetcode.profile` directly |
| `GET /leetcode/submission` | Cached route; supports `n` and returns the latest `n` entries |
| `GET /leetcode/heatmap` | Returns only the latest year from `leetcode.heatmap.history` |
| `GET /leetcode/solutions` | Cached route; supports `n` |
| `GET /leetcode/submissions` | Cached route; supports `n` |
| `GET /leetcode/skills` | Returns stored `leetcode.skillstats` directly |

### LeetCode query parameters

- `GET /leetcode/submission?n=10`
- `GET /leetcode/solutions?n=10`
- `GET /leetcode/submissions?n=10`

### Important note on LeetCode heatmap filters

The current route handler does not apply `from` / `to` filters; it always returns the latest year only.

## Roadmap routes

All Roadmap routes require authentication.

| Route | Current behavior |
| --- | --- |
| `GET /roadmap/profile` | Returns stored roadmap profile, excluding `activity.heatmap` from the response |
| `GET /roadmap/heatmap` | Returns a year-grouped activity heatmap keyed by the latest year found |

### Important note

The current `GET /roadmap/profile` route does not currently apply `from` / `to` filtering even though older documentation may suggest that it does.

## Spotify routes

All Spotify routes require authentication.

| Route | Current behavior |
| --- | --- |
| `GET /spotify/profile` | Cached route, reads `spotify.profile_info` |
| `GET /spotify/current-playing` | Direct database read; no route cache |
| `GET /spotify/playlists` | Cached route, reads `spotify.user_playlists` |
| `GET /spotify/recently-played` | Cached route, reads `spotify.recently_played` |
| `GET /spotify/top-tracks` | Cached route, reads `spotify.top_tracks` |
| `GET /spotify/top-artists` | Cached route, reads `spotify.top_artists` |

### Spotify query parameters

- `n`: optional limit for cached list routes

Example:

```bash
curl "http://localhost:3000/spotify/top-tracks?n=5" \
  -H "Authorization: Bearer $TOKEN"
```

## Response patterns

The current routes generally follow one of these shapes:

### Success envelope

```json
{
  "ok": true,
  "data": {}
}
```

### Error envelope

```json
{
  "ok": false,
  "message": "Record not found"
}
```

### On-demand service error envelope

```json
{
  "ok": false,
  "error": {
    "type": "MISSING_REQUIRED_INPUT",
    "message": "Required input 'owner' is missing."
  },
  "code": null
}
```

## Cache behavior

The current cache implementation is:

- route-level in-memory cache
- default TTL: 60 seconds
- cache keys are built from route + serialized query string
- only successful responses are cached
- database-originated records are kept non-expiring until replaced by a new record

## Current caveats

These are real implementation notes that should be treated as documentation of what is working today:

- `GET /gernal/heatmap` is present by design but uses the historical typo in the path
- `GET /github/heatmap`, `GET /leetcode/heatmap`, and `GET /roadmap/heatmap` currently return only the most recent year
- `GET /roadmap/profile` does not currently apply `from` / `to` filtering
- `GET /github/repo-info` depends on the upstream GitHub adapter and can fail if the upstream response is not in the expected shape
- the project currently stores records in memory, so restarts clear the database state
