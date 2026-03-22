const SECRET = require("../config");
const axios = require('axios');

// config 
const current_playing_endpoint = "https://api.spotify.com/v1/me/player/currently-playing";
const profile_info_endpoint = "https://api.spotify.com/v1/me/player/currently-playing";
const TokenExchnageURL = "https://accounts.spotify.com/api/token";
let ACCESS_TOKEN = null;
let isRefreshing = false;
let refreshSubscribers = [];



async function request({ url, query, variables, headers = {} }) {
    try {
	const finalHeaders = {
	    "Content-Type": "application/json",
	    "Referer": "https://leetcode.com",
	    "User-Agent": "Mozilla/5.0",
	    ...headers
	};
	const res = await axios.post(
	    url,
	    { query, variables },
	    {
		headers: finalHeaders,
		timeout: 5000,
		validateStatus: () => true
	    }
	);
	// console.log(`Leetcode API response status: ${res.status}`);
	// console.log(`Leetcode API response data: ${JSON.stringify(res.data)}`);

	// HTTP errors
	if (res.status === 429) {
	    return { error: { type: "RATE_LIMITED", retryable: true } };
	}

	if (res.status >= 500) {
	    return { error: { type: "SERVER_ERROR", retryable: true } };
	}

	if (res.status >= 400) {
	    return { error: { type: "BAD_REQUEST", retryable: false } };
	}

	// GraphQL errors
	if (res.data.errors) {
	    return { error: { type: "BAD_REQUEST", retryable: false } };
	}
	return { data: res.data.data };

    } catch (err) {
	return { error: { type: "NETWORK_ERROR", retryable: true } };
    }
}







































const SpotifyClient = axios.create({
	baseURL: 'https://api.spotify.com/v1',
})

function onRefreshed(newToken) {
	refreshSubscribers.forEach((cb) => cb(newToken));
	refreshSubscribers = [];
}

function addSubscriber(cb) {
  refreshSubscribers.push(cb);
}

async function refreshAccessToken() {
	try {
		const res = await axios.post(
			TokenExchnageURL,
			new URLSearchParams({grant_type: "refresh_token", refresh_token: SECRET.SPOTIFY_AUTH_REFRESH_TOKEN}),
			{headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: "Basic " + Buffer.from(
					`${SECRET.SPOTIFY_CLIENT_ID}:${SECRET.SPOTIFY_CLIENT_SECRET}`
				).toString("base64")
			}}
		);
		ACCESS_TOKEN = res.data.access_token;
		return ACCESS_TOKEN;
	}
	catch (err) {
		console.error("Refresh failed:", err.response?.data || err.message);
    	throw err;
	}
}

function create_header(con)
SpotifyClient.interceptors.request.use()
SpotifyClient.interceptors.request.use((config) => {
  if (ACCESS_TOKEN) {
    config.headers.Authorization = `Bearer ${ACCESS_TOKEN}`;
  }
  return config;
});



SpotifyClient.interceptors.response.use(
	(response) => response,
	async (error) => {}
)





function request_interceptor(config) {
	const token = SECRET.spotify_access_token;

	if (token) {
		config.headers['Authorization'] = `Bearer ${token}`;
	}
	return config;
}

SpotifyClient.interceptors.request.use(request_interceptor, error => Promise.reject(error));




let isRefreshing = false;
let refreshSubscribers = [];






async function getSpotifyCurrentPlaying(accsess_token) {
	const res = await fetch(
		current_playing_endpoint,
		{ headers: { Authorization: 'Bearer ${accsess_token}' } }
	);

	if (res.status === 204) {
		return { "playing": null }
	}

	if (res.status === 401) {
		// token expried but also need to handle 403(Bad OAuth request (wrong consumer key, bad nonce, expired timestamp...). Unfortunately, re-authenticating the user won't help here.)
		const assess_token = get_new_accsesstoken()
		return getSpotifyCurrentPlaying(assess_token)
	}

	if (res.status === 429) {
		// after 1min limit reached
		return getSpotifyCurrentPlaying(accsess_token)
	}

	if (!res.ok) {
		const error = await res.json();
		throw new Error(error.error?.message || "Failed to fetch currently playing");
	}

	return res.json()
}



function getSpotifyProfileInfo() {

}