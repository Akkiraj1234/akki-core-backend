# akki-core-backend Architecture

This document explains the current architecture of `akki-core-backend`: what the project is trying to achieve, how the code is organized, how modules communicate, what each important class does, and how the plugin-style service system works.

## 1. What This Project Is Trying To Achieve

`akki-core-backend` is a modular data orchestration backend for personal projects such as `akhand.dev`.

The main goal is to collect data from external platforms, normalize it into stable shapes, store the latest results in memory, and expose those results through protected HTTP APIs.

Current external data sources include:

- GitHub
- Spotify
- LeetCode
- roadmap.sh

The bigger design goal is not just "call APIs". The project is moving toward a small self-managing backend core:

- auto-load service plugins from files
- run each service on its own schedule
- normalize API responses and errors
- handle OAuth/static token flows
- cache and store latest results
- expose internal state and fetched data
- eventually observe resource pressure, rate limits, failures, and adapt scheduling

In short:

```txt
External APIs -> Service plugins -> Task scheduler -> Orbit -> DatabaseManager -> Fastify API
```

## 2. High-Level Runtime Flow

When the app starts from `src/main.js`, this happens:

```txt
main()
  -> bootstrap()
    -> initialize decision engine
    -> create CacheManager
    -> create DatabaseManager
    -> create Orbit
    -> create Fastify Server
    -> attach DatabaseManager to Orbit's channel
    -> start Orbit
    -> start HTTP server
```

At runtime:

```txt
Orbit scans src/services
  -> loads every service file with a worker_map
  -> builds one Task per worker_map
  -> each Task runs its service callables
  -> service functions call external APIs using GET/POST/AuthHandler
  -> service functions return { data, error, code }
  -> Task sends successful output to database_channel
  -> DatabaseManager receives message and stores latest record
  -> /data/:key reads records from DatabaseManager
```

## 3. Folder Structure

```txt
src/
  main.js                    App entrypoint and runtime bootstrap
  error.js                   Normalized error types and error factories
  utils.js                   Shared response, sanitizer, heatmap, constants, dev helpers

  config/
    config.js                Loads secret.env and config.json
    config.json              Public service configuration
    index.js                 Re-export for config module

  core/
    orbit.js                 Global orchestrator and service plugin loader
    task.js                  Per-service scheduler and executor

  infrastructure/
    index.js                 Infrastructure barrel export
    http/
      request.js             Axios wrapper and HTTP/GraphQL error normalization
      tokenManager.js        OAuth refresh-token and static-token auth helpers
    messaging/
      channel.js             Local EventEmitter channel used by Orbit/Task/Database
      databus.js             Global EventEmitter placeholder
    observer/
      decisionengine.js      Adaptive scheduling math
      resource_monitor.js    Placeholder for future observer system
    reporter/
      logging.js             Console logger
      reporter.js            Placeholder for future reporting

  server/
    server.js                Fastify server wrapper
    routes/index.js          HTTP routes
    storage/
      cacheManager.js        In-memory TTL cache
      databaseManager.js     In-memory record store with cache integration

  services/
    github.js                GitHub service plugin
    spotify.js               Spotify service plugin
    leetcode.js              LeetCode service plugin
    roadmap.js               roadmap.sh service plugin
```

## 4. Core Concepts

### Service Plugin

A service plugin is a file inside `src/services` that exports a `worker_map`.

Each `worker_map` tells Orbit:

- what config path to use
- whether the service needs initialization
- what the task name is
- which fetcher functions should run
- where each fetcher's output should be stored
- how often each fetcher should run
- how important each fetcher is

Example shape:

```js
const worker_map = {
  initFunc: init,
  configKey: "services.github.config",
  name: "Github_Service",
  services: {
    GithubProfileData: {
      callable: getGithubProfile,
      key: "github.profile",
      priority: PRIORITY.high,
      next_run: 2 * 3600 * 1000
    }
  }
};
```

### Fetcher

A fetcher is a function that does one real data job, for example:

- `getGithubProfile`
- `fetchGithubHeatmap`
- `getCurrentPlaying`
- `LeetcodeProfileData`
- `RoadmapProfileData`

Fetcher functions should return the project-standard response:

```js
{
  data: any,
  error: ErrorObject | null,
  code: number | null
}
```

This shape is created by `createResponse()` in `src/utils.js`.

### Task

A `Task` is created for one service plugin.

For example:

- `Github_Service` becomes one `Task`
- `Spotify_Service` becomes one `Task`
- `Leetcode_Service` becomes one `Task`

Inside that task are multiple scheduled fetchers.

### Orbit

`Orbit` is the global orchestrator. It discovers service plugins, creates tasks, and owns the shared `Channel` used by tasks and storage.

### Channel

`Channel` is a small wrapper around Node's `EventEmitter`.

It allows modules to communicate without directly calling each other:

```txt
Task -> channel.send("database_channel", { key, data })
DatabaseManager -> channel.listen("database_channel", handler)
```

### DatabaseManager

Despite the name, current `DatabaseManager` is an in-memory store backed by a `Map`.

It stores the latest record for each output key:

```txt
github.profile
github.heatmap
spotify.current_playing
leetcode.profile
roadmap.profile
```

### CacheManager

`CacheManager` is also in-memory. It wraps records with TTL expiration so repeated reads can be fast.

## 5. Module Communication

The most important communication path is:

```txt
Service fetcher
  returns ServiceResponse

Task
  validates response
  sends success to ChannelsID.DatBase
  sends errors to ChannelsID.Orbit

Channel
  emits message

DatabaseManager
  listens on ChannelsID.DatBase
  writes record into memory Map
  writes cached copy into CacheManager

Server routes
  read from DatabaseManager
  return HTTP response
```

The current channels are defined in `src/utils.js`:

```js
const ChannelsID = {
  Orbit: "orbit_channel",
  Task: "task_channel",
  Logger: "logger_channel",
  DatBase: "database_channel"
};
```

Note: `DatBase` is spelled that way in code today, so documentation uses the current code spelling.

## 6. Startup In Detail

### `src/main.js`

This is the real app entrypoint.

Responsibilities:

- initialize the singleton `decisionEngine`
- create `CacheManager`
- create `DatabaseManager`
- create `Orbit`
- create `Server`
- attach database listener to Orbit's channel
- start Orbit scheduling
- start Fastify
- handle shutdown signals and uncaught errors

Important runtime objects:

```js
const cacheManager = new CacheManager({ logger });
const databaseManager = new DatabaseManager({ cacheManager, logger });
const orbit = new Orbit({ servicePath: "../services" });
const server = new Server({ databaseManager, cacheManager });
```

Then:

```js
databaseManager.attachChannel(orbit.channel);
orbit.start();
await server.start();
```

This means storage is connected before tasks begin sending data.

## 7. Core Layer

## `Orbit` in `src/core/orbit.js`

`Orbit` is the top-level orchestrator.

Responsibilities:

- resolve the service directory
- scan service files
- require every `.js` file in `src/services`
- collect modules that export `worker_map`
- validate each worker map
- call `initFunc(SECRET)` when needed
- read service config from `CONFIG` using `configKey`
- build `Task` instances
- start all tasks
- listen for messages on `orbit_channel`

Important fields:

```js
this.servicePath
this.channel
this.Tasks
```

Important methods:

- `getServices()` scans the service path and loads worker maps.
- `validateService(workerMap)` checks basic plugin structure.
- `buildTask()` converts worker maps into `Task` objects.
- `startTask()` starts every task.
- `handleOrbitMessage(message)` is intended for future task reports/errors.
- `start()` wires Orbit's listener, builds tasks, and starts them.

Current limitation:

- `handleOrbitMessage()` is still empty.
- Orbit receives task errors, but does not yet apply policy, reporting, or recovery.

## `Task` in `src/core/task.js`

`Task` is the scheduler and executor for one service plugin.

Responsibilities:

- build a queue from the plugin's service definitions
- run every fetcher once at startup
- schedule future runs by `next_run`
- execute fetcher callables
- detect response errors
- send successful data to `database_channel`
- send failed executions to `orbit_channel`
- apply adaptive delay using `decisionEngine.nextRun()`
- respect upstream rate-limit headers when possible

Important fields:

```js
this.config       // service config from config.json
this.services     // service entries from worker_map.services
this.taskName     // worker_map.name
this.channel      // Orbit-owned Channel
this.queue        // scheduled service items
this.timer        // current setTimeout handle
```

Execution flow inside `Task`:

```txt
start()
  -> runInitial()
    -> call every fetcher immediately
    -> write successful responses to database channel
  -> sortQueue()
  -> run()
    -> schedule nearest service
    -> execute()
      -> call fetcher
      -> handle success/error
      -> calculate next time
      -> reinsert item
      -> run() again
```

Rate-limit behavior:

- If the response error is `RATE_LIMITED` or HTTP `429`, `Task` reads `retry-after`.
- If no header exists, it falls back to `60_000` ms.
- Final delay is `max(decisionEngineDelay, retryAfterMs)`.

## 8. Infrastructure Layer

## `request.js`

`src/infrastructure/http/request.js` is the HTTP abstraction.

Responsibilities:

- provide `GET()` and `POST()`
- use Axios
- set default headers
- apply a 5 second timeout
- avoid Axios throwing on HTTP 4xx/5xx by using `validateStatus: () => true`
- classify HTTP errors into project error types
- classify GraphQL errors
- sanitize request/response context
- always return `{ data, error, code }`

Important functions:

- `buildError()` creates a rich normalized error object.
- `httpErrorHandler()` maps HTTP status codes.
- `graphqlErrorHandler()` reads `data.errors`.
- `checkErrorAndResponse()` chooses success/error response.
- `GET()` and `POST()` execute network calls.

Error object shape:

```js
{
  type,
  message,
  source: {
    code,
    message
  },
  context: {
    request: { method, url, headers, body },
    response: { status, headers, body }
  },
  meta: {
    timestamp
  }
}
```

Sensitive values are redacted through `sanitize()` in `src/utils.js`.

## `tokenManager.js`

This file contains two auth helper classes.

### `AuthHandler`

Used for refresh-token OAuth flows. Spotify uses this.

Responsibilities:

- store refresh token, client id, client secret, and token endpoint
- exchange refresh token for access token
- avoid multiple simultaneous refreshes with `isRefreshing`
- queue concurrent refresh waiters in `refreshSubscribers`
- refresh token before API calls when expired
- retry once after unauthorized/forbidden responses
- return normalized auth errors when not configured

Spotify configures it with:

- refresh token
- client id
- client secret
- Spotify token endpoint
- function that builds the token request
- function that maps Spotify's token response

### `StaticAuthHandler`

Used for APIs that have a long-lived bearer token. GitHub uses this.

Responsibilities:

- store a static access token
- generate auth headers
- run protected callables
- convert unauthorized/forbidden responses into token errors

## `decisionengine.js`

`decisionEngine` is a singleton adaptive scheduling engine.

Responsibilities:

- track daily/monthly usage pressure
- calculate moving averages
- compute a load factor
- stretch future task delays during overload
- account for task priority

Current use:

`Task.execute()` calls:

```js
engine.nextRun(next_run, priority)
```

High priority services are delayed less under pressure. Low priority services are delayed more.

Current limitation:

- `main.js` initializes it with the entire `CONFIG`, but the engine expects numeric scheduling fields such as `dailyLimit` and `monthlyLimit`.
- No current code calls `decisionEngine(..., data)` to ingest real API usage.

## `Channel`

`src/infrastructure/messaging/channel.js` is a small local pub/sub class.

Methods:

- `send(channel, message)`
- `listen(channel, handler)`
- `once(channel, handler)`
- `off(channel, handler)`

It is used by Orbit, Task, and DatabaseManager.

## `databus.js`

Exports a global `EventEmitter` instance named `bus`.

Current status:

- exported through `infrastructure/index.js`
- not used by the current runtime path
- likely intended as a broader event bus later

## `logging.js`

Simple console logger.

Methods:

- `log({ level, source, message, data })`
- `info(message, data)`
- `warn(message, data)`
- `error(message, data)`

Current output format:

```txt
[timestamp] [LEVEL] SOURCE - message data
```

## `resource_monitor.js` and `reporter.js`

These are placeholders for future observer/reporting features.

`resource_monitor.js` currently defines an `Observer` class with an `observers` set, but it is not exported or wired into runtime.

`reporter.js` is empty.

## 9. Storage Layer

## `CacheManager`

`src/server/storage/cacheManager.js`

An in-memory TTL cache.

Responsibilities:

- store values by key
- expire values after TTL
- delete expired entries on read
- expose `has`, `delete`, `clear`, and `size`

Data shape inside cache:

```js
{
  value,
  expiresAt
}
```

## `DatabaseManager`

`src/server/storage/databaseManager.js`

An in-memory database-like store.

Responsibilities:

- listen to task output messages
- upsert records by key
- write records into cache
- read cached records first
- expose key snapshots for `/state`
- detach channel listeners during shutdown

Record shape:

```js
{
  key,
  data,
  source,
  updatedAt
}
```

Important methods:

- `attachChannel(channel, databaseChannel)`
- `detachChannel()`
- `handleMessage(message)`
- `upsert(key, data, { source })`
- `get(key)`
- `keys()`
- `snapshot()`

The current database is not persistent. If the process restarts, records are lost until tasks fetch data again.

## 10. Server Layer

## `Server`

`src/server/server.js`

A small Fastify wrapper.

Responsibilities:

- create Fastify app
- register routes
- start listening
- close during shutdown

Defaults:

- host: `0.0.0.0`
- port: `process.env.PORT || 3000`

## Routes

Routes live in `src/server/routes/index.js`.

### Authentication

Most routes use `protect()`.

It checks:

```txt
x-api-key === SECRET.AUTH_KEY
```

If the secret is missing or mismatched, it returns `401 Unauthorized`.

### `GET /health`

Protected.

Returns:

```js
{
  ok: true,
  timestamp
}
```

### `GET /render_internal_health`

Unprotected.

Used as a simple Render/platform health check.

Returns:

```js
{ ok: true }
```

### `GET /state`

Protected.

Returns database snapshot and cache size:

```js
{
  ok: true,
  database: {
    total,
    keys
  },
  cache: {
    size
  }
}
```

### `GET /data/:key`

Protected.

Reads a stored record by key.

Example:

```txt
GET /data/github.profile
GET /data/spotify.current_playing
GET /data/leetcode.heatmap.history
```

Returns `404` if the record does not exist.

## 11. Config Layer

## `config.js`

Loads environment secrets from `secret.env`:

```js
require("dotenv").config({ path: "secret.env" });
```

Exports:

- `CONFIG` from `config.json`
- `SECRET` from environment variables

Current secrets:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_AUTH_REFRESH_TOKEN`
- `GITHUB_FG_ACCESS_TOKEN`
- `AUTH_KEY`

## `config.json`

Stores non-secret service config:

- Spotify username/id/limits/scopes
- GitHub username/history window
- LeetCode username/history window
- roadmap.sh username

Services use `configKey` to pick their config:

```js
getDataWithAddress(CONFIG, "services.spotify.config")
```

## 12. Utility Layer

## `createResponse()`

Creates the standard response contract:

```js
createResponse({ data, error, code })
```

## `handleServiceError()`

Used by service fetchers after HTTP calls.

If the HTTP layer returned an error, it returns:

```js
{
  data: {},
  error,
  code
}
```

If success, it formats response data:

```js
{
  data: format(response.data),
  error: null,
  code
}
```

## `sanitize()`

Recursively sanitizes data before it is placed into error context.

It redacts keys containing sensitive words such as:

- authorization
- token
- secret
- password
- cookie
- session
- jwt

It also handles:

- circular references
- deep objects
- Buffers
- Errors
- long strings

## `formatHeatmap()`

Normalizes heatmap arrays into yearly and global stats:

```js
{
  years: {
    "2026": {
      heatmap,
      currentStreak,
      longestStreak,
      totalActiveDays,
      totalContributions
    }
  },
  global: {
    currentStreak,
    longestStreak,
    totalActiveDays,
    totalContributions
  }
}
```

Used by GitHub, LeetCode, and roadmap-related formatting.

## `getDataWithAddress()`

Reads nested config using dot paths:

```js
getDataWithAddress(CONFIG, "services.github.config")
```

## `runServices()`

Developer helper for running a service plugin directly:

```bash
node src/services/github.js
```

Each service file supports this pattern through:

```js
if (require.main === module) {
  const { runServices } = require("../utils");
  runServices(worker_map);
}
```

## 13. Service Plugins

## GitHub Service

File: `src/services/github.js`

Uses:

- `StaticAuthHandler`
- GitHub REST API
- GitHub GraphQL API

Secrets:

- `GITHUB_FG_ACCESS_TOKEN`

Config:

```txt
services.github.config
```

Fetchers:

| Fetcher | Output Key | Priority | Schedule |
|---|---:|---:|---:|
| `GithubProfileData` | `github.profile` | high | 2 hours |
| `GithubHeatmapData` | `github.heatmap` | high | 30 minutes |
| `GithubEventsData` | `github.events` | medium | 12 hours |

Main roles:

- `init(secrets)` configures the static token handler.
- `getGithubProfile()` fetches and normalizes profile details.
- `fetchGithubHeatmap()` fetches contribution calendar data.
- `getGithubEvents()` fetches recent public events.
- `flattenGithubHeatmap()` transforms GitHub contribution weeks into heatmap entries.
- `normalizeGithubEvent()` converts raw GitHub events into a stable structure.

## Spotify Service

File: `src/services/spotify.js`

Uses:

- `AuthHandler`
- Spotify OAuth refresh-token flow
- Spotify Web API

Secrets:

- `SPOTIFY_AUTH_REFRESH_TOKEN`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`

Config:

```txt
services.spotify.config
```

Fetchers:

| Fetcher | Output Key | Priority | Schedule |
|---|---:|---:|---:|
| `SpotifyProfileInfo` | `spotify.profile_info` | high | 6 hours |
| `SpotifyCurrentPlaying` | `spotify.current_playing` | high | 30 seconds |
| `SpotifyUserPlaylists` | `spotify.user_playlists` | medium | 12 hours |
| `SpotifyRecentlyPlayed` | `spotify.recently_played` | medium | 5 minutes |
| `SpotifyTopTracks` | `spotify.top_tracks` | low | 24 hours |
| `SpotifyTopArtists` | `spotify.top_artists` | low | 24 hours |

Main roles:

- `init(secrets)` configures OAuth refresh behavior.
- `getSongDataFromSpotifyItem()` normalizes track information.
- `getProfileInfo()` returns profile/follower details.
- `getCurrentPlaying()` returns currently playing track and progress.
- `getUserPlaylists()` returns playlists.
- `getRecentlyPlayed()` returns recent tracks.
- `getTopTracks()` returns top tracks.
- `getTopArtists()` returns top artists.

## LeetCode Service

File: `src/services/leetcode.js`

Uses:

- LeetCode GraphQL endpoint
- `POST()`
- `formatHeatmap()`

Secrets:

- none currently

Config:

```txt
services.leetcode.config
```

Fetchers:

| Fetcher | Output Key | Priority | Schedule |
|---|---:|---:|---:|
| `LeetcodeProfileData` | `leetcode.profile` | high | 2 hours |
| `fetchLeetcodeHeatmapLastNYears` | `leetcode.heatmap.history` | medium | 24 hours |

Main roles:

- `_createSubmissionCalendarQuery()` builds a multi-year GraphQL query.
- `combineHeatmaps()` merges yearly submission calendars.
- `getData()` maps difficulty stats into `{ easy, medium, hard }`.
- `LeetcodeProfileData()` returns solved/total counts.
- `fetchLeetcodeHeatmapLastNYears()` fetches historical activity.
- `fetchLeetcodeHeatmap()` fetches one year.

## Roadmap Service

File: `src/services/roadmap.js`

Uses:

- roadmap.sh internal public profile endpoint
- `GET()`
- `formatHeatmap()`

Secrets:

- none currently

Config:

```txt
services.roadmap.config
```

Fetchers:

| Fetcher | Output Key | Priority | Schedule |
|---|---:|---:|---:|
| `RoadmapProfileData` | `roadmap.profile` | high | 2 hours |

Main roles:

- `flattenHeatmap()` converts roadmap activity object into timestamp/count entries.
- `formatRoadmapdata()` normalizes profile, avatar, activity, and roadmap fields.
- `RoadmapProfileData()` fetches profile data.

## 14. How The Plugin System Works

The plugin system is file-based.

To add a new service:

1. Create a new file in `src/services`, for example `devto.js`.
2. Write one or more fetcher functions.
3. Export a `worker_map`.
4. Add config in `src/config/config.json`.
5. Add secrets in `secret.env` only if needed.
6. Restart the server.

Orbit automatically scans all `.js` files in the service directory:

```js
const files = fs.readdirSync(this.servicePath);
```

For each file:

```js
const mod = require(fullPath);
if (mod?.worker_map) services.push(mod.worker_map);
```

That means Orbit does not need a manual import for each service.

Minimum plugin example:

```js
const { GET } = require("../infrastructure");
const { handleServiceError, PRIORITY } = require("../utils");
const { createMissingInputError } = require("../error");

async function getDevtoProfile({ username }) {
  if (!username) {
    return createMissingInputError({
      field: "username",
      service: "DevtoProfileData"
    });
  }

  const response = await GET({
    url: `https://dev.to/api/users/by_username?url=${username}`
  });

  return handleServiceError({
    response,
    format: (payload) => ({
      username: payload?.username ?? null,
      name: payload?.name ?? null
    })
  });
}

const worker_map = {
  initFunc: null,
  configKey: "services.devto.config",
  name: "Devto_Service",
  services: {
    DevtoProfileData: {
      callable: getDevtoProfile,
      key: "devto.profile",
      priority: PRIORITY.medium,
      next_run: 2 * 3600 * 1000
    }
  }
};

module.exports = { worker_map };
```

Then add config:

```json
{
  "services": {
    "devto": {
      "config": {
        "username": "your_username"
      }
    }
  }
}
```

The output would eventually be available at:

```txt
GET /data/devto.profile
```

## 15. Data And Error Contracts

Every service should return:

```js
{
  data,
  error,
  code
}
```

Success:

```js
{
  data: { ...normalizedData },
  error: null,
  code: 200
}
```

Failure:

```js
{
  data: {},
  error: {
    type,
    message,
    source,
    context,
    meta
  },
  code
}
```

Known error types live in `src/error.js`:

- `NETWORK_FAILURE`
- `SERVER_FAILURE`
- `RATE_LIMITED`
- `TEMPORARY_UNAVAILABLE`
- `TIMEOUT`
- `NOT_FOUND`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `BAD_REQUEST`
- `VALIDATION_FAILED`
- `PARSE_FAILURE`
- `UNKNOWN_FAILURE`
- `CONFIG_NOT_FOUND`
- `MISSING_REQUIRED_INPUT`
- `SERVICE_NOT_CONFIGURED`
- `TOKEN_EXPIRED`
- `UNEXPECTED_RESPONSE`
- `TOKEN_INVALID`
- `PARTIAL_FAILURE`
- `AUTH_HANDLER_NOT_CONFIGURED`

## 16. Current Intended Architecture vs Current Implementation

The codebase has a clear direction: a smart, plugin-based orchestration backend.

Already implemented:

- file-based service plugin discovery
- worker maps
- task scheduling
- initial service execution
- repeated execution with `setTimeout`
- response normalization
- HTTP and GraphQL error normalization
- secret/config split
- Spotify refresh-token auth
- GitHub static-token auth
- in-memory database
- in-memory TTL cache
- protected Fastify routes

Partially implemented or future-facing:

- Orbit error policy and reporting
- observer/resource monitoring
- databus usage
- persistent database storage
- Redis or external cache
- dynamic route loading
- versioned API routes
- SSE/WebSocket support
- adaptive scheduling based on real measured usage

Important current implementation notes:

- `bootstrap/bootstrap.js` is empty.
- `reporter/reporter.js` is empty.
- `resource_monitor.js` is a placeholder and not exported.
- `databus.js` is exported but not used in the main runtime path.
- `DatabaseManager` is memory-only, not a real persistent database yet.
- `CacheManager` is memory-only, not Redis yet.

## 17. Mental Model

Think of the project as four layers:

```txt
1. Plugin layer
   Service files know external APIs.

2. Core layer
   Orbit and Task know when and how to run services.

3. Infrastructure layer
   HTTP, auth, logging, and messaging provide reusable system tools.

4. Delivery layer
   Storage and Fastify expose latest normalized data to clients.
```

The cleanest part of the design is that service plugins do not need to know about Fastify, and routes do not need to know how GitHub, Spotify, LeetCode, or roadmap.sh work.

Services only produce normalized records. Tasks only schedule and publish them. Storage only stores them. Routes only serve them.

That separation is the main architecture win of this codebase.
