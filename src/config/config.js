export const CONFIG = require("./config.json");

export const SECRET = {
  SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
  SPOTIFY_AUTH_REFRESH_TOKEN: process.env.SPOTIFY_AUTH_REFRESH_TOKEN,
  GITHUB_FG_ACCESS_TOKEN: process.env.GITHUB_FG_ACCESS_TOKEN,
};

// Optional but smart (validation)
// if (!SECRET.GITHUB_FG_ACCESS_TOKEN) {
//   throw new Error("Missing GITHUB_FG_ACCESS_TOKEN");
// }