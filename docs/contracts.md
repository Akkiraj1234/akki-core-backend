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


1. diff store
benefit computation time but increase ram on per diff 
tho its has limit its versioning depends on total line of data its have for versioning

example

```json
//original
{
  name: akki,
  last_name : raj,
  age: 20,
  hobbies: [
    art,
    sketch
  ]

}
```

```json
// diff v2
{
  name: sohani
}
```

```json
// diff v3
{
  name: sohani,
  last_name: raj2,
  hobbies: [
    sketching
  ],
  ___deleted_hobbies: [0]
}
```

now this have something called if at somepoint orignal has completly changed then we merge and create a tottaly new state of new base in that case we will nevr cross total number of data so diff will always be equal to number of data

but isuse tracking delted and chanegs inside list is hard like really hard
and 2nd its cosume a lot of ram not good 

all new diff will keep the cnages from previus so latest diff will always contain all chanegs but its not good either

if chnages are comming from v2 then v3 will contain v2 stuff so not good or else we can do 
v2 and v3 will be merged if orignal is v1 so we get full data if orignal is v2 we merege only v3 becuase no more diff

tho this version haev a lot of issue

2. versioning diff
what its really about is we dont store diff we store timestamp for exampel to visulize it it be like this

```json
// visulize
{
  name: akki,  //v1
  last_name : raj, //v1
  age: 20,  // v1
  hobbies: [  // v1
    art,  // v1
    sketch //v1
  ]

}
```


in that case the simple term is data store as this format

```json
{
  v1: { name : akki},
  v2: {last_name : raj, age: 20}
  v3: {hobbies: [art, sketch]}
}
```

now lets say something change in v1 name changed in that case we will have 

```json
{
  v2: {last_name : raj, age: 20}
  v3: {hobbies: [art, sketch]}
  v4: { name : aarti},
}
```

now say v2 something change like last_name

```json
{
  v2: { age: 20}
  v3: {hobbies: [art, sketch]}
  v4: { name : aarti},
  v5: { last_name : raj }
}
```