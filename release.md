# Release Notes — v1.1.0

## Overview

Version 1.1.0 expands `akki-core-backend` with improved GitHub activity tracking, unified heatmap collection, and a broader provider API surface.

## What's New

* Added pinned project support for GitHub.
* Added active repository detection and ranking based on recent development activity.
* Added repository-level commit and active-day statistics.
* Added one-year heatmap data collection for GitHub, LeetCode, and Roadmap.sh.
* Added provider-specific and combined heatmap endpoints.
* Expanded API coverage for GitHub, LeetCode, Roadmap.sh, and Spotify services.
* Improved shared service response handling, caching, and error handling.

## Notes

* The combined heatmap endpoint remains available as `/gernal/heatmap` for compatibility.
* Heatmap endpoints currently expose the latest available year.
* GitHub repository historical statistics currently use the repository's default branch history.
* Backend database state is currently stored in memory and is cleared when the process restarts.

## Status

v1.1.0 provides a stable working backend foundation for the developer profile, with the core provider integrations and API infrastructure in place for the next development cycle.
