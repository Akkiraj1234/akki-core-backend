# API v1 Routes

Initial version of routes provided by `api.akhand.dev`.

> [!IMPORTANT]
>
> **Base URL** `https://api.akhand.dev/v1`


## Table of Contents

1. [Common Response Behavior](#common-response-behavior)
2. [Common Status Codes](#common-status-codes)
3. [Available Routes](#available-routes)
4. [GitHub Profile Data](#github-profile-data)
   1. [Profile Data](#profile-data)
   2. [Roadmap Data](#roadmap-data)
   3. [Other](#other)


## Common Response Behavior
#### Endpoint

```http
GET /roadmap_profile_data
```

#### Query Parameters

| Parameter | Type | Required | Description |
|------------|------|-----------|-------------|
| `version` | string | Yes | Client-side stored server version used for diff comparison |

All `v1` routes follow the same response and versioning pattern.

Responses may return either:

- Full payload data
- Incremental diff payloads

depending on the provided client version state.


## Common Status Codes

| Status Code  | Meaning                               | Data |
|--------------|---------------------------------------|------|
| `200`        | Request successful                    | json |
| `204`        | No changes detected                   | null |
| `400`        | Missing or invalid request parameters | null |
| `429`        | Rate limit exceeded                   | null |
| `500`        | Internal server error                 | null |

---

## Profile Data

1. [GitHub Profile Data](#github-profile-data)
2. [LeetCode Profile Data](#leetcode-profile-data)
3. [Roadmap.sh Data](#roadmapsh-data)
4. [Spotify Data](#spotify-data)


### GitHub Profile Data

#### Endpoint

```http
GET /github_profile_data
```

#### Query Parameters

| Parameter | Type | Required | Description |
|------------|------|-----------|-------------|
| `version` | string | Yes | Client-side stored server version used for diff comparison |

#### Response Shape

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

#### Notes

- Response follows the shared [Profile Data Spec](../SYSTEM_SPEC.md#profile-data)
- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

### LeetCode Profile Data

#### Endpoint

```http
GET /leetcode_profile_data
```

#### Query Parameters

| Parameter | Type | Required | Description |
|------------|------|-----------|-------------|
| `version` | string | Yes | Client-side stored server version used for diff comparison |

#### Response Shape

```json
{
  "data": {
    "username": "string",
    "profileUrl": "string",
    "avatar": "string",
    "bio": "string",
    "total_solution": 0,
    "total_views": 0,
    "followers": 0,
    "following": 0
  }
}
```

#### Notes

- Response follows the shared [Profile Data Spec](../SYSTEM_SPEC.md#profile-data)
- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

### Roadmap.sh Data

#### Endpoint

```http
GET /roadmap_profile_data
```

#### Query Parameters

| Parameter | Type | Required | Description |
|------------|------|-----------|-------------|
| `version` | string | Yes | Client-side stored server version used for diff comparison |

```json
{
  "data": {
    "username": "string",
    "avatar": "string",
    "profileUrl": "string",
    "Roadmaps": 0
  }
}
```

#### Notes

- Response follows the shared [Profile Data Spec](../SYSTEM_SPEC.md#profile-data)
- Supports diff-based incremental updates
- Clients should always store the latest returned server version

---

### Spotify Data

#### Endpoint

```http
GET /roadmap_profile_data
```

#### Query Parameters

| Parameter | Type | Required | Description |
|------------|------|-----------|-------------|
| `version` | string | Yes | Client-side stored server version used for diff comparison |



## Other