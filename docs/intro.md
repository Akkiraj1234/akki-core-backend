# **akhand.dev — System Architecture Documentation**

---

# 🧠 1. Overview

**akhand.dev** is a **modular data ingestion and scheduling system** designed to:

* Fetch data from multiple external services (LeetCode, Spotify, etc.)
* Normalize and store data
* Dynamically control execution based on system conditions (bandwidth, cost, errors)
* Maintain a global version for synchronization

---

# ⚙️ 2. High-Level Architecture

```txt
Orbit (Scheduler + Policy Engine)
        ↓
Task (Execution Unit per service)
        ↓
Fetcher Layer (API logic)
        ↓
Request Layer (HTTP abstraction)
        ↓
Cache / Storage
```

---

# 🌐 3. Request Layer (`request.js`)

## Purpose

Centralized HTTP abstraction for all external API calls.

## Responsibilities

* Handle HTTP requests (Axios/fetch)
* Normalize responses
* Classify errors
* Return structured results

## Design Pattern

**Adapter / Gateway Pattern**

## Return Format

```js
{
  data?: any,
  error?: {
    type: string,
    retryable: boolean
  }
}
```

## Error Types

| Type           | Description                     | Retry |
| -------------- | ------------------------------- | ----- |
| NETWORK_ERROR  | Timeout, DNS, connection issues | Yes   |
| SERVER_ERROR   | 5xx responses                   | Yes   |
| RATE_LIMITED   | 429                             | Yes   |
| BAD_REQUEST    | Invalid query                   | No    |
| USER_NOT_FOUND | Resource not found              | No    |
| UNKNOWN_ERROR  | Fallback                        | No    |

---

# 🔧 4. Fetcher Layer (Service-specific functions)

## Purpose

Encapsulate API-specific logic and data transformation.

## Examples

* `LeetcodeProfileData`
* `fetchLeetcodeHeatmap`
* `fetchLeetcodeHeatmapLastNYears`

## Responsibilities

* Call `request.js`
* Parse and validate response
* Transform raw data into consistent structure

## Design Pattern

**Service Layer / Data Access Layer**

---

# ⚙️ 5. Task Layer (`task`)

## Purpose

Execution unit responsible for:

* Orchestrating fetchers
* Combining results
* Returning execution status

## Responsibilities

* Call fetch functions
* Aggregate data
* Return structured result to Orbit

## DOES NOT:

* Manage scheduling
* Manage global version
* Handle global policy

---

## Task Interface

```js
class Task {
  async run(context) {}
  async hardRun(context) {}
  async stop() {}
}
```

---

## Task Return Contract

```js
{
  status: "success" | "error" | "skip",

  payload?: {
    key: string,
    data: any
  },

  error?: {
    type: string,
    retryable: boolean
  },

  nextRunAt?: number
}
```

---

# 🧠 6. Orbit (Core Engine)

## Purpose

Central brain of the system.

## Responsibilities

### Scheduling

* Decide when tasks run
* Manage execution timing

### Policy Enforcement

* Bandwidth throttling
* Cost optimization
* Rate limiting

### Execution Control

* Retry logic
* Skip logic
* Backoff strategies

### Version Management

* Maintain **global version**
* Update version on successful execution

---

## Orbit Design Pattern

**Orchestrator + Policy Engine**

---

# 🔄 7. Execution Flow

```txt
Orbit → task.run()
        ↓
Task:
  fetch → process → return result
        ↓
Orbit:
  evaluates result
  updates version
  schedules next run
```

---

# 🗄️ 8. Cache / Storage Design

## Purpose

Store:

* fetched data
* metadata
* version

---

## Key Structure

```txt
<service>:<resource>
```

### Examples

```txt
leetcode:profile
leetcode:heatmap
spotify:topTracks
```

---

## Global Metadata

```txt
global:version
system:lastRun:<service>
```

---

# 🧠 9. Versioning Strategy

## Approach

**Global version managed by Orbit**

---

## Implementation

```js
const version = Date.now()
await cache.set("global:version", version)
```

---

## Properties

* Monotonic (always increasing)
* No locks required
* Single writer (Orbit)
* Millisecond precision

---

## Optional Safety

```js
version = Math.max(Date.now(), lastVersion + 1)
```

---

# ⚠️ 10. Concurrency Model

## Key Principle

> Avoid shared mutable state

---

## Strategy

* Tasks operate independently
* No shared keys between tasks
* Orbit is the only global writer

---

## Result

* No locking required
* Safe async execution
* Predictable behavior

---

# 🧩 11. Design Principles Used

### 1. Separation of Concerns

* Request → Fetch → Task → Orbit

### 2. Single Responsibility

* Each layer has a clearly defined role

### 3. Centralized Control

* Orbit controls system behavior

### 4. Loose Coupling

* Tasks don’t know about Orbit internals
* Orbit doesn’t know task schemas

### 5. Deterministic Versioning

* Based on time, not state mutation

---

# 📦 12. Folder Structure (Recommended)

```txt
akhand.dev/
  orbit/
    scheduler.js
    policy.js

  services/
    leetcode/
      task.js
      fetcher.js
      request.js
      transform.js

  core/
    cache.js
```

---

# 🧠 13. Mental Model

```txt
Orbit = brain (decides)
Task  = executor (runs logic)
Fetcher = data layer (gets data)
Request = transport (HTTP)
Cache = storage
Version = system state signal
```

---

# 📌 14. Summary

* Orbit is the **central orchestrator**
* Tasks are **execution units**
* Fetchers handle **external data**
* Request layer ensures **reliability**
* Cache stores **data and metadata**
* Versioning is **timestamp-based and centralized**

---

# 🚀 Final Note

This architecture is:

* scalable
* modular
* async-safe
* production-ready (with minimal extensions)

---

**Project:** akhand.dev
**Architecture Type:** Modular Orchestrated Data Pipeline
