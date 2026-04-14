# Service Layer Documentation

## Table of Contents

- [Service Layer Documentation](#service-layer-documentation)
  - [Table of Contents](#table-of-contents)
  - [1. Overview](#1-overview)
  - [2. Service Philosophy](#2-service-philosophy)
  - [3. Module Structure](#3-module-structure)
  - [4. Standard Service Flow](#4-standard-service-flow)
    - [Example](#example)
  - [5. Init / Context](#5-init--context)
    - [Example](#example-1)
    - [Rules](#rules)
  - [6. ServiceResponse](#6-serviceresponse)
  - [7. Config and Secrets](#7-config-and-secrets)
    - [Secrets](#secrets)
  - [8. Function List](#8-function-list)
  - [9. Worker Map](#9-worker-map)
    - [Notes](#notes)
  - [10. Export Requirements](#10-export-requirements)
  - [11. Main Function (Optional)](#11-main-function-optional)
  - [12. Rules](#12-rules)
    - [12.1 Network](#121-network)
    - [12.2 Response](#122-response)
    - [12.3 Error Handling (Strict)](#123-error-handling-strict)
    - [12.4 Data Normalization](#124-data-normalization)
    - [12.5 Heatmap Format (Standard)](#125-heatmap-format-standard)
      - [Rules](#rules-1)
      - [Notes](#notes-1)
    - [12.6 Cache Compatibility](#126-cache-compatibility)
    - [12.7 Side Effects](#127-side-effects)
    - [12.8 Module Constraints](#128-module-constraints)
  - [13. Naming Conventions](#13-naming-conventions)
  - [14. Common Pitfalls](#14-common-pitfalls)
  - [15. Minimal Example](#15-minimal-example)
  - [16. How to Add a New Service](#16-how-to-add-a-new-service)

---

## 1. Overview

The service layer:

* Fetches data using infrastructure (`GET`, `POST`)
* Converts raw API data into a clean, consistent format
* Owns module-local setup through `init(secrets)` when needed

It acts as a **bridge between APIs and the task/orbit layer**.

---

## 2. Service Philosophy

Service layer must be:

* Deterministic → same input = same output
* Side-effect free → no DB writes, no cache updates
* Module-owned → auth/context setup stays inside the service file
* Driven by orbit/task → orbit loads the module, passes secrets, then runs services

---

## 3. Module Structure

Each service file should follow this shape:

1. Imports
2. Constants
3. Optional `init(secrets)`
4. Functions
5. Worker Map
6. Export
7. Main (optional)

---

## 4. Standard Service Flow

Every function should follow this pattern:

1. Orbit loads the service module
2. Orbit calls `init(secrets)` if present
3. `init(secrets)` returns module context (`ctx`)
4. Task layer calls the service function with `(input, ctx)`
5. Service calls API using `GET` / `POST`
6. Response is passed to `handleServiceError`
7. Normalized data is returned

### Example

```javascript
const response = await GET({ url });

return handleServiceError({
  response,
  format: (data) => ({
    // normalized fields
  })
});
```

---

## 5. Init / Context

`init(secrets)` is optional and lives inside the service file.

Use it to build module-local context such as:

- Auth handlers
- Provider objects
- Service-specific setup
- Precomputed config wrappers

### Example

```javascript
function init(secrets) {
  return {
    providers: {
      githubAuth: new StaticAuthHandler({
        accessToken: secrets.GITHUB_FG_ACCESS_TOKEN
      })
    }
  };
}
```

### Rules

- `init(secrets)` must not fetch API data
- `init(secrets)` must only prepare context
- Services should use `ctx` instead of reading secrets directly
- Orbit provides secrets, service builds its own context

---

## 6. ServiceResponse

All functions must return this consistent structure:

```javascript
{ data, error, code }
```

**Rules:**

- Always return this structure
- Use `handleServiceError` for processing
- `data` must exist (use `{}` or `[]` if empty)
- Never throw errors for normal API failures

---

## 7. Config and Secrets

Used for defining:

- Non-secret constants
- User/runtime configuration
- Module-specific options

```javascript
const PROFILE_URL = `https://api.github.com/users/${username}`;
```

### Secrets

Sensitive values must come from the orbit-provided secrets layer:

- API keys
- client secrets
- refresh tokens
- access tokens

Do not hardcode secrets inside service logic.

---

## 8. Function List

Rules:

* Must be async
* Must return ServiceResponse
* Must not expose raw API
* Must use `ctx` for module-local auth/setup when needed

---

## 9. Worker Map

Defines how the task layer uses your functions.

```javascript
const worker_map = {
  services: {
    GithubProfileData: {
      callable: GithubProfileData,
      key: "github.profile",
      priority: "high",
      next_run: 2 * 3600 * 1000
    }
  }
};
```

**Required Fields:**

- `callable` → Function to execute
- `key` → Cache storage key
- `priority` → Scheduling importance
- `next_run` → Execution interval in milliseconds

### Notes

- `worker_map` describes work, not auth setup
- Auth/context setup belongs to `init(secrets)`
- The task/orbit layer creates `ctx` and passes it to services

---

## 10. Export Requirements

```javascript
module.exports = { worker_map, init };
```

If a module does not need setup, `init` can be omitted.

**Important:** Must export `worker_map` or the service will be ignored.

---

## 11. Main Function (Optional)

Used only for testing.

---

## 12. Rules

### 12.1 Network

- Never use axios or other HTTP libraries directly
- Always use the provided `GET` / `POST` infrastructure methods

### 12.2 Response

Always return the standardized response structure:

```javascript
{ data, error, code }
```

### 12.3 Error Handling (Strict)

- No try/catch blocks around normal API flow
- No suppressing errors
- Do not invent fallback API behavior in services

**Responsibilities:**
- Infrastructure layer handles network and API errors
- Task layer manages retries, fallbacks, and scheduling
- Service layer formats and normalizes data

### 12.4 Data Normalization

- No `undefined` values in returned data
- Use appropriate defaults (`null`, `[]`, `0`)
- Do not expose raw API response structures

### 12.5 Heatmap Format (Standard)

Used for activity-based data (GitHub, LeetCode, etc.)

```json
{
  "heatmap": {
    "years": {
      "2012": {
        "heatmap": [
          { "ts": 1356998400000, "count": 12 }
        ],
        "currentStreak": 5,
        "longestStreak": 10,
        "totalActiveDays": 40,
        "totalContributions": 300
      }
    },
    "global": {
      "currentStreak": 8,
      "longestStreak": 20,
      "totalActiveDays": 100,
      "totalContributions": 300
    }
  }
}
```

#### Rules

- Data must be sorted by `ts` (ascending)
- No duplicate timestamps
- All timestamps must represent start of day in UTC
- Year key must match the timestamp’s year

#### Notes

- Optimized for caching
- Optimized for fast frontend rendering
- Optimized for minimal transformation logic

### 12.6 Cache Compatibility

Data must be:

- JSON serializable
- Predictable and deterministic

**Avoid:**

- Date objects
- Functions or methods
- Class instances in returned data

### 12.7 Side Effects

Service layer must NOT:

- Write to databases
- Update cache directly
- Trigger external workflows

**Only responsibility:**

> Fetch → Normalize → Return

### 12.8 Module Constraints

- Worker name must match function name
- Functions must be async
- No mutation of global or shared state
- `init(secrets)` must stay local to the module

---

## 13. Naming Conventions

- **Worker names** → PascalCase (e.g., `GithubProfileData`)
- **Cache keys** → `namespace.resource` format (e.g., `github.profile`)
- **Provider names** → camelCase (e.g., `githubAuth`)
- **Context** → `ctx`

---

## 14. Common Pitfalls

- Returning raw API response data
- Using try/catch to hide API errors
- Missing or incorrect `worker_map` export
- Inconsistent default values
- Mixing business logic with data transformation
- Hardcoding secrets inside the service body
- Building auth outside `init(secrets)`

---

## 15. Minimal Example

```javascript
function init(secrets) {
  return {
    providers: {
      githubAuth: new StaticAuthHandler({
        accessToken: secrets.GITHUB_FG_ACCESS_TOKEN
      })
    }
  };
}

async function GithubProfileData({ username }, ctx) {
  const auth = ctx.providers.githubAuth;

  const response = await auth.handlePost(async (token) => {
    return GET({
      url: `https://api.github.com/users/${username}`,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  });

  return handleServiceError({
    response,
    format: (data) => ({
      name: data.name,
      avatar: data.avatar_url
    })
  });
}
```

---

## 16. How to Add a New Service

**Steps:**

1. Create a new file in `src/services/`
2. Import required infrastructure (`GET`/`POST`, `handleServiceError`)
3. Add `init(secrets)` if the service needs auth or local setup
4. Create async functions following the service pattern
5. Normalize API responses to consistent format
6. Define `worker_map` with proper configuration
7. Export `worker_map` and `init` if present
8. Test the service locally

**Checklist:**

- [ ] Uses `handleServiceError` for response processing
- [ ] Returns `{ data, error, code }` structure
- [ ] No custom error handling that hides API failures
- [ ] Proper cache key, priority, and `next_run` interval
- [ ] Clean, normalized output data
- [ ] Auth/setup created inside `init(secrets)` when needed
