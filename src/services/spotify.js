const { GET, POST, AuthHandler } = require("../infrastructure")
const { handleServiceError } = require("../utils.js")
const { SECRET, CONFIG } = require("../config");

// config 
const CURRENT_PLAYING = "https://api.spotify.com/v1/me/player/currently-playing";
const PROFILE_INFO = "https://api.spotify.com/v1/me/profile";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

const authConfig = {
    refreshToken: SECRET.SPOTIFY_REFRESH_TOKEN,
    clientId: SECRET.SPOTIFY_CLIENT_ID,
    clientSecret: SECRET.SPOTIFY_CLIENT_SECRET,
    TokenExchangeURL: TOKEN_URL,

    getAuthRequestConfig: (authHandler) => {
        const headers = {
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + (
                new Buffer.from(authHandler.clientId + ':' + authHandler.clientSecret).toString('base64')
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
            refreshToken: data.refresh_token || authHandler.refreshToken
        };
    }
}

const spotifyAuthHandler = new AuthHandler(authConfig);


async function getProfileInfo() {
    return await spotifyAuthHandler.handlePost(async (accessToken) => {
        return await GET({
            url: PROFILE_INFO,
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
    });
}


async function getCurrentPlaying() {
    return handlePostRequest(CURRENT_PLAYING);
}

function main() {
    console.log("Spotify Profile Info:");
    getProfileInfo().then(profile => {
        console.dir(profile);
    }).catch(err => {
        console.error("Error fetching profile info:", err);
    });
}
if (require.main === module) {
    main()
}