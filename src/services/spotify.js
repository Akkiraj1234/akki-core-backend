const { GET, POST, authHandler } = require("../infrastructure")
const { handleServiceError } = require("../utils.js")
const { SECRET, CONFIG } = require("../config");

// config 
const CURRENT_PLAYING = "https://api.spotify.com/v1/me/player/currently-playing";
const PROFILE_INFO = "https://api.spotify.com/v1/me/profile";
const TOKEN_URL = "https://accounts.spotify.com/api/token";



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