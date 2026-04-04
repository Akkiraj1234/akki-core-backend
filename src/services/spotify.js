const { GET, POST, AuthHandler } = require("../infrastructure")
const { handleServiceError } = require("../utils.js")
const { SECRET, CONFIG } = require("../config");

// config 
const CURRENT_PLAYING = "https://api.spotify.com/v1/me/player/currently-playing";
const PROFILE_INFO = "https://api.spotify.com/v1/me";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

const authConfig = {
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
                username: payload.display_name ?? null,
                userId: payload.id ?? null,
                profile_url: payload.external_urls.spotify ?? null,
                followers: payload.followers.total ?? 0,
                images: payload.images ?? []
            }
        }
    });
}


async function getCurrentPlaying() {
    const response = await spotifyAuthHandler.handlePost(
        async ( accessToken ) => {
            return await GET({
                url: CURRENT_PLAYING,
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })
        }
    );
    // return handleServiceError({

    // })
    return response.data;
}

async function main() {
    const data = await Promise.all([
        getProfileInfo(),
        getCurrentPlaying()
    ]);
    data.forEach((res) => {
        console.dir(
            res?.error?.error ? `No data found ${JSON.stringify(res.error)}`: res, 
            { depth: null })
    });
}

if (require.main === module) {
    main();
}