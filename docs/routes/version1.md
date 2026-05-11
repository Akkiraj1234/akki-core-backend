# API v1 Documentation

This document describes the `v1` API exposed by `api.akhand.dev`, with a focus on what the client receives, how version-based updates work, and the response shape of each route.

## Base URL

```txt
https://api.akhand.dev/v1
```

## Table of Contents

1. [Overview](#overview)
2. [How Version 1 Works](#how-version-1-works)
3. [Common Request Rules](#common-request-rules)
4. [Common Response Behavior](#common-response-behavior)
5. [Common Status Codes](#common-status-codes)
6. [Route Index](#route-index)
7. [Profile Routes](#profile-routes)
8. [Heatmap Routes](#heatmap-routes)
9. [Spotify Routes](#spotify-routes)
10. [Other Routes](#other-routes)

---

## Overview

Version 1 is a read-focused API that serves profile, activity, and media data gathered from multiple services such as GitHub, LeetCode, roadmap.sh, and Spotify.

The API is designed to help clients avoid downloading unchanged data repeatedly. To support this, `v1` uses a version-aware response model.

## How Version 1 Works

The client sends its last known server version using the `version` query parameter.

Based on that version, the server may return:

1. A full payload when the client has no usable local version.
2. Updated data when the server has newer content.
3. `204 No Content` when the client is already up to date.

### Recommended Client Flow

1. Call a route with the last stored `version`.
2. If the response is `200`, update local state with the returned payload.
3. Store the newest server version for the next sync.
4. If the response is `204`, keep the current local data.

### Example

```http
GET /v1/profile/github?version=1715523000000
```

If data has changed, the client receives a `200` response with the route payload. If nothing has changed, the client receives `204 No Content`.

---

## Common Request Rules

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `version` | `string` | Yes | Client-side version used to check whether new data is available. |

### Notes

- All routes documented here are `GET` routes.
- Clients should treat `version` as an opaque server-generated value.
- Clients should always store the latest version returned by the API flow.

---

## Common Response Behavior

The exact payload depends on the route, but the overall behavior is consistent across `v1`.

### When the response is `200`

The client receives the current data for that route.

### When the response is `204`

The client should assume that nothing has changed since the provided version and continue using cached data.

### Payload Conventions

- Some routes return their data inside a top-level `data` object.
- Some routes return arrays directly.
- Some routes return route-specific root objects such as `tracks`, `artists`, or `calendar`.

This difference is expected and should be handled per route.

---

## Common Status Codes

| Status Code | Meaning |
|---|---|
| `200` | Request succeeded and data was returned. |
| `204` | No new data is available for the supplied version. |
| `400` | Missing or invalid request parameters. |
| `429` | Rate limit exceeded. |
| `500` | Internal server error. |

---

## Route Index

### Profile

| Endpoint | Description |
|---|---|
| [`GET /profile/github`](#get-profilegithub) | GitHub profile summary |
| [`GET /profile/leetcode`](#get-profileleetcode) | LeetCode profile summary |
| [`GET /profile/roadmap`](#get-profileroadmap) | roadmap.sh profile summary |
| [`GET /profile/spotify`](#get-profilespotify) | Spotify profile summary |

### Heatmap

| Endpoint | Description |
|---|---|
| [`GET /heatmap/combined`](#get-heatmapcombined) | Combined GitHub and LeetCode heatmap |
| [`GET /heatmap/github`](#get-heatmapgithub) | GitHub heatmap |
| [`GET /heatmap/leetcode`](#get-heatmapleetcode) | LeetCode heatmap |
| [`GET /heatmap/roadmap`](#get-heatmaproadmap) | roadmap.sh heatmap |

### Spotify

| Endpoint | Description |
|---|---|
| [`GET /spotify/current_playing`](#get-spotifycurrent_playing) | Current playback state |
| [`GET /spotify/recent_played`](#get-spotifyrecent_played) | Recently played tracks |
| [`GET /spotify/playlists`](#get-spotifyplaylists) | User-owned playlists |
| [`GET /spotify/top-tracks`](#get-spotifytop-tracks) | Top tracks |
| [`GET /spotify/top-artists`](#get-spotifytop-artists) | Top artists |

### Other

| Endpoint | Description |
|---|---|
| [`GET /github/github-event`](#get-githubgithub-event) | GitHub event feed |
| [`GET /github/repository-list`](#get-githubrepository-list) | GitHub repository list |
| [`GET /roadmap/roadmap-list`](#get-roadmaproadmap-list) | roadmap.sh progress list |
| [`GET /leetcode/submission-data`](#get-leetcodesubmission-data) | LeetCode submission totals |
| [`GET /leetcode/recent-submission`](#get-leetcoderecent-submission) | LeetCode recent accepted submissions |
| [`GET /leetcode/skill-stats`](#get-leetcodeskill-stats) | LeetCode skill statistics |

---

## Profile Routes

Shared reference:
- [Profile Data Spec](../SYSTEM_SPEC.md#profile-data)

### `GET /profile/github`

Returns GitHub profile information for the configured account.

```json
{
  "data": {
    "username": "string",
    "avatar": "string",
    "profileUrl": "string",
    "repoUrl": "string",
    "bio": "string",
    "publicRepos": 0,
    "followers": 0,
    "following": 0
  }
}
```

Useful for:
- Profile cards
- Public account summary views
- Hero/header profile sections

### `GET /profile/leetcode`

Returns LeetCode profile information for the configured account.

```json
{
  "data": {
    "username": "string",
    "profileUrl": "string",
    "avatar": "string",
    "bio": "string",
    "totalViews": 0,
    "ranking": 0,
    "reputation": 0,
    "starRating": 0,
    "contestBadge": [],
    "followers": 0,
    "following": 0,
    "totalSolutions": 0
  }
}
```

Useful for:
- Competitive coding profile sections
- Rankings and reputation widgets
- Dashboard summaries

### `GET /profile/roadmap`

Returns roadmap.sh profile information for the configured account.

```json
{
  "data": {
    "username": "string",
    "avatar": "string",
    "profileUrl": "string",
    "roadmapsCompleted": 0
  }
}
```

Useful for:
- Learning progress summaries
- Public developer profile pages

### `GET /profile/spotify`

Returns Spotify profile information for the configured account.

```json
{
  "data": {
    "username": "string",
    "avatar": "string",
    "profileUrl": "string",
    "followers": 0,
    "playlists": 0
  }
}
```

Useful for:
- Music profile badges
- Creator profile dashboards

---

## Heatmap Routes

Shared reference:
- [Heatmap Data Spec](../SYSTEM_SPEC.md#heatmap-data)

### Heatmap Shape

Most heatmap routes use this structure:

```json
{
  "activeYears": [2000],
  "calendar": {
    "years": {
      "2000": {
        "heatmap": [
          {
            "date": 1728738937,
            "count": 2
          }
        ],
        "currentStreak": 1,
        "longestStreak": 1,
        "totalActiveDays": 1,
        "totalContributions": 1
      }
    },
    "global": {
      "currentStreak": 1,
      "longestStreak": 1,
      "totalActiveDays": 1,
      "totalContributions": 1
    }
  }
}
```

### `GET /heatmap/combined`

Returns both GitHub and LeetCode heatmap data in one response.

```json
{
  "github": {
    "activeYears": [2000],
    "calendar": {
      "years": {
        "2000": {
          "heatmap": [
            {
              "date": 1728738937,
              "count": 2
            }
          ],
          "currentStreak": 1,
          "longestStreak": 1,
          "totalActiveDays": 1,
          "totalContributions": 1
        }
      },
      "global": {
        "currentStreak": 1,
        "longestStreak": 1,
        "totalActiveDays": 1,
        "totalContributions": 1
      }
    }
  },
  "leetcode": {
    "activeYears": [2000],
    "calendar": {
      "years": {
        "2000": {
          "heatmap": [
            {
              "date": 1728738937,
              "count": 2
            }
          ],
          "currentStreak": 1,
          "longestStreak": 1,
          "totalActiveDays": 1,
          "totalContributions": 1
        }
      },
      "global": {
        "currentStreak": 1,
        "longestStreak": 1,
        "totalActiveDays": 1,
        "totalContributions": 1
      }
    }
  }
}
```

Useful for:
- Unified activity dashboards
- Side-by-side contribution views

### `GET /heatmap/github`

Returns GitHub heatmap data only.

```json
{
  "activeYears": [2000],
  "calendar": {
    "years": {
      "2000": {
        "heatmap": [
          {
            "date": 1728738937,
            "count": 2
          }
        ],
        "currentStreak": 1,
        "longestStreak": 1,
        "totalActiveDays": 1,
        "totalContributions": 1
      }
    },
    "global": {
      "currentStreak": 1,
      "longestStreak": 1,
      "totalActiveDays": 1,
      "totalContributions": 1
    }
  }
}
```

### `GET /heatmap/leetcode`

Returns LeetCode heatmap data only.

```json
{
  "activeYears": [2000],
  "calendar": {
    "years": {
      "2000": {
        "heatmap": [
          {
            "date": 1728738937,
            "count": 2
          }
        ],
        "currentStreak": 1,
        "longestStreak": 1,
        "totalActiveDays": 1,
        "totalContributions": 1
      }
    },
    "global": {
      "currentStreak": 1,
      "longestStreak": 1,
      "totalActiveDays": 1,
      "totalContributions": 1
    }
  }
}
```

### `GET /heatmap/roadmap`

Returns roadmap.sh heatmap data only.

```json
{
  "activeYears": [2000],
  "calendar": {
    "years": {
      "2000": {
        "heatmap": [
          {
            "date": 1728738937,
            "count": 2
          }
        ],
        "currentStreak": 1,
        "longestStreak": 1,
        "totalActiveDays": 1,
        "totalContributions": 1
      }
    },
    "global": {
      "currentStreak": 1,
      "longestStreak": 1,
      "totalActiveDays": 1,
      "totalContributions": 1
    }
  }
}
```

---

## Spotify Routes

### Common Track Shape

The track-based Spotify routes return objects in this form:

```json
{
  "title": "string",
  "artist": [
    {
      "name": "string",
      "url": "string"
    }
  ],
  "cover": [],
  "url": "string"
}
```

### `GET /spotify/current_playing`

Returns the current playback state and track progress.

```json
{
  "is_playing": true,
  "track": {
    "title": "string",
    "artist": [
      {
        "name": "string",
        "url": "string"
      }
    ],
    "cover": [],
    "url": "string"
  },
  "progress": {
    "current": 0,
    "duration": 0
  }
}
```

Useful for:
- Live now-playing widgets
- Streaming overlays
- Personal dashboard cards

### `GET /spotify/recent_played`

Returns recently played tracks.

```json
{
  "tracks": [
    {
      "title": "string",
      "artist": [
        {
          "name": "string",
          "url": "string"
        }
      ],
      "cover": [],
      "url": "string"
    }
  ]
}
```

### `GET /spotify/playlists`

Returns playlists owned by the configured Spotify user.

```json
{
  "total": 0,
  "playlists": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "url": "string",
      "cover": []
    }
  ]
}
```

### `GET /spotify/top-tracks`

Returns the user's top tracks.

```json
{
  "tracks": [
    {
      "title": "string",
      "artist": [
        {
          "name": "string",
          "url": "string"
        }
      ],
      "cover": [],
      "url": "string"
    }
  ]
}
```

### `GET /spotify/top-artists`

Returns the user's top artists.

```json
{
  "artists": [
    {
      "name": "string",
      "url": "string",
      "cover": []
    }
  ]
}
```

Notes:
- Spotify media arrays such as `cover` are returned as provided by the upstream source.
- Playback progress values are represented numerically.

---

## Other Routes

### `GET /github/github-event`

Returns a list of recent GitHub events.

```json
[
  {
    "id": "string",
    "type": "string",
    "createdAt": "string",
    "repo": {
      "name": "string",
      "url": "string"
    },
    "actor": {
      "username": "string",
      "avatar": "string"
    }
  }
]
```

Useful for:
- Activity feeds
- Developer profile timelines

### `GET /github/repository-list`

Returns public repository data for a GitHub user.

Query parameters:

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `username` | `string` | Yes | GitHub username |
| `limit` | `number` | No | Maximum number of repositories to return. Default: `50` |

```json
[
  {
    "name": "string",
    "description": "string",
    "url": "string",
    "stars": 0,
    "forks": 0,
    "languages": [
      {
        "name": "string",
        "color": "string",
        "size": 0
      }
    ],
    "topics": ["string"],
    "createdAt": "string",
    "updatedAt": "string",
    "isPrivate": false,
    "isFork": false
  }
]
```

Notes:
- Repositories are ordered by recent updates.
- Missing values are normalized safely when possible.

### `GET /roadmap/roadmap-list`

Returns roadmap.sh progress data for available roadmaps.

```json
[
  {
    "title": "string",
    "id": "string",
    "done": 0,
    "skipped": 0,
    "learning": 0,
    "total": 0,
    "updatedAt": "string",
    "isCustomResource": false,
    "roadmapSlug": "string"
  }
]
```

### `GET /leetcode/submission-data`

Returns LeetCode solved, failed, untouched, and total counts grouped by difficulty.

```json
{
  "username": "string",
  "submission": {
    "solved": {
      "easy": 0,
      "medium": 0,
      "hard": 0
    },
    "failed": {
      "easy": 0,
      "medium": 0,
      "hard": 0
    },
    "untouched": {
      "easy": 0,
      "medium": 0,
      "hard": 0
    },
    "total": {
      "easy": 0,
      "medium": 0,
      "hard": 0
    }
  },
  "languageProblemCount": [
    {
      "languageName": "string",
      "problemsSolved": 0
    }
  ]
}
```

Notes:
- Missing numeric values should be treated as `0`.

### `GET /leetcode/recent-submission`

Returns recent accepted LeetCode submissions for a user.

Query parameters:

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `username` | `string` | Yes | LeetCode username |
| `limit` | `number` | No | Maximum number of submissions to return. Default: `20` |

```json
[
  {
    "title": "string",
    "timestamp": "string",
    "url": "string"
  }
]
```

Notes:
- Only accepted submissions are returned.
- `timestamp` is a Unix timestamp string.
- `url` may be `null` when the upstream value is not available.

### `GET /leetcode/skill-stats`

Returns LeetCode problem-solving stats grouped by skill level.

Query parameters:

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `username` | `string` | Yes | LeetCode username |

```json
{
  "advanced": [
    {
      "tagName": "string",
      "problemsSolved": 0
    }
  ],
  "intermediate": [
    {
      "tagName": "string",
      "problemsSolved": 0
    }
  ],
  "fundamental": [
    {
      "tagName": "string",
      "problemsSolved": 0
    }
  ]
}
```

Notes:
- Empty categories are returned as empty arrays.

---

## Integration Notes

- Treat route payloads as read-only API output.
- Cache the returned data locally together with the last known `version`.
- Handle `204` as a valid success state.
- Build route-specific parsers because not every endpoint uses the same top-level response shape.
