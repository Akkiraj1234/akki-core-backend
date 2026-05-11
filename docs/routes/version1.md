# API v1 Routes

> **Author** : Akhand Raj  
> **GitHub** : [@Akkiraj1234](https://github.com/Akkiraj1234)  
> **Date**   : 8 may 2026 (on-going)

Initial version of routes provided by `api.akhand.dev`.

> [!IMPORTANT]
>
> **Base URL**  
> `https://api.akhand.dev/v1`

---

# Table of Contents

1. [Overview](#overview)
2. [Common Response Behavior](#common-response-behavior)
3. [Common Query Parameters](#common-query-parameters)
4. [Common Status Codes](#common-status-codes)
5. [Shared Specifications](#shared-specifications)
6. Routes
   1. [Profile Data Routes](#profile-data-routes)
   2. [Heatmap Data Routes](#heatmap-data-routes)
   3. [Spotify Data Routes](#spotify-data-routes)
   4. [Other Data Routes](#other-data-routes)

---

# Overview

All `v1` routes follow a shared response, versioning, and diff-based update pattern.

The API is designed to reduce unnecessary payload transfers by supporting incremental updates using client-side version tracking.

---

# Common Response Behavior

Responses may return either:

- Full payload data
- Incremental diff payloads

depending on the provided client version state.

---

# Common Query Parameters

| Parameter | Type | Required | Description |
|------------|------|-----------|-------------|
| `version` | string | Yes | Client-side stored server version used for diff comparison |

---

# Common Status Codes

| Status Code | Meaning | Response |
|--------------|----------|----------|
| `200` | Request successful | JSON |
| `204` | No changes detected | Empty |
| `400` | Missing or invalid request parameters | Empty |
| `429` | Rate limit exceeded | Empty |
| `500` | Internal server error | Empty |

---

# Shared Specifications

| Specification | Description |
|---------------|-------------|
| [Profile Data Spec](../SYSTEM_SPEC.md#profile-data) | Shared structure for profile-related routes |
| [Heatmap Data Spec](../SYSTEM_SPEC.md#heatmap-data) | Shared structure for heatmap-related routes |

---

# Profile Data Routes

## Available Routes

1. [GitHub Profile Data](#github-profile-data)
2. [LeetCode Profile Data](#leetcode-profile-data)
3. [Roadmap.sh Profile Data](#roadmapsh-profile-data)
4. [Spotify Profile Data](#spotify-profile-data)

---

## GitHub Profile Data

### Endpoint

```http
GET /profile/github
```

### Response Shape

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

### Notes

- Response follows the shared [Profile Data Spec](../SYSTEM_SPEC.md#profile-data)
- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

## LeetCode Profile Data

### Endpoint

```http
GET /profile/leetcode
```

### Response Shape

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
    "contestBadge": [ ... ],
    "followers": 0,
    "following": 0,
    "totalSolutions": 0,
  }
}
```

### Notes

- Response follows the shared [Profile Data Spec](../SYSTEM_SPEC.md#profile-data)
- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

## Roadmap.sh Profile Data

### Endpoint

```http
GET /profile/roadmap
```

### Response Shape

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

### Notes

- Response follows the shared [Profile Data Spec](../SYSTEM_SPEC.md#profile-data)
- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

## Spotify Profile Data

### Endpoint

```http
GET /profile/spotify
```

### Response Shape

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

### Notes

- Response follows the shared [Profile Data Spec](../SYSTEM_SPEC.md#profile-data)
- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

# Heatmap Data Routes

## Available Routes

1. [Combined Heatmap Data](#combined-heatmap-data)
2. [GitHub Heatmap Data](#github-heatmap-data)
3. [LeetCode Heatmap Data](#leetcode-heatmap-data)
4. [Roadmap.sh Heatmap Data](#roadmapsh-heatmap-data)

---

## Combined Heatmap Data

### Endpoint

```http
GET /heatmap/combined
```

### Response Shape

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

### Notes

- Response follows the shared [Heatmap Data Spec](../SYSTEM_SPEC.md#heatmap-data)
- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

## GitHub Heatmap Data

### Endpoint

```http
GET /heatmap/github
```

### Response Shape

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

### Notes

- Response follows the shared [Heatmap Data Spec](../SYSTEM_SPEC.md#heatmap-data)
- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

## LeetCode Heatmap Data

### Endpoint

```http
GET /heatmap/leetcode
```

### Response Shape

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

### Notes

- Response follows the shared [Heatmap Data Spec](../SYSTEM_SPEC.md#heatmap-data)
- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

## Roadmap.sh Heatmap Data

### Endpoint

```http
GET /heatmap/roadmap
```

### Response Shape

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

### Notes

- Response follows the shared [Heatmap Data Spec](../SYSTEM_SPEC.md#heatmap-data)
- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

# Spotify Data Routes

## Available Routes

1. [Profile Data](#spotify-profile-data)
2. [Current Playing](#spotify-current-playing)
3. [Recent Played](#spotify-recent-played)
4. [Playlists](#spotify-playlists)
5. [TopTracks](#spotify-top-tracks)
6. [TopArtists](#spotify-top-artists)

---

## Spotify Current Playing

### Endpoint

```http
GET /spotify/current_playing
```

### Response Shape

```json
{
  is_playing: boolean,
  track: {
    title: string,
    artist: Array<{ name: string, url: string }>,
    cover: Array<object>,
    url: string
  } | null,
  progress: {
    current: number,
    duration: number
  }
}
```

### Notes

- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

## Spotify Recent Played

### Endpoint

```http
GET /spotify/recent_played
```

### Response Shape

```js
{
  tracks: Array<{
    title: string,
    artist: Array<{ name: string, url: string }>,
    cover: Array<object>,
    url: string
  }>
}
```

### Notes

- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

## Spotify Playlists

### Endpoint

```http
GET /spotify/playlists
```

### Response Shape

 ```js
 {
  total: number,
  playlists: Array<{
    id: string,
    name: string,
    description: string,
    url: string,
    cover: Array<object>
  }>
}
```

### Notes

- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

## Spotify TopTracks

### Endpoint

```http
GET /spotify/top-tracks
```

### Response Shape

```js
{
  tracks: Array<{
    title: string,
    artist: Array<{ name: string, url: string }>,
    cover: Array<object>,
    url: string
  }>
}
```

### Notes

- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

## Spotify TopTracks

### Endpoint

```http
GET /spotify/top-tracks
```

### Response Shape

```js
{
  tracks: Array<{
    title: string,
    artist: Array<{ name: string, url: string }>,
    cover: Array<object>,
    url: string
  }>
}
```

### Notes

- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

## Spotify TopArtists

### Endpoint

```http
GET /spotify/top-artists
```

### Response Shape

```js
{
  tracks: Array<{
    title: string,
    artist: Array<{ name: string, url: string }>,
    cover: Array<object>,
    url: string
  }>
},
```

### Notes

- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

---

# Other Data Routes

## Available Routes

1. [Github Event Data](#github-event-data)
2. [Github Repository List](#github-repository-list)
3. [Roadmap.sh Roadmap List](#roadmapsh-roadmap-list)
4. [Leetcode Submission Data](#leetcode-submission-data)
5. [Leetcode Recent Submission](#leetcode-recent-submission)
6. [Leetcode Skill Stats](#leetcode-skill-stats)

---

# Github Event Data

## Endpoint

```http
GET /github/github-event
```

## Response Shape

```js
Array<{
  id: string,
  type: string,
  createdAt: string,

  repo: {
    name: string,
    url: string
  },

  actor: {
    username: string,
    avatar: string
  }
}>
```

## Notes

- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

# Github Repository List

## Endpoint

```http
GET /github/repository-list
```

## Query Params

```js
{
  username: string,
  limit?: number
}
```

## Response Shape

```js
Array<{
  name: string,
  description: string | null,

  url: string,

  stars: number,
  forks: number,

  languages: Array<{
    name: string | null,
    color: string | null,
    size: number
  }>,

  topics: Array<string>,

  createdAt: string,
  updatedAt: string,

  isPrivate: boolean,
  isFork: boolean
}>
```

## Notes

- `username` is required
- `limit` defaults to `50`
- Returns repositories ordered by recently updated
- Includes repository language breakdown
- Language metadata includes:
  - `name`
  - `color`
  - `size`
- Repository topics are normalized into string arrays
- Missing values are normalized safely
- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

# Roadmap.sh Roadmap List

## Endpoint

```http
GET /roadmap/roadmap-list
```

## Response Shape

```js
Array<{
  title: string,
  id: string,

  done: number,
  skipped: number,
  learning: number,
  total: number,

  updatedAt: string,

  isCustomResource: boolean,
  roadmapSlug: string
}>
```

## Notes

- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

# Leetcode Submission Data

## Endpoint

```http
GET /leetcode/submission-data
```

## Response Shape

```js
{
  username: string,

  submission: {

    solved: {
      easy: number,
      medium: number,
      hard: number
    },

    failed: {
      easy: number,
      medium: number,
      hard: number
    },

    untouched: {
      easy: number,
      medium: number,
      hard: number
    },

    total: {
      easy: number,
      medium: number,
      hard: number
    }
  },

  languageProblemCount: Array<{
    languageName: string,
    problemsSolved: number
  }>
}
```

## Notes

- Missing values default to `0`
- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

# Leetcode Recent Submission

## Endpoint

```http
GET /leetcode/recent-submission
```

## Query Params

```js
{
  username: string,
  limit?: number
}
```

## Response Shape

```js
Array<{
  title: string,
  timestamp: string | number,

  url: string | null
}>
```

## Notes

- `username` is required
- `limit` defaults to `20`
- Returns only accepted submissions
- `timestamp` is returned as unix timestamp string
- Missing URLs fallback to `null`
- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

# Leetcode Skill Stats

## Endpoint

```http
GET /leetcode/skill-stats
```

## Query Params

```js
{
  username: string
}
```

## Response Shape

```js
{
  advanced: Array<{
    tagName: string,
    problemsSolved: number
  }>,

  intermediate: Array<{
    tagName: string,
    problemsSolved: number
  }>,

  fundamental: Array<{
    tagName: string,
    problemsSolved: number
  }>
}
```

## Notes

- `username` is required
- Returns categorized skill statistics
- Tags are grouped into:
  - `advanced`
  - `intermediate`
  - `fundamental`
- Empty categories fallback to empty arrays
- Supports diff-based incremental updates
- Clients should always store the latest returned server version