# Contracts

This document defines runtime response contracts used across the project.

## Core Response Shape

All infrastructure and service functions should return this shape:

```js
{
  data: any,
  error: ErrorObject | null,
  code: number | null
}
```

This is produced by `createResponse()` in `src/utils.js`.

## ErrorObject Shape

`request.js` builds normalized error objects:

```js
{
  type: string,
  message: string,
  source: {
    code: number | null,
    message: string | null
  },
  context: {
    request: {
      method: string | null,
      url: string | null,
      headers: object,
      body: any
    },
    response: {
      status: number | null,
      headers: object,
      body: any
    }
  },
  meta: {
    timestamp: string
  }
}
```

Sensitive values inside `context` are sanitized by `sanitize()`.

## Error Types

From `ERROR_TYPES` in `src/utils.js`:

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

## Infrastructure Layer Contracts

### GET

```js
GET({ url, params = null, headers = {} }) => Promise<ServiceResponse>
```

### POST

```js
POST({ url, data = null, headers = {} }) => Promise<ServiceResponse>
```

Both return a normalized `ServiceResponse` even for HTTP 4xx/5xx.

## Service Layer Contract

Every service fetcher should return `ServiceResponse`.

On failure:

- `error` must be non-null
- `code` should carry HTTP code if known
- `data` should be `{}` (current project convention via `handleServiceError`)

On success:

- `error` should be `null`
- `code` should be HTTP status
- `data` should be formatted and stable

## Heatmap Payload Exception

Heatmap payloads can be large. Docs should define shape and semantics, not dump full payloads.

### LeetCode heatmap entry

```js
{ date: number, count: number }
```

`date` is day-level unix index (seconds / 86400), not ISO date.

### GitHub heatmap entry

```js
{ date: number, count: number }
```

`date` is day-level unix index (seconds / 86400), same as LeetCode.
Use 2-3 representative entries in docs/examples, not full year data.
