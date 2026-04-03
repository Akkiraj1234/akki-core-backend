const { handleServiceError } = require("../../utils.js")
const { GET, POST } = require("./request.js")

class AuthHandler  {
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
        
        this.isRefreshing = true;
        const { headers, body } = this.getAuthRequestConfig(this);

        const finalHeaders = {
            "Content-Type": "application/x-www-form-urlencoded",
            ...headers
        };

        const response = await POST({
            url: this.TokenExchangeURL,
            data: body,
            headers: finalHeaders
        });

        const refreshResponse = handleServiceError({
            response, 
            format: (data) => {
                const { accessToken, expiresIn, refreshToken } =
                    this.mapTokenResponse(data);

                this.accessToken = accessToken ?? null;
                this.tokenExpiry = expiresIn 
                    ? Date.now() + expiresIn * 1000 - 60000
                    : 0;
                this.refreshToken = refreshToken ?? this.refreshToken;
            }
        });
        this.notifySubscribers(this.accessToken);
        this.isRefreshing = false;
        
        return refreshResponse.error; // either null or error if happen
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
