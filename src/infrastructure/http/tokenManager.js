const { createResponse, handleServiceError } = require("../../utils.js")
const { buildError, POST } = require("./request.js")
const { 
    ERROR_TYPES, 
    createTokenExpiredError, 
    createConfigNotFoundError 
} = require("./error.js");


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
            const error = await this.waitForRefresh();
            return error ?? null;
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
            refreshResponse = {
                data: null,
                error: err,
                code: null
            };

        } finally {
            this.isRefreshing = false;
            this.notifySubscribers( refreshResponse?.error ?? null);
            return refreshResponse.error ?? null;
        }
    }

    notifySubscribers( error ) {
        this.refreshSubscribers.forEach(cb => cb( error ));
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
                return createResponse({
                    data: null,
                    error,
                    code: error?.source?.code ?? null
                });
            }
        }
        const res = await callable(this.accessToken);

        // if (res.error && (res.code === 401 || res.code === 403)) {
        if (res.error?.type === "UNAUTHORIZED" || res.error?.type === "FORBIDDEN") {
            const error = await this.refreshAccessToken();

            if (error) {
                return createResponse({
                    data: null,
                    error,
                    code: error?.source?.code ?? null
                });
            }
            return await callable(this.accessToken);
        }

        return res;
    }
}


class StaticAuthHandler {
    constructor() {
        this.accessToken = null;
        this.getAuthRequestHeader = null;
    }

    fromConfig({ accessToken, getAuthRequestHeader,}) {
        this.accessToken = accessToken ?? null;
        this.getAuthRequestHeader = getAuthRequestHeader ?? null;
        return this;
    }

    async handlePost(callable) {
        if (!this.accessToken) {
            return createResponse({
                data: null,
                error: createConfigNotFoundError({
                    service: "StaticAuthHandler",
                    key: "accessToken"
                }),
                code: null
            });
        }

        const headers = this.getAuthRequestHeader
            ? this.getAuthRequestHeader(this)
            : { Authorization: `Bearer ${this.accessToken}` };

        const res = await callable( headers );

        if (
            res.error?.type === ERROR_TYPES.UNAUTHORIZED ||
            res.error?.type === ERROR_TYPES.FORBIDDEN
        ) {
            return createResponse({
                data: null,
                error: createTokenExpiredError(res.error), 
                code: res.code
            });
        }

        return res;
    }
}



module.exports = {
    AuthHandler,
    StaticAuthHandler
}