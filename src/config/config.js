require("dotenv").config({ path: "secret.env" });
const CONFIG = require("./config.json");

const SECRET = {
  SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
  SPOTIFY_AUTH_REFRESH_TOKEN: process.env.SPOTIFY_AUTH_REFRESH_TOKEN,
  GITHUB_FG_ACCESS_TOKEN: process.env.GITHUB_FG_ACCESS_TOKEN,
};

module.exports = {
  CONFIG,
  SECRET,
};
// Optional but smart (validation)
// if (!SECRET.GITHUB_FG_ACCESS_TOKEN) {
//   throw new Error("Missing GITHUB_FG_ACCESS_TOKEN");
// }

// const CONFIG = require("./config.json");

// // ------------------------------------------------------------
// const assert = (cond, msg) => {
//     if (!cond) throw new Error(`[CONFIG ERROR] ${msg}`);
// };

// const isString = (v) => typeof v === "string" && v.trim().length > 0;
// const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);

// // ------------------------------------------------------------
// function validateAccount(name, account) {
//     assert(isObject(account), `${name}.account must be object`);

//     if ("username" in account) {
//         assert(isString(account.username), `${name}.account.username invalid`);
//     }

//     if ("id" in account) {
//         assert(isString(account.id), `${name}.account.id invalid`);
//     }
// }

// function validateOptions(name, options) {
//     if (!options) return;

//     assert(isObject(options), `${name}.options must be object`);

//     for (const [key, value] of Object.entries(options)) {
//         const valid =
//             typeof value === "boolean" ||
//             (Array.isArray(value) && value.every(v => typeof v === "string"));

//         assert(valid, `${name}.options.${key} invalid`);
//     }
// }

// function validateMeta(name, meta) {
//     if (!meta) return;

//     assert(isObject(meta), `${name}.meta must be object`);
// }

// // ------------------------------------------------------------
// function validateConfig(config) {
//     assert(isObject(config.services), "services must exist");

//     for (const [name, service] of Object.entries(config.services)) {
//         assert(isObject(service), `${name} must be object`);

//         validateAccount(name, service.account);
//         validateOptions(name, service.options);
//         validateMeta(name, service.meta);
//     }
// }

// // ------------------------------------------------------------
// validateConfig(CONFIG);

// module.exports = { CONFIG };