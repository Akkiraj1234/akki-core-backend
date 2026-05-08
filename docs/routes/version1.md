# API v1 Routes

> **Author** : Akhand Raj  
> **GitHub** : [@Akkiraj1234](https://github.com/Akkiraj1234)  
> **Date**   : 1 Aug 2025  
> **Status** : Completed

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
    "totalSolutions": 0,
    "totalViews": 0,
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
