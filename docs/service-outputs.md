# Service Outputs

This document lists current output shapes returned by service workers.

All workers return a `ServiceResponse` envelope:

```js
{
  data: any,
  error: ErrorObject | null,
  code: number | null
}
```

Only `data` shape is listed below.

## Spotify (`src/services/spotify.js`)

### `SpotifyProfileInfo`

```js
{
  userId: string | null,
  username: string | null,
  images: any[],
  profile_url: string | null,
  followers: number
}
```

### `SpotifyCurrentPlaying`

```js
{
  is_playing: boolean,
  track: {
    title: string | null,
    artist: { name: string, url: string | null }[],
    cover: any[],
    url: string | null
  },
  progress: {
    current: number, // seconds
    duration: number // seconds
  }
}
```

### `SpotifyUserPlaylists`

```js
{
  total: number,
  playlists: {
    name: string,
    description: string,
    url: string,
    cover: any[],
    id: string
  }[]
}
```

### `SpotifyRecentlyPlayed`

```js
{
  tracks: {
    title: string | null,
    artist: { name: string, url: string | null }[],
    cover: any[],
    url: string | null
  }[]
}
```

### `SpotifyTopTracks`

```js
{
  tracks: {
    title: string | null,
    artist: { name: string, url: string | null }[],
    cover: any[],
    url: string | null
  }[]
}
```

### `SpotifyTopArtists`

```js
{
  artists: {
    name: string,
    url: string,
    cover: any[]
  }[]
}
```

## GitHub (`src/services/github.js`)

### `getGithubProfile`

```js
{
  username: string | null,
  avatar: string | null,
  profileUrl: string | null,
  repoUrl: string | null,
  bio: string | null,
  publicRepos: number,
  followers: number,
  following: number
}
```

### `getGithubEvents`

Returns provider payload directly (currently unformatted):

```js
any[]
```

### `fetchGithubHeatmap`

```js
{
  availableYears: number[],
  totalContributions: number,
  calendar: {
    [year: number]: {
      totalContributions: number,
      heatmap: { date: number, count: number }[]
    }
  }
}
```

Representative heatmap entry:

```js
{ date: 20155, count: 4 }
```

## LeetCode (`src/services/leetcode.js`)

### `LeetcodeProfileData`

```js
{
  username: string,
  solved: {
    easy: number,
    medium: number,
    hard: number
  },
  total: {
    easy: number,
    medium: number,
    hard: number
  }
}
```

### `fetchLeetcodeHeatmap`

```js
{
  activeYears: number[],
  availableYears: number[],
  calendar: {
    [year: number]: {
      streak: number,
      totalActiveDays: number,
      heatmap: { date: number, count: number }[]
    }
  }
}
```

### `fetchLeetcodeHeatmapLastNYears`

```js
{
  availableYears: number[],
  calendar: {
    [year: number]: {
      streak: number,
      totalActiveDays: number,
      heatmap: { date: number, count: number }[]
    }
  }
}
```

Representative LeetCode heatmap entry:

```js
{ date: 19954, count: 3 }
```

## Roadmap (`src/services/roadmap.js`)

### `RoadmapProfileData`

```js
{
  name: string,
  avatar: string,
  availableToHire: any,
  customRoadmaps: any,
  onboardingInfo: any,
  activity: {
    heatmap: { date: number, count: number }[],
    daily: { date: number, count: number }[], // compatibility alias
    total: number
  },
  roadmap: any
}
```

## Notes for Contributors

- Keep these output shapes stable once consumed by clients.
- If shape changes are required, update this file in the same PR.
- For heatmaps, document element schema and 1-3 sample entries only.
