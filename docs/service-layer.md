# Service Layer Guide

This guide explains how the service layer works and what to implement when adding a new service.

## Role of Service Layer

Service modules in `src/services/*.js` are responsible for:

- Calling external APIs through `GET` and `POST` from `src/infrastructure`
- Formatting provider-specific payloads into project-owned shapes
- Returning standardized `ServiceResponse`
- Exporting a `worker_map` for orchestration metadata

Service layer should not:

- Implement low-level HTTP error normalization (already in `request.js`)
- Implement token lifecycle directly when `AuthHandler` can be reused

## Standard Service Flow

1. Build endpoint/query and headers.
2. Call `GET` or `POST`.
3. Transform response using `handleServiceError({ response, format })`.
4. Return normalized `ServiceResponse`.

Example:

```js
return handleServiceError({
  response,
  format: (data) => ({
    // stable output fields
  })
});
```

## worker_map Contract

Each service module exports:

```js
module.exports = { worker_map }
```

Each `worker_map` item should follow:

```js
{
  callable: asyncFunction,
  key: "namespace.resource", // recommended
  priority: "high" | "medium" | "low",
  next_run: number // milliseconds
}
```

Notes:

- `key` should be present in all worker entries for stable cache routing.
- `next_run` is a scheduling hint for orbit/task layer.

## Authenticated Services

Use `AuthHandler` from `src/infrastructure/http/tokenManager.js` when provider uses access token + refresh token.

Flow:

1. Build auth config (`getAuthRequestConfig`, `mapTokenResponse`).
2. Create `new AuthHandler(authConfig)`.
3. Wrap API call with `authHandler.handlePost(async (accessToken) => ...)`.

This handles:

- refresh-before-expiry
- single-flight refresh (prevents parallel duplicate refresh)
- retry on `UNAUTHORIZED` and `FORBIDDEN`

## Data Shape Rules

When formatting service output:

- Keep field names stable and explicit.
- Use nullable defaults for missing values (`null`, `[]`, `0`) depending on field type.
- Avoid leaking raw upstream response unless intentionally needed.
- Keep heatmap outputs compact and typed (see `docs/contracts.md`).

## Adding a New Service Checklist

1. Create `src/services/<provider>.js`.
2. Define endpoints and optional auth helper.
3. Add one or more fetcher functions that each return `ServiceResponse`.
4. Use `handleServiceError` for all outward returns.
5. Add `worker_map` with proper `priority`, `next_run`, and `key`.
6. Export `worker_map`.
7. Add docs for payload shape (small examples only, especially for heatmaps).

## Common Pitfalls

- Returning raw axios response objects instead of `ServiceResponse`.
- Inconsistent default values across providers.
- Missing `key` in some worker entries.
- Returning full heatmap dumps in logs/docs.
