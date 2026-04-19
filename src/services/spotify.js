const { POST, GET, AuthHandler } = require("../infrastructure");
const { handleServiceError, PRIORITY } = require("../utils");
const { createMissingInputError } = require("../error");


const SPOTIFY_AUTH_HANDLER = new AuthHandler({
    onAuthConfigErrorMessage: 
    "Auth handler not initialized for Spotify service. Please run init(secrets)."
})

const PROFILE_INFO = "https://api.spotify.com/v1/me";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const CURRENT_PLAYING = "https://api.spotify.com/v1/me/player/currently-playing";
const USER_PLAYLISTS = "https://api.spotify.com/v1/me/playlists";
const RECENTLY_PLAYED = "https://api.spotify.com/v1/me/player/recently-played";
const TOP_TRACKS = "https://api.spotify.com/v1/me/top/tracks";
const TOP_ARTISTS = "https://api.spotify.com/v1/me/top/artists";


/**
 * Initializes Spotify auth handler using provided secrets.
 *
 * ------------------------------------------------------------
 * Input:
 * ```js
 * {
 *   secrets: {
 *     SPOTIFY_AUTH_REFRESH_TOKEN: string,
 *     SPOTIFY_CLIENT_ID: string,
 *     SPOTIFY_CLIENT_SECRET: string
 *   }
 * }
 * ```
 *
 * ------------------------------------------------------------
 * Behavior:
 * - Extracts Spotify OAuth credentials from secrets
 * - Builds auth config for AuthHandler
 * - Sets up token refresh request (refresh_token grant)
 * - Maps token response into internal format
 * - Injects config into module-level SPOTIFY_AUTH_HANDLER
 *
 * ------------------------------------------------------------
 * Rules:
 * - Must be called before any Spotify service function
 * - Relies on global SPOTIFY_AUTH_HANDLER instance
 * - Does not perform any API calls directly
 * - Validation is handled internally by AuthHandler
 */
function init( secrets ) {
    const config = {
        refreshToken: secrets.SPOTIFY_AUTH_REFRESH_TOKEN,
        clientId: secrets.SPOTIFY_CLIENT_ID,
        clientSecret: secrets.SPOTIFY_CLIENT_SECRET,
        TokenExchangeURL: TOKEN_URL,
        
        getAuthRequestConfig: ( authHandler ) => {
            const headers = {
                'Authorization': 'Basic ' + (
                    Buffer.from(authHandler.clientId + ':' + authHandler.clientSecret).toString('base64')
                )
            }
            const body = new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: authHandler.refreshToken
            });
            return { headers, body };
        },

        mapTokenResponse: (data) => {
            return {
                accessToken: data.access_token,
                expiresIn: data.expires_in,
                refreshToken: data.refresh_token
            };
        }
    }
    SPOTIFY_AUTH_HANDLER.fromConfig(config);
}


/**
 * Extracts and normalizes song data from a Spotify track item.
 *
 * ------------------------------------------------------------
 * Input:
 * ```js
 * item: object
 * ```
 *
 * ------------------------------------------------------------
 * Output:
 * ```js
 * {
 *   title: string,
 *   artist: Array<{
 *     name: string,
 *     url: string
 *   }>,
 *   cover: Array<object>,
 *   url: string
 * } | null
 * ```
 *
 * ------------------------------------------------------------
 * Behavior:
 * - Extracts track name, artists, album images, and URL
 * - Normalizes artist structure into simple objects
 * - Returns null for invalid input
 *
 * ------------------------------------------------------------
 * Rules:
 * - Ignores non-object or null input
 * - Defaults missing fields to null or empty array
 * - No side effects
 */
function getSongDataFromSpotifyItem(item) {
    return {
        title: item?.name ?? null,
        artist: item?.artists?.map(
            artist => ({ name: artist.name, url: artist.external_urls?.spotify }
            )) ?? [],
        cover: item?.album?.images ?? [],
        url: item?.external_urls?.spotify ?? null
    }
}


/**
 * Fetches Spotify user profile information.
 *
 * ------------------------------------------------------------
 * Input:
 * ```js
 * {}
 * ```
 *
 * ------------------------------------------------------------
 * Output (ServiceResponse):
 * ```js
 * {
 *   data: {
 *     userId: string,
 *     username: string,
 *     images: Array<object>,
 *     profile_url: string,
 *     followers: number
 *   },
 *   error,
 *   code
 * }
 * ```
 *
 * ------------------------------------------------------------
 * Errors:
 * - SERVICE_NOT_CONFIGURED → init(secrets) not called / token missing
 * - UNAUTHORIZED / FORBIDDEN → invalid or expired token
 * - SERVICE_UNAVAILABLE → API/network failure
 *
 * ------------------------------------------------------------
 * Behavior:
 * - Fetches current user profile via Spotify API
 * - Uses AuthHandler for automatic token refresh
 * - Normalizes response into stable structure
 *
 * ------------------------------------------------------------
 * Rules:
 * - init(secrets) must be called before usage
 * - relies on global SPOTIFY_AUTH_HANDLER
 */
async function getProfileInfo({ ...args }) {
    const response = await SPOTIFY_AUTH_HANDLER.handlePost(
        (accessToken) => GET({
            url: PROFILE_INFO,
            headers: { Authorization: `Bearer ${accessToken}` }
        })
    );

    return handleServiceError({
        response,
        format: (payload) => ({
            userId: payload?.id ?? null,
            username: payload?.display_name ?? null,
            images: payload?.images ?? [],
            profile_url: payload?.external_urls?.spotify ?? null,
            followers: payload?.followers?.total ?? 0,
        })
    });
}


/**
 * Fetches currently playing track from Spotify.
 *
 * ------------------------------------------------------------
 * Input:
 * ```js
 * {}
 * ```
 *
 * ------------------------------------------------------------
 * Output (ServiceResponse):
 * ```js
 * {
 *   data: {
 *     is_playing: boolean,
 *     track: {
 *       title: string,
 *       artist: Array<{ name: string, url: string }>,
 *       cover: Array<object>,
 *       url: string
 *     } | null,
 *     progress: {
 *       current: number,
 *       duration: number
 *     }
 *   },
 *   error,
 *   code
 * }
 * ```
 *
 * ------------------------------------------------------------
 * Errors:
 * - SERVICE_NOT_CONFIGURED → init(secrets) not called / token missing
 * - UNAUTHORIZED / FORBIDDEN → invalid or expired token
 * - SERVICE_UNAVAILABLE → API/network failure
 *
 * ------------------------------------------------------------
 * Behavior:
 * - Fetches currently playing track via Spotify API
 * - Converts progress from ms → seconds
 * - Normalizes track data using helper function
 *
 * ------------------------------------------------------------
 * Rules:
 * - init(secrets) must be called before usage
 * - relies on global SPOTIFY_AUTH_HANDLER
 */
async function getCurrentPlaying({ ...args }) {
    const response = await SPOTIFY_AUTH_HANDLER.handlePost(
        (accessToken) => GET({
            url: CURRENT_PLAYING,
            headers: { Authorization: `Bearer ${accessToken}` }
        })
    );

    return handleServiceError({
        response,
        format: (payload) => ({
            is_playing: payload?.is_playing ?? false,
            track: getSongDataFromSpotifyItem(payload?.item ?? null),
            progress: {
                current: Math.floor((payload?.progress_ms ?? 0) / 1000),
                duration: Math.floor((payload?.item?.duration_ms ?? 0) / 1000)
            }
        })
    });
}


/**
 * Fetches Spotify user playlists and normalizes the result.
 *
 * ------------------------------------------------------------
 * Input:
 * ```js
 * {}
 * ```
 *
 * ------------------------------------------------------------
 * Output (ServiceResponse):
 * ```js
 * {
 *   data: {
 *     total: number,
 *     playlists: Array<{
 *       id: string,
 *       name: string,
 *       description: string,
 *       url: string,
 *       cover: Array<object>
 *     }>
 *   },
 *   error,
 *   code
 * }
 * ```
 *
 * ------------------------------------------------------------
 * Errors:
 * - SERVICE_NOT_CONFIGURED → init(secrets) not called / token missing
 * - UNAUTHORIZED / FORBIDDEN → invalid or expired token
 * - SERVICE_UNAVAILABLE → API/network failure
 *
 * ------------------------------------------------------------
 * Behavior:
 * - Fetches playlists via Spotify API
 * - Filters playlists owned by current user
 * - Normalizes playlist data into stable structure
 *
 * ------------------------------------------------------------
 * TODO:
 * - Add pagination support (current implementation fetches only first page)
 *
 * ------------------------------------------------------------
 * Rules:
 * - init(secrets) must be called before usage
 * - relies on global SPOTIFY_AUTH_HANDLER
 * - depends on CONFIG.spotify.id for owner filtering
 */
async function getUserPlaylists({ id, ...args }) {
    const response = await SPOTIFY_AUTH_HANDLER.handlePost(
        (accessToken) => GET({
            url: USER_PLAYLISTS,
            headers: { Authorization: `Bearer ${accessToken}` }
        })
    );

    return handleServiceError({
        response,
        format: (payload) => ({
            total: payload?.total ?? 0,
            playlists: (payload?.items ?? [])
                .filter(p => p?.owner?.id === id)
                .map(p => ({
                    name: p?.name ?? null,
                    description: p?.description ?? null,
                    url: p?.external_urls?.spotify ?? null,
                    cover: p?.images ?? [],
                    id: p?.id ?? null
                }))
        })
    });
}


/**
 * Fetches recently played tracks from Spotify.
 *
 * ------------------------------------------------------------
 * Input:
 * ```js
 * {}
 * ```
 *
 * ------------------------------------------------------------
 * Output (ServiceResponse):
 * ```js
 * {
 *   data: {
 *     tracks: Array<{
 *       title: string,
 *       artist: Array<{ name: string, url: string }>,
 *       cover: Array<object>,
 *       url: string
 *     }>
 *   },
 *   error,
 *   code
 * }
 * ```
 *
 * ------------------------------------------------------------
 * Errors:
 * - SERVICE_NOT_CONFIGURED → init(secrets) not called / token missing
 * - UNAUTHORIZED / FORBIDDEN → invalid or expired token
 * - SERVICE_UNAVAILABLE → API/network failure
 *
 * ------------------------------------------------------------
 * Behavior:
 * - Fetches recently played tracks via Spotify API
 * - Limits results to latest 5 items
 * - Normalizes track data using helper function
 * - Filters out invalid entries
 *
 * ------------------------------------------------------------
 * Rules:
 * - init(secrets) must be called before usage
 * - relies on global SPOTIFY_AUTH_HANDLER
 */
async function getRecentlyPlayed({ recentlyPlayedLimit, ...args }) {
    const response = await SPOTIFY_AUTH_HANDLER.handlePost(
        async (accessToken) => GET({
            url: RECENTLY_PLAYED,
            params: { limit: recentlyPlayedLimit },
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })
    );

    return handleServiceError({
        response,
        format: (data) => ({
            tracks: data.items.map(item => getSongDataFromSpotifyItem(item.track))
        })
    });
}


/**
 * Fetches recently played tracks from Spotify.
 *
 * ------------------------------------------------------------
 * Input:
 * ```js
 * {}
 * ```
 *
 * ------------------------------------------------------------
 * Output (ServiceResponse):
 * ```js
 * {
 *   data: {
 *     tracks: Array<{
 *       title: string,
 *       artist: Array<{ name: string, url: string }>,
 *       cover: Array<object>,
 *       url: string
 *     }>
 *   },
 *   error,
 *   code
 * }
 * ```
 *
 * ------------------------------------------------------------
 * Errors:
 * - SERVICE_NOT_CONFIGURED → init(secrets) not called / token missing
 * - UNAUTHORIZED / FORBIDDEN → invalid or expired token
 * - SERVICE_UNAVAILABLE → API/network failure
 *
 * ------------------------------------------------------------
 * Behavior:
 * - Fetches recently played tracks via Spotify API
 * - Limits results to latest 5 items
 * - Normalizes track data using helper function
 * - Filters out invalid entries
 *
 * ------------------------------------------------------------
 * Rules:
 * - init(secrets) must be called before usage
 * - relies on global SPOTIFY_AUTH_HANDLER
 */
async function getTopTracks({ topTracksLimit, ...args }) {
    const response = await SPOTIFY_AUTH_HANDLER.handlePost(
        async (accessToken) => GET({
            url: TOP_TRACKS,
            params: {
                limit: topTracksLimit,
                time_range: "short_term"
            },
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })
    );

    return handleServiceError({
        response,
        format: (data) => ({
            tracks: data.items.map(item => getSongDataFromSpotifyItem(item))
        })
    });
}


/**
 * Fetches recently played tracks from Spotify.
 *
 * ------------------------------------------------------------
 * Input:
 * ```js
 * {}
 * ```
 *
 * ------------------------------------------------------------
 * Output (ServiceResponse):
 * ```js
 * {
 *   data: {
 *     tracks: Array<{
 *       title: string,
 *       artist: Array<{ name: string, url: string }>,
 *       cover: Array<object>,
 *       url: string
 *     }>
 *   },
 *   error,
 *   code
 * }
 * ```
 *
 * ------------------------------------------------------------
 * Errors:
 * - SERVICE_NOT_CONFIGURED → init(secrets) not called / token missing
 * - UNAUTHORIZED / FORBIDDEN → invalid or expired token
 * - SERVICE_UNAVAILABLE → API/network failure
 *
 * ------------------------------------------------------------
 * Behavior:
 * - Fetches recently played tracks via Spotify API
 * - Limits results to latest 5 items
 * - Normalizes track data using helper function
 * - Filters out invalid entries
 *
 * ------------------------------------------------------------
 * Rules:
 * - init(secrets) must be called before usage
 * - relies on global SPOTIFY_AUTH_HANDLER
 */
async function getTopArtists({ topArtistsLimit, ...args }) {
    const response = await SPOTIFY_AUTH_HANDLER.handlePost(
        (accessToken) => GET({
            url: TOP_ARTISTS,
            params: {
                limit: topArtistsLimit,
                time_range: "short_term"
            },
            headers: { Authorization: `Bearer ${accessToken}` }
        })
    );

    return handleServiceError({
        response,
        format: (payload) => ({
            artists: (payload?.items ?? []).map(a => ({
                name: a?.name ?? null,
                url: a?.external_urls?.spotify ?? null,
                cover: a?.images ?? []
            }))
        })
    });
}


const worker_map = {
    initFunc: init,
    configKey: "services.spotify.config",
    name: "Spotify_Service",
    services: {
        "SpotifyProfileInfo": {
            callable: getProfileInfo,
            key: "spotify.profile_info",
            priority: PRIORITY.high,
            next_run: 6 * 3600 * 1000
        },
        "SpotifyCurrentPlaying": {
            callable: getCurrentPlaying,
            key: "spotify.current_playing",
            priority: PRIORITY.high,
            next_run: 15 * 1000 // can be 5 sec but to be safe keeping it 15 sec
        },
        "SpotifyUserPlaylists": {
            callable: getUserPlaylists,
            key: "spotify.user_playlists",
            priority: PRIORITY.medium,
            next_run: 12 * 3600 * 1000
        },
        "SpotifyRecentlyPlayed": {
            callable: getRecentlyPlayed,
            key: "spotify.recently_played",
            priority: PRIORITY.medium,
            next_run: 120 * 1000 // 5 min
        },
        "SpotifyTopTracks": {
            callable: getTopTracks,
            key: "spotify.top_tracks",
            priority: PRIORITY.low,
            next_run: 24 * 3600 * 1000
        },
        "SpotifyTopArtists": {
            callable: getTopArtists,
            key: "spotify.top_artists",
            priority: PRIORITY.low,
            next_run: 24 * 3600 * 1000
        }
    }
}


module.exports = {
    worker_map
};


if (require.main === module) {
    const { runServices } = require("../utils")
    runServices( worker_map )
}