# Release v1.1

This release contains the initial v1.1 changes: updated route caching behavior, simplified route queries, and documentation cleanup.

Highlights

- Database-originated cache entries are now persistent (no TTL) and only overwritten on upsert.
- Routes updated per v1.1 plan:
  - GitHub: `profile` (no cache), `heatmap` (latest year, no cache), `events` (cached, supports `n`), `repositories` (cached, supports `n`), `repo-info` (cached), `activerepo` (renamed from `workingrepos`, no cache).
  - LeetCode: `profile` and `skills` direct DB, others cached with `n` defaults and one-year heatmap.
  - Roadmap: `profile` (no heatmap), `heatmap` (one-year).
  - Spotify: `current-playing` direct DB, others cached with `n`.
- Added a combined `/gernal/heatmap` route that returns one-year heatmaps for GitHub, LeetCode, and Roadmap.
- Removed some duplicate or legacy docs; README updated with notes.

Notes

- CI: a release workflow is included at `.github/workflows/release.yml` that validates `release.md` matches tag and only allows releases from the `stable` branch.
- Tests: basic Jest API tests were added under `test/` to validate the updated routes locally.

Changelog

- Fix: DB cache entries no longer expire automatically.
- Feature: route-level caching adjusted and per-route behavior standardized.
- Docs: removed duplicates and documented the removal in `README.md`.

Tag: v1.1
