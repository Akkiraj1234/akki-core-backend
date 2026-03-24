/**
 * Error Types (Domain-Level)
 *
 * TRANSIENT (handled by orchestrator, e.g. Orbit)
 * | Type                    | When it occurs                              |
 * |-------------------------|---------------------------------------------|
 * | NETWORK_FAILURE         | Network issues (DNS, connection failure)    |
 * | SERVER_FAILURE          | Server-side errors (HTTP 5xx)               |
 * | RATE_LIMITED            | Too many requests (HTTP 429)                |
 * | TEMPORARY_UNAVAILABLE   | Service temporarily unavailable (HTTP 503)  |
 * | TIMEOUT                 | Request or upstream timeout (408, 504)      |
 *
 * PERMANENT (non-retryable by default)
 * | Type                | When it occurs                               |
 * |---------------------|----------------------------------------------|
 * | NOT_FOUND           | Resource not found (HTTP 404)                |
 * | BAD_REQUEST         | Invalid request syntax or structure (400)    |
 * | VALIDATION_FAILED   | Request data failed validation (422)         |
 * | UNAUTHORIZED        | Authentication required or failed (401)      |
 * | FORBIDDEN           | Access denied (403)                          |
 *
 * EDGE / FALLBACK
 * | Type                | When it occurs                               |
 * |---------------------|----------------------------------------------|
 * | PARSE_FAILURE       | Invalid or unexpected response format        |
 * | UNKNOWN_FAILURE     | Unclassified or unexpected error             |
 *
 * Notes:
 * - This layer is responsible only for classification and normalization.
 * - HTTP/transport errors are mapped to domain-level error types via `errorMap`.
 * - No retry logic is defined here; retry decisions are handled by higher-level systems (e.g. Orbit).
 * - Error messages should remain generic and reusable across services.
 */

// the return type should be fixed
// for example return type should loook something like this:
// error = buildError()
// should return by post and get : { data, error, code };
// which supppose to be followed by all function like httserrorHandler, graphqlErrorHandler, POST, GET etc.

const axios = require("axios");
const { sanitize, ERROR_TYPES } = require("../utils.js");


const ERROR_MAP = Object.freeze({
    400: { type: ERROR_TYPES.BAD_REQUEST, message: "The request is invalid or malformed." },
    401: { type: ERROR_TYPES.UNAUTHORIZED, message: "Authentication is required or has failed." },
    403: { type: ERROR_TYPES.FORBIDDEN, message: "You do not have permission to access this resource." },
    404: { type: ERROR_TYPES.NOT_FOUND, message: "The requested resource could not be found." },
    408: { type: ERROR_TYPES.TIMEOUT, message: "The request timed out before completion." },
    422: { type: ERROR_TYPES.VALIDATION_FAILED, message: "The request data failed validation." },
    429: { type: ERROR_TYPES.RATE_LIMITED, message: "Too many requests. Please try again later." },
    500: { type: ERROR_TYPES.SERVER_FAILURE, message: "An unexpected server error occurred." },
    502: { type: ERROR_TYPES.SERVER_FAILURE, message: "Invalid upstream response." },
    503: { type: ERROR_TYPES.TEMPORARY_UNAVAILABLE, message: "Service temporarily unavailable." },
    504: { type: ERROR_TYPES.TIMEOUT, message: "Upstream timeout." }
});

const DEFAULT_HEADERS = Object.freeze({
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": "orbit-client/1.0",
    "X-Client-Name": "orbit",
    "X-Client-Version": "1.0.0"
});

function createResponse({ data = null, error = null, code = null }) {
    return { data, error, code };
}

function buildError({ base, res = null, req = null, errorMessage = null }) {

    req = (req && typeof req === "object" && !Array.isArray(req)) ? req : {};
    res = (res && typeof res === "object" && !Array.isArray(res)) ? res : {};

    // const extractedMessage = 
    //     errorMessage ||
    //     res?.data?.message ||
    //     res?.data?.error ||
    //     null;
    const extractedMessage = errorMessage ??
    (typeof res?.data === "object"
        ? res.data?.message || res.data?.error
        : typeof res?.data === "string"
        ? res.data
        : null);
    
    return {
        ...base,

        source: {
            code: res?.status ?? null,
            message: extractedMessage
        },
        context: {
            request: {
                method: req?.method ?? null,
                url: req?.url ?? null,
                headers: sanitize(req?.headers),
                body: sanitize(req.data ?? req.body ?? null)
            },
            response: {
                status: res?.status ?? null,
                headers: sanitize(res?.headers),
                body: sanitize(res?.data)
            }   
        },
        meta: {
            timestamp: new Date().toISOString()
        }
    };
}

function httpErrorHandler({ code, res, req }) {

    if (code == null) {
        return buildError({
            base: {
                type: ERROR_TYPES.NETWORK_FAILURE,
                message: "Network failure or no response",
            },
            res,
            req
        });
    }

    if (code < 400) return null; // no error for successful responses
    let base = ERROR_MAP[code];

    if (!base) {
        if (code >= 500) {
            base = { type: ERROR_TYPES.SERVER_FAILURE, message: `Unexpected server error occurred.` };
        } else if (code >= 400) {
            base = { type: ERROR_TYPES.BAD_REQUEST, message: `The request could not be processed.` };
        } else {
            base = { type: ERROR_TYPES.UNKNOWN_FAILURE, message: `An unexpected error occurred.` };
        }
    }

    return buildError({ base, res, req });
}

function graphqlErrorHandler({ res, req }) {
    const data = res?.data;

    if (!data || !Array.isArray(data.errors) || data.errors.length === 0) {
        return null;
    }

    const err = data.errors[0];
    const code = err?.extensions?.code;

    const typeMap = {
        UNAUTHENTICATED: ERROR_TYPES.UNAUTHORIZED,
        FORBIDDEN: ERROR_TYPES.FORBIDDEN,
        NOT_FOUND: ERROR_TYPES.NOT_FOUND,
        INTERNAL_SERVER_ERROR: ERROR_TYPES.SERVER_FAILURE,
        RATE_LIMITED: ERROR_TYPES.RATE_LIMITED
    };

    const base = {
        type: typeMap[code] || ERROR_TYPES.BAD_REQUEST,
        message: err?.message || "GraphQL error"
    };

    return buildError({
        base,
        res,
        req,
        errorMessage: err?.message
    })
}

function checkErrorAndResponse({ code, response, request }) {
    const httpError = httpErrorHandler({
        code: code,
        res: response,
        req: request,
    });

    if (httpError) {
        return createResponse({
            error: httpError,
            code: httpError.type,
        });
    }

    const graphqlError = graphqlErrorHandler({
        res: response,
        req: request,
    });

    if (graphqlError) {
        return createResponse({
            error: graphqlError,
            code: graphqlError.type,
        });
    }

    return createResponse({
        data: response?.data ?? null,
        code: code ?? null,
    });
}

async function POST({ url, query, variables, headers = {} }) {
    try {
        const res = await axios.post(
            url,
            { query, variables },
            {
                headers: { ...DEFAULT_HEADERS, ...headers },
                timeout: 5000,
                validateStatus: () => true
            }
        );
        return checkErrorAndResponse({ 
            code: res.status,
            response: res, 
            request: res?.config 
        });
    
    } catch (err) {
        return createResponse({
            error: buildError({
                base: {
                    type: ERROR_TYPES.NETWORK_FAILURE,
                    message: err.message || "Network failure or no response"
                },
                req: err.config,
                res: err.response,
                errorMessage: err.message
            }),
            code: ERROR_TYPES.NETWORK_FAILURE
        });
    }
}

async function GET({ url, params = null, headers = {} }) {
    try {
        const res = await axios.get(url, {
            params,
            headers: { ...DEFAULT_HEADERS, ...headers },
            timeout: 5000,
            validateStatus: () => true
        });
        return checkErrorAndResponse({ 
            code: res.status,
            response: res, 
            request: res.config 
        });
    
    } catch (err) {
        return createResponse({
            error: buildError({
                base: {
                    type: ERROR_TYPES.NETWORK_FAILURE,
                    message: err.message || "Network failure or no response"
                },
                req: err.config,
                res: err.response,
                errorMessage: err.message
            }),
            code: ERROR_TYPES.NETWORK_FAILURE
        });
    }
}

module.exports = {
    ERROR_TYPES,
    POST,
    GET
};