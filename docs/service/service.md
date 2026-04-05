# Service Layer Documentation

## Table of Contents

1. [Overview](#1-overview)
2. [Service Philosophy](#2-service-philosophy)
3. [Structure](#3-structure)
4. [Standard Service Flow](#4-standard-service-flow)
5. [ServiceResponse](#5-serviceresponse)
6. [Config](#6-config)
7. [Function List](#7-function-list)
8. [Worker Map](#8-worker-map)
9. [Export Requirements](#9-export-requirements)
10. [Main Function (Optional)](#10-main-function-optional)
11. [Rules](#11-rules)
12. [Naming Conventions](#12-naming-conventions)
13. [Common Pitfalls](#13-common-pitfalls)
14. [Minimal Example](#14-minimal-example)
15. [How to Add a New Service](#15-how-to-add-a-new-service)

---

## 1. Overview

The service layer:

* Fetches data using infrastructure (`GET`, `POST`)
* Converts raw API data into a clean, consistent format

It acts as a **bridge between APIs and the task layer**.

---

## 2. Service Philosophy

Service layer must be:

* Stateless → no memory
* Deterministic → same input = same output
* Side-effect free → no DB, no cache updates
* Controlled by task layer → no retry or scheduling logic

---

## 3. Structure

Each service must follow:

1. Config
2. Functions
3. Worker Map
4. Export
5. Main (optional)

---

## 4. Standard Service Flow

Every function should follow this pattern:

1. Call API using `GET` / `POST`
2. Pass response to `handleServiceError`
3. Return normalized data

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

## 5. ServiceResponse

All functions must return this consistent structure:

```javascript
{ data, error, code }
```

**Rules:**

- Always return this structure
- Use `handleServiceError` for processing
- `data` must exist (use `{}` or `[]` if empty)
- Never throw errors

---

## 6. Config

Used for defining:

- API URLs
- Constants and configuration values

```javascript
const PROFILE_URL = `https://api.github.com/users/${USERNAME}`;
```

---

## 7. Function List

Rules:

* Must be async
* Must return ServiceResponse
* Must not expose raw API
* Must not throw

---

## 8. Worker Map

Defines how the task layer uses your function.

```javascript
const worker_map = {
  GithubProfileData: {
    callable: GithubProfileData,
    key: "github.profile",
    priority: "high",
    next_run: 2 * 3600 * 1000  // 2 hours
  }
};
```

**Required Fields:**

- `callable` → The function to execute
- `key` → Cache storage key
- `priority` → Scheduling importance
- `next_run` → Execution interval in milliseconds

---

## 9. Export Requirements

```javascript
module.exports = { worker_map };
```

**Important:** Must export `worker_map` or the service will be ignored.

---

## 10. Main Function (Optional)

Used only for testing.

---

## 11. Rules

### 11.1 Network

- Never use axios or other HTTP libraries directly
- Always use the provided `GET` / `POST` infrastructure methods

### 11.2 Response

Always return the standardized response structure:

```javascript
{ data, error, code }
```

### 11.3 Error Handling (Strict)

- No try/catch blocks
- No modifying or transforming errors
- No suppressing errors

**Responsibilities:**
- 👉 Infrastructure layer handles network and API errors
- 👉 Task layer manages retries, fallbacks, and scheduling

### 11.4 Data Normalization

- No `undefined` values
- Use appropriate defaults (`null`, `[]`, `0`)
- Do not expose raw API response structures

### 11.5 Heatmap Format (Standard)

Used for activity-based data (GitHub, LeetCode, etc.)

```json
{
  "year": {
    "streak": 0,
    "totalActiveDays": 0,
    "heatmap": [
      { "date": 20514, "count": 5 }
    ]
  }
}
```

**Explanation:**

- `date` → Day index (`timestamp / 86400000`)
- `count` → Activity count for that day
- Data must be sorted by date
- No duplicate dates

👉 Ensures consistency across all service providers

### 11.6 Cache Compatibility

Data must be:

- JSON serializable
- Predictable and deterministic

**Avoid:**

- Date objects
- Functions or methods

### 11.7 Side Effects

Service layer must NOT:

- Write to databases
- Update cache directly
- Trigger external workflows

**Only responsibility:**

> Fetch → Normalize → Return

### 11.8 Worker Constraints

- Worker name must match function name
- Functions must be async
- No mutation of global or shared state

---

## 12. Naming Conventions

- **Worker names** → PascalCase (e.g., `GithubProfileData`)
- **Cache keys** → `namespace.resource` format (e.g., `github.profile`)

---

## 13. Common Pitfalls

- Returning raw API response data
- Using try/catch for error handling
- Missing or incorrect `worker_map` export
- Inconsistent default values
- Mixing business logic with data transformation

---

## 14. Minimal Example

```javascript
async function GithubProfileData({ username }) {
  const response = await GET({
    url: `https://api.github.com/users/${username}`
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

## 15. How to Add a New Service

**Steps:**

1. Create a new file in `src/services/`
2. Import required infrastructure (`GET`/`POST`, `handleServiceError`)
3. Define API endpoints and configuration
4. Create async functions following the service pattern
5. Normalize API responses to consistent format
6. Define `worker_map` with proper configuration
7. Export `worker_map`
8. Test the service locally

**Checklist:**

- [ ] Uses `handleServiceError` for response processing
- [ ] Returns `{ data, error, code }` structure
- [ ] No custom error handling (try/catch)
- [ ] Proper cache key, priority, and `next_run` interval
- [ ] Clean, normalized output data
