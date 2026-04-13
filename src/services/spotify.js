const { GET, POST, AuthHandler } = require("../infrastructure")
const { handleServiceError } = require("../utils.js")
const { SECRET, CONFIG } = require("../config");

// config 
const PROFILE_INFO = "https://api.spotify.com/v1/me";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const CURRENT_PLAYING = "https://api.spotify.com/v1/me/player/currently-playing";
const USER_PLAYLISTS = "https://api.spotify.com/v1/me/playlists";
const RECENTLY_PLAYED = "https://api.spotify.com/v1/me/player/recently-played";
const TOP_TRACKS = "https://api.spotify.com/v1/me/top/tracks";
const TOP_ARTISTS = "https://api.spotify.com/v1/me/top/artists";


function getAuthConfig( secrets ) {
    if (!secrets.SPOTIFY_AUTH_REFRESH_TOKEN 
        || !secrets.SPOTIFY_CLIENT_ID
        || !secrets.SPOTIFY_CLIENT_SECRET
    ){
        throw createConfigNotError("spotify config not found error");
    }

    return {
        refreshToken: SECRET.SPOTIFY_AUTH_REFRESH_TOKEN,
        clientId: SECRET.SPOTIFY_CLIENT_ID,
        clientSecret: SECRET.SPOTIFY_CLIENT_SECRET,
        TokenExchangeURL: TOKEN_URL,

        getAuthRequestConfig: (authHandler) => {
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
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
    };
}


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

// data fetching functions
const spotifyAuthHandler = new AuthHandler(authConfig);

async function getProfileInfo() {
    const response = await spotifyAuthHandler.handlePost(
        async (accessToken) => {
            return await GET({
                url: PROFILE_INFO,
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })
        }
    );
    return handleServiceError({
        response,
        format: (data) => {
            const payload = data; // not data?.data because not graphql

            return {
                userId: payload.id ?? null,
                username: payload.display_name ?? null,
                images: payload.images ?? [],
                profile_url: payload.external_urls.spotify ?? null,
                followers: payload.followers.total ?? 0,
            }
        }
    });
}

async function getCurrentPlaying() {
    const response = await spotifyAuthHandler.handlePost(
        async (accessToken) => {
            return await GET({
                url: CURRENT_PLAYING,
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })
        }
    );
    return handleServiceError({
        response,
        format: (data) => {
            const payload = data; // not data?.data because not graphql

            return {
                is_playing: payload?.is_playing ?? false,
                track: getSongDataFromSpotifyItem(payload?.item ?? {}),
                progress: {
                    current: Math.floor((payload?.progress_ms ?? 0) / 1000),
                    duration: Math.floor((payload?.item?.duration_ms ?? 0) / 1000)
                }
            }
        }

    });
}

async function getUserPlaylists() {
    // in future fix these stuff
    // missing pagination (big one)

    const response = await spotifyAuthHandler.handlePost(
        async (accessToken) => {
            return await GET({
                url: USER_PLAYLISTS,
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });
        }
    );

    return handleServiceError({
        response,
        format: (data) => ({
            total: data.total ?? 0,
            playlists: (data.items ?? [])
                .filter(p => p.owner.id === CONFIG.spotify.id)
                .map(p => ({
                    name: p.name,
                    description: p.description,
                    url: p.external_urls.spotify,
                    cover: p.images ?? [],
                    id: p.id
                })
            )
        })
    });
}

async function getRecentlyPlayed() {
    const response = await spotifyAuthHandler.handlePost(
        async (accessToken) => {
            return await GET({
                url: RECENTLY_PLAYED,
                params: { limit: 5 },
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });
        }
    );

    return handleServiceError({
        response,
        format: (data) => ({
            tracks: data.items.map(item => getSongDataFromSpotifyItem(item.track))
        })
    });
}

async function getTopTracks() {
    const response = await spotifyAuthHandler.handlePost(
        async (token) => {
            return await GET({
                url: TOP_TRACKS,
                params: {
                    limit: 5,
                    time_range: "short_term"
                },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
        }
    );

    return handleServiceError({
        response,
        format: (data) => ({
            tracks: data.items.map(item => getSongDataFromSpotifyItem(item))
        })
    });
}

async function getTopArtists() {
    const response = await spotifyAuthHandler.handlePost(
        async (token) => {
            return await GET({
                url: TOP_ARTISTS,
                params: {
                    limit: 5,
                    time_range: "short_term"
                },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
        }
    );

    return handleServiceError({
        response,
        format: (data) => ({
            artists: data.items.map(a => ({
                name: a.name,
                url: a.external_urls.spotify,
                cover: a.images ?? []
            }))
        })
    });
}

const worker_map = {
    "SpotifyProfileInfo": {
        callable: getProfileInfo,
        key: "spotify.profile_info",
        priority: "high",
        next_run: 6 * 3600 * 1000
    },
    "SpotifyCurrentPlaying": {
        callable: getCurrentPlaying,
        key: "spotify.current_playing",
        priority: "high",
        next_run: 15 * 1000 // can be 5 sec but to be safe keeping it 15 sec
    },
    "SpotifyUserPlaylists": {
        callable: getUserPlaylists,
        key: "spotify.user_playlists",
        priority: "medium",
        next_run: 12 * 3600 * 1000
    },
    "SpotifyRecentlyPlayed": {
        callable: getRecentlyPlayed,
        key: "spotify.recently_played",
        priority: "medium",
        next_run: 120 * 1000 // 5 min
    },
    "SpotifyTopTracks": {
        callable: getTopTracks,
        key: "spotify.top_tracks",
        priority: "low",
        next_run: 24 * 3600 * 1000
    },
    "SpotifyTopArtists": {
        callable: getTopArtists,
        key: "spotify.top_artists",
        priority: "low",
        next_run: 24 * 3600 * 1000
    }
}

module.exports = {
    worker_map
}

async function main() {
    const data = await Promise.all([
        getProfileInfo(),
        getCurrentPlaying(),
        getUserPlaylists(),
        getRecentlyPlayed(),
        getTopTracks(),
        getTopArtists()
    ]);
    data.forEach((res) => {
        console.dir(
            res?.error?.error ? `No data found ${JSON.stringify(res.error)}` : res,
            { depth: null })
    });
}

if (require.main === module) {
    main();
}