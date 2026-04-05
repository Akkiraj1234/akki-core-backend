# Architecture (Current State)

This describes the architecture as currently implemented in the repository.

## High-Level Layers

```txt
main/server bootstrap
   -> infrastructure (HTTP + auth)
   -> services (provider fetchers)
   -> core (orbit/databus; currently scaffold stage)
```

## Entry Points

- Runtime entry: `src/main.js`
- HTTP server: `src/server/server.js`
- Dev utility runner: `scripts/dev-runner.js`

## Infrastructure Layer

Location: `src/infrastructure`

Modules:

- `http/request.js`: HTTP client abstraction, error classification, sanitized error context.
- `http/tokenManager.js`: token refresh and retry wrapper (`AuthHandler`).
- `index.js`: exports `GET`, `POST`, `AuthHandler`, and shared types.

Guarantee:

- All network calls return normalized `ServiceResponse`.

## Service Layer

Location: `src/services`

Implemented providers:

- `spotify.js`
- `github.js`
- `leetcode.js`
- `roadmap.js`

Common pattern:

- fetch raw API data
- map to stable internal shape
- expose `worker_map` for task scheduling metadata

## Core Layer

Location: `src/core`

- `orbit.js`: design scaffold and `Task` class draft.
- `databus.js`: empty placeholder.

Status:

- planned architecture is documented
- orchestration loop integration is not complete yet

## Config Layer

Location: `src/config`

- `config.json`: non-secret project configuration.
- `config.js`: loads `secret.env` and exports `SECRET` + `CONFIG`.

## Utility Layer

Location: `src/utils.js`

- `createResponse`: standard response object creator.
- `handleServiceError`: standard success/error service formatter.
- `sanitize`: deep redaction for sensitive request/response metadata.
- `ERROR_TYPES`: shared error type constants.

## Data and Error Flow

1. Service calls `GET/POST`.
2. Infrastructure classifies HTTP/GraphQL/network errors.
3. Errors include sanitized request/response context.
4. Service formats success data via `handleServiceError`.
5. Caller receives `{ data, error, code }`.
