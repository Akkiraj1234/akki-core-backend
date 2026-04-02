const { GET, POST } = require("../infrastructure")
const { SECRET, CONFIG } = require("../config");
const { handleServiceError } = require("../utils.js")

// config 
const CURRENT_PLAYING = "https://api.spotify.com/v1/me/player/currently-playing";
const PROFILE_INFO = "https://api.spotify.com/v1/me/player/currently-playing";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

let ACCESS_TOKEN = null;
let TOKEN_EXPIRY = 0;
let isRefreshing = false;
let refreshSubscribers = [];


function notifySubscribers(token) {
    refreshSubscribers.forEach(cb => cb(token));
    refreshSubscribers = [];
}

function waitForRefresh() {
    return new Promise((resolve) => {
        refreshSubscribers.push(resolve);
    });
}


async function refreshAccessToken() {
    if (isRefreshing) {
        return waitForRefresh();
    }
    isRefreshing = true;
    const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic `+ (
            new Buffer.from(SECRET.SPOTIFY_CLIENT_ID + ':' + SECRET.SPOTIFY_CLIENT_SECRET

        ).toString("base64"))
    };
    const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: SECRET.SPOTIFY_AUTH_REFRESH_TOKEN
    });

    const response = await POST({
        url: TOKEN_URL,
        data: body,
        headers
    });

    const refreshResponse = handleServiceError({
        response,
        format: (data) => {
            const access_token = data.data?.access_token;
            const expiresIn = data.data?.expires_in;

            if (access_token && expiresIn) {
                ACCESS_TOKEN = access_token;
                TOKEN_EXPIRY = Date.now() + expiresIn * 1000 - 60000; // Refresh 1 min before expiry
                notifySubscribers(access_token);
                return access_token;
                
            } else {
                throw new Error("Invalid token response");
            }
        }
    });

    return ACCESS_TOKEN;
}




async function handlePostRequest(url, options = {}) {
    if (!ACCESS_TOKEN || Date.now() >= TOKEN_EXPIRY) {
        await refreshAccessToken();
    }

    const headers = {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        ...options.headers
    };

    const response = await POST({
        url,
        data: options.data,
        headers
    });

    return handleServiceError({
        response,
        format: (data) => data.data
    });
}

class authHandler {
    constructor({ refreshToken, clientId, clientSecret, HeaderGenerator }) {
        this.refreshToken = refreshToken;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.HeaderGenerator = HeaderGenerator;
        this.tokenExpiry = 0;
        this.isRefreshing = false;
        this.refreshSubscribers = [];
    }

    async refreshAccessToken() {
        if (this.isRefreshing) {
            return this.waitForRefresh();
        }
        this.isRefreshing = true;
        const headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Basic `+ (
                new Buffer.from(this.clientId + ':' + this.clientSecret

            ).toString("base64"))
        };
        const body = new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: this.refreshToken
        });

        const response = await POST({
            url: TOKEN_URL,
            data: body,
            headers
        });

        const refreshResponse = handleServiceError({
            response,
            format: (data) => {
                const access_token = data.data?.access_token;
                const expiresIn = data.data?.expires_in;

                if (access_token && expiresIn) {
                    this.HeaderGenerator.setAccessToken(access_token);
                    this.tokenExpiry = Date.now() + expiresIn * 1000 - 60000; // Refresh 1 min before expiry
                    this.notifySubscribers(access_token);
                    return access_token;
                    
                } else {
                    throw new Error("Invalid token response");
                }
            }
        });

        return this.HeaderGenerator.getAccessToken();
    }

    notifySubscribers(token) {
        this.refreshSubscribers.forEach(cb => cb(token));
        this.refreshSubscribers = [];
    }

    waitForRefresh() {
        return new Promise((resolve) => {
            this.refreshSubscribers.push(resolve);
        });
    }

    async handlePost(callable) {
        if (!this.access_token || Date.now() >= this.tokenExpiry) {
            await this.refreshAccessToken();
        }
        try {
                return await callable(this.access_token);
        }
        catch (err) {
            if (err.response && err.response.status === 401) {
                await this.refreshAccessToken();
                return await callable(this.access_token);
            }
            throw err;
        }
    }
}

async function getProfileInfo() {
    return 
    return handlePostRequest(PROFILE_INFO);
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