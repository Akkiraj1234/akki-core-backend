const { handleServiceError } = require("../../utils.js")
const { GET, POST } = require("./request.js")


class AuthHandler {
    constructor({
        refreshToken,
        clientId,
        clientSecret,
        TokenExchangeURL,
        getAuthRequestConfig,
        mapTokenResponse
    }) {
        /*
        refreshToken: The refresh token obtained
        clientId:  Client ID of token
        clientSecret: Client Secret of token
        HeaderGenerator: a callable function which generates headers takes, refreshToken, clientId and clientSecret
                         as parameters and returns the headers with the access token set
        */
        this.refreshToken = refreshToken;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.TokenExchangeURL = TokenExchangeURL;

        this.getAuthRequestConfig = getAuthRequestConfig;
        this.mapTokenResponse = mapTokenResponse;

        this.tokenExpiry = 0;
        this.accessToken = null;
        this.isRefreshing = false;
        this.refreshSubscribers = [];
    }

    async refreshAccessToken() {
        if (this.isRefreshing) {
            return this.waitForRefresh();
        }

        let refreshResponse;
        try {
            this.isRefreshing = true;
            const { headers = {}, body } = this.getAuthRequestConfig(this);

            const finalHeaders = {
                "Content-Type": "application/x-www-form-urlencoded",
                ...headers
            };

            const response = await POST({
                url: this.TokenExchangeURL,
                data: body,
                headers: finalHeaders
            });

            refreshResponse = handleServiceError({
                response,
                format: (data) => {
                    const { accessToken, expiresIn, refreshToken } =
                        this.mapTokenResponse(data);

                    this.accessToken = accessToken ?? this.accessToken;
                    this.tokenExpiry = expiresIn
                        ? Date.now() + expiresIn * 1000 - 60000
                        : 0;
                    this.refreshToken = refreshToken ?? this.refreshToken;
                }
            });

        } catch (err) {
            refreshResponse = { error: err };

        } finally {
            this.notifySubscribers({
                accessToken: this.accessToken,
                error: refreshResponse?.error ?? null
            });
            this.isRefreshing = false;
            return refreshResponse.error ?? null;
        }
    }

    notifySubscribers({ accessToken, error }) {
        this.refreshSubscribers.forEach(cb => cb({ accessToken, error }));
        this.refreshSubscribers = [];
    }

    waitForRefresh() {
        return new Promise((resolve) => {
            this.refreshSubscribers.push(resolve);
        });
    }

    async handlePost(callable) {
        if (!this.accessToken || Date.now() >= this.tokenExpiry) {
            const error = await this.refreshAccessToken();

            if (error) {
                return { data: null, error }; // or your createResponse
            }
        }
        const res = await callable(this.accessToken);

        // if (res.error && (res.code === 401 || res.code === 403)) {
        if (res.error?.type === "UNAUTHORIZED" || res.error?.type === "FORBIDDEN") {
            const error = await this.refreshAccessToken();

            if (error) {
                return { data: null, error }; // or your createResponse
            }
            return await callable(this.accessToken);
        }

        return res;
    }
}


module.exports = {
    AuthHandler
}