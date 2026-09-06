# HTTP Routes

The main API endpoint is:

```text
https://api.akhand.dev
```

For local development, replace `https://api.akhand.dev` in the examples with
`http://localhost:3000`.

## Contents

- [Authentication](#authentication)
- [Response Shapes](#response-shapes)
- [Core Routes](#core-routes)
- [GitHub Routes](#github-routes)
- [LeetCode Routes](#leetcode-routes)
- [Roadmap Routes](#roadmap-routes)
- [Spotify Routes](#spotify-routes)
- [Caching](#caching)
- [Adding Routes](#adding-routes)

## Authentication

Protected routes accept either of these authentication methods:

1. API key: send the configured `AUTH_KEY` in the `x-api-key` header.
2. Frontend JWT: call `POST /init`, then send the returned token as a bearer token.

```bash
TOKEN=$(curl -s -X POST https://api.akhand.dev/init | jq -r .token)
curl https://api.akhand.dev/state \
  -H "Authorization: Bearer $TOKEN"
```

The JWT must contain the frontend user type. Requests without valid authentication receive `401 Unauthorized`.

## Response Shapes

### Successful response

Successful route responses normally use this envelope:

```json
{
  "ok": true,
  "data": {}
}
```

`data` contains the route-specific payload. For example, a profile route returns
an object, while a list route returns an array or an object containing a list.

### Error response

Missing database data returns:

```json
{
  "ok": false,
  "message": "... data not found"
}
```

Authentication failures return HTTP `401`:

```json
{
  "error": "Unauthorized"
}
```

The on-demand GitHub repository route can also return a service error:

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

Dates may be ISO date strings such as `2026-08-01`. For date-only `to` values, the entire day is included.

## Core Routes

### Section contents

- [Health check](#get-health)
- [Create frontend token](#post-init)
- [Runtime state](#get-state)
- [Raw database record](#get-databasekey)

Core routes return small control-plane objects. `/database/:key` is the exception:
it returns the stored record, including its `key`, `data`, `source`, and `updatedAt`
fields.

### `GET /health`

Public health check.

```bash
curl https://api.akhand.dev/health
```

Response:

```json
{ "ok": true }
```

### `POST /init`

Creates a frontend JWT valid for one hour. This endpoint is rate limited to five requests per minute.

```bash
curl -X POST https://api.akhand.dev/init
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

Returns database and response-cache information. Authentication required.

```bash
curl https://api.akhand.dev/state \
  -H "Authorization: Bearer $TOKEN"
```

### `GET /database/:key`

Returns a raw database record by key. Authentication required.

```bash
curl https://api.akhand.dev/database/github.profile \
  -H "Authorization: Bearer $TOKEN"
```

## GitHub Routes

GitHub data is collected by the scheduled GitHub service and served from the database. The configured GitHub username is used by the worker; these routes do not accept a username.

All GitHub routes require authentication.

- [Stored profile](#get-githubprofile)
- [Contribution heatmap](#get-githubheatmap)
- [Events](#get-githubevents)
- [Repositories](#get-githubrepositories)
- [On-demand repository information](#get-githubrepo-info)
- [Working repositories](#get-githubworkingrepos)

GitHub service responses return `{ ok, data }`. The `data` value is an object for
profile and heatmap routes, and an array for events and repositories. The working
repository route returns an array of objects with `name`, `started_at`, `ended_at`,
`description`, `commits`, `release_version`, `topics`, `languages`, `star`, and
`active_days` fields.

| Route | `data` shape |
| --- | --- |
| `/github/profile` | `{ username, avatar, profileUrl, repoUrl, bio, publicRepos, followers, following }` |
| `/github/heatmap` | `{ years: { [year]: { heatmap, currentStreak, longestStreak, totalActiveDays, totalContributions } }, global }` |
| `/github/events` | Array of `{ id, type, createdAt, public, repo, actor }` |
| `/github/repositories` | Array of `{ name, description, url, stars, forks, languages, topics, createdAt, updatedAt, isPrivate, isFork }` |
| `/github/repo-info` | `{ name, description, url, stars, forks, watchers, primaryLanguage, languages, defaultBranch, license, createdAt, updatedAt }` |
| `/github/workingrepos` | Array of working-repository objects shown below |

### `GET /github/profile`

Returns the stored GitHub profile.

### `GET /github/heatmap`

Returns the contribution heatmap. Optional query parameters:

| Parameter | Description |
| --- | --- |
| `from` | Include contributions on or after this date. |
| `to` | Include contributions through this date. |

```bash
curl "https://api.akhand.dev/github/heatmap?from=2026-01-01&to=2026-08-31" \
  -H "Authorization: Bearer $TOKEN"
```

### `GET /github/events`

Returns stored GitHub events. Optional query parameters:

| Parameter | Description |
| --- | --- |
| `from` | Event date lower bound. |
| `to` | Event date upper bound. |
| `repo` | Exact repository name, for example `Akkiraj1234/project`. |
| `repoName` | Alias for `repo`. |

```bash
curl "https://api.akhand.dev/github/events?repo=Akkiraj1234/project&from=2026-08-01" \
  -H "Authorization: Bearer $TOKEN"
```

### `GET /github/repositories`

Returns stored repositories. Optional query parameters:

| Parameter | Description |
| --- | --- |
| `limit` | Maximum number of repositories to return. |
| `sort` | Use `latest` or `updated` to sort by `updatedAt` descending. |

```bash
curl "https://api.akhand.dev/github/repositories?limit=5&sort=latest" \
  -H "Authorization: Bearer $TOKEN"
```

### `GET /github/repo-info`

Fetches detailed information directly from GitHub using the on-demand service. Required query parameters:

| Parameter | Description |
| --- | --- |
| `owner` | Repository owner or organization. |
| `repo` | Repository name. |

```bash
curl "https://api.akhand.dev/github/repo-info?owner=Akkiraj1234&repo=akki-core-backend" \
  -H "Authorization: Bearer $TOKEN"
```

### `GET /github/workingrepos`

Returns working repositories from the database-backed working-repository record. Optional `from` and `to` parameters select repositories whose active period overlaps the requested range.

Expected item shape:

```json
{
  "name": "shipyard",
  "started_at": "2026-08-09",
  "ended_at": null,
  "description": "Project description",
  "commits": 67,
  "release_version": "v0.1",
  "topics": ["Developer Tools"],
  "languages": { "Python": 72, "C++": 18, "JavaScript": 10 },
  "star": 0,
  "active_days": 45
}
```

## LeetCode Routes

LeetCode data is collected for the configured account and served from scheduled database records. All routes require authentication.

- [Profile and submission data](#leetcode-data-routes)
- [Heatmap](#leetcode-heatmap)
- [Recent solutions and submissions](#leetcode-lists)

LeetCode routes return `{ ok, data }`. Profile, submission, and skill routes return
objects. The heatmap returns a yearly heatmap object. Recent solutions and recent
submissions return arrays.

| Route | `data` shape |
| --- | --- |
| `/leetcode/profile` | Profile, ranking, reputation, followers, following, and contest badge fields |
| `/leetcode/submission` | `{ username, submission: { solved, failed, untouched, total }, ... }` |
| `/leetcode/skills` | `{ advanced, intermediate, fundamental }` arrays of tag statistics |
| `/leetcode/heatmap` | `{ years, global }`, containing `{ date, count }` heatmap entries |
| `/leetcode/solutions` | Array of `{ title, createdAt, url }` |
| `/leetcode/submissions` | Array of `{ title, timestamp, url }` |

### LeetCode data routes

| Route | Database data |
| --- | --- |
| `GET /leetcode/profile` | Profile and contest information. |
| `GET /leetcode/submission` | Solved, failed, untouched, and total question counts. |
| `GET /leetcode/skills` | Fundamental, intermediate, and advanced tag statistics. |
| `GET /leetcode/heatmap` | Submission heatmap history. |
| `GET /leetcode/solutions` | Recent solution articles. |
| `GET /leetcode/submissions` | Recent accepted submissions. |

The heatmap accepts `from` and `to` query parameters:

### LeetCode heatmap

```bash
curl "https://api.akhand.dev/leetcode/heatmap?from=2026-01-01&to=2026-08-31" \
  -H "Authorization: Bearer $TOKEN"
```

The solution and submission routes accept an optional `limit`:

### LeetCode lists

```bash
curl "https://api.akhand.dev/leetcode/solutions?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

## Roadmap Routes

- [Profile](#get-roadmapprofile)

Roadmap returns `{ ok, data }`, where `data` is the stored profile object. Its
`activity.heatmap` array is filtered when `from` or `to` is provided.

```json
{
  "ok": true,
  "data": {
    "name": "Akhand",
    "avatar": "https://assets.roadmap.sh/avatars/...",
    "customRoadmaps": [],
    "onboardingInfo": {},
    "activity": {
      "heatmap": [{ "date": 1723161600000, "count": 2 }],
      "total": 2
    },
    "roadmap": []
  }
}
```

### `GET /roadmap/profile`

Returns the stored roadmap.sh profile, including activity and roadmaps. Optional `from` and `to` filter the activity heatmap.

```bash
curl "https://api.akhand.dev/roadmap/profile?from=2026-01-01&to=2026-08-31" \
  -H "Authorization: Bearer $TOKEN"
```

## Spotify Routes

Spotify data is collected for the configured account. All routes require authentication.

- [Profile and playback](#spotify-profile-and-playback)
- [Playlists and listening lists](#spotify-lists)

Spotify routes return `{ ok, data }`. Profile, playback, and playlist responses
return objects. Recently played and top tracks return objects with a `tracks` array;
top artists returns an object with an `artists` array.

| Route | `data` shape |
| --- | --- |
| `/spotify/profile` | `{ userId, username, images, profile_url, followers }` |
| `/spotify/current-playing` | `{ is_playing, track, progress: { current, duration } }` |
| `/spotify/playlists` | `{ total, playlists: [{ id, name, description, url, cover }] }` |
| `/spotify/recently-played` | `{ tracks: [{ title, artist, cover, url }] }` |
| `/spotify/top-tracks` | `{ tracks: [{ title, artist, cover, url }] }` |
| `/spotify/top-artists` | `{ artists: [{ name, url, cover }] }` |

### Spotify profile and playback

| Route | Returned data |
| --- | --- |
| `GET /spotify/profile` | User profile information. |
| `GET /spotify/current-playing` | Current playback state and track. |
| `GET /spotify/playlists` | User playlists. |
| `GET /spotify/recently-played` | Recently played tracks. |
| `GET /spotify/top-tracks` | Top tracks. |
| `GET /spotify/top-artists` | Top artists. |

The list routes accept an optional `limit` query parameter:

### Spotify lists

```bash
curl "https://api.akhand.dev/spotify/top-tracks?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

## Caching

Service route responses are cached through the shared `CacheManager` for 30 seconds. The cache key includes the route and sorted query parameters, so these requests have separate cache entries:

```text
GET /spotify/top-tracks?limit=5
GET /spotify/top-tracks?limit=10
```

Only successful responses are cached. Missing-data and error responses are fetched again. The cache is an optimization; clients should treat the scheduled database data as eventually updated rather than real-time.

## Adding Routes

The central router automatically scans `src/server/routes` and loads every JavaScript module that exports `registerRoutes`:

```js
async function registerRoutes({ app, deps, protect }) {
    // Register routes here.
}

module.exports = { registerRoutes };
```

`gernal_routes.js` is currently reserved and is not documented as an application data route.
