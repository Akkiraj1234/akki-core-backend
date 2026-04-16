const { GET, POST } = require("./http/request.js");
const { AuthHandler, StaticAuthHandler } = require("./http/tokenManager.js");

module.exports = {
    GET,
    POST,
    AuthHandler,
    StaticAuthHandler
};
