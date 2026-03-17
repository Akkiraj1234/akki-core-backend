const current_playing_endpoint = "https://api.spotify.com/v1/me/player/currently-playing";
const profile_info_endpoint = "https://api.spotify.com/v1/me/player/currently-playing";

class HttpClient {
	constructor({
		baseURL,
		AccessToken,
		refeshTokenURL,
		headers = {},
		timeout = 5000
	}){
		this.baseURL = baseURL;
		this.AccessToken = AccessToken;
		this.refeshTokenURL = refeshTokenURL;
		this.headers = headers;
		this.timeout = timeout;
	}

	async request(endpoint, options = {}, retry = true){
		const res = await fetch(
			this.baseURL + endpoint,
			{headers}
		
		)
	}
	
}
const Token = {}

class Spotifyfetcher{
	constructor({
		token = Token
	}){
		this.token = token
		this.accsess_token = this.token.accsess_token
		this.http_client = new Http_client
	}
}

async function getSpotifyCurrentPlaying(accsess_token) {
	const res = await fetch(
		current_playing_endpoint,
		{ headers: { Authorization: 'Bearer ${accsess_token}' } }
	);

	if (res.status === 204){
		return {"playing": null}
	}

	if (res.status === 401){
		// token expried but also need to handle 403(Bad OAuth request (wrong consumer key, bad nonce, expired timestamp...). Unfortunately, re-authenticating the user won't help here.)
		const assess_token = get_new_accsesstoken()
		return  getSpotifyCurrentPlaying(assess_token)
	}

	if (res.status === 429){
		// after 1min limit reached
		return getSpotifyCurrentPlaying(accsess_token)
	}

	if (!res.ok){
		const error = await res.json();
		throw new Error(error.error?.message || "Failed to fetch currently playing");
	}

	return res.json()
}



function getSpotifyProfileInfo() {

}