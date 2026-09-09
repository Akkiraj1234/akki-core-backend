# Known issues and current caveats

This document captures the main things that are currently known about the repository and should be treated as operational notes rather than future promises.

## Route naming and compatibility

- The combined heatmap route is exposed as `/gernal/heatmap` because the route module is named `gernal_routes.js`.
- This path is kept for compatibility, but it is a historical typo.

## Heatmap routes

The following routes currently return only the latest available year rather than the full history:

- `GET /github/heatmap`
- `GET /leetcode/heatmap`
- `GET /roadmap/heatmap`

Older documentation may describe range filters such as `from` and `to` for these endpoints, but the current handlers do not apply those filters.

## Roadmap profile route

`GET /roadmap/profile` currently returns the stored profile object and strips `activity.heatmap` from the payload. It does not currently do date-range filtering in the route layer.

## In-memory state

The project currently stores database records in memory. That means:

- restarting the process clears the data store
- the system is suitable for local development and lightweight runtime use
- production durability would require moving to a persistent database layer

## Cache behavior

- Route cache uses a default TTL of 60 seconds
- Database-originated cache entries are non-expiring until overwritten by an upsert
- This is intentional and is currently part of the runtime design

## On-demand provider fetches

Some routes, such as `GET /github/repo-info`, depend on the upstream provider response shape. If the provider changes its payload structure or the service adapter is incomplete, those routes may fail or return incomplete fields.

## Documentation drift

Some older documentation files still describe behaviors that are not fully implemented in the current route handlers. This document is intended to reduce that ambiguity.
