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
// error = { type: ERROR_TYPES, message: message, source: {code: code, message: message, raw: {...}, } 
// should return by post and get : { data, error, status };
// which supppose to be followed by all function like httserrorHandler, graphqlErrorHandler, POST, GET etc.


const ERROR_TYPES = Object.freeze({
    NETWORK_FAILURE:       "NETWORK_FAILURE",
    SERVER_FAILURE:        "SERVER_FAILURE",
    RATE_LIMITED:          "RATE_LIMITED",
    TEMPORARY_UNAVAILABLE: "TEMPORARY_UNAVAILABLE",
    TIMEOUT:               "TIMEOUT",

    NOT_FOUND:             "NOT_FOUND",
    UNAUTHORIZED:          "UNAUTHORIZED",
    FORBIDDEN:             "FORBIDDEN",
    BAD_REQUEST:           "BAD_REQUEST",
    VALIDATION_FAILED:     "VALIDATION_FAILED",

    PARSE_FAILURE:         "PARSE_FAILURE",
    UNKNOWN_FAILURE:       "UNKNOWN_FAILURE"
});

const ERROR_MAP = Object.freeze({
    400: { type: ERROR_TYPES.BAD_REQUEST, message: "The request is invalid or malformed." },
    401: { type: ERROR_TYPES.UNAUTHORIZED, message: "Authentication is required or has failed." },
    403: { type: ERROR_TYPES.FORBIDDEN, message: "You do not have permission to access this resource." },
    404: { type: ERROR_TYPES.NOT_FOUND, message: "The requested resource could not be found." },
    408: { type: ERROR_TYPES.TIMEOUT, message: "The request timed out before completion." },
    422: { type: ERROR_TYPES.VALIDATION_FAILED, message: "The request data failed validation." },
    429: { type: ERROR_TYPES.RATE_LIMITED, message: "Too many requests. Please try again later." },
    500: { type: ERROR_TYPES.SERVER_FAILURE, message: "An unexpected server error occurred." },
    502: { type: ERROR_TYPES.SERVER_FAILURE, message: "Received an invalid response from the upstream server." },
    503: { type: ERROR_TYPES.TEMPORARY_UNAVAILABLE, message: "The service is temporarily unavailable." }, 
    504: { type: ERROR_TYPES.TIMEOUT, message: "The upstream server did not respond in time." }
});

const DEFAULT_HEADERS = Object.freeze({
  "Content-Type": "application/json",
  "Accept": "application/json",
  "User-Agent": "orbit-client/1.0",
  "X-Client-Name": "orbit",
  "X-Client-Version": "1.0.0"
});


function httpErrorHandler({ status, data }) {
    if (status == null) {
        return {
            type: ERROR_TYPES.NETWORK_FAILURE,
            message: "Network failure or no response",
            source: { status: null, message: String(data || "No response"), raw: data }
        }
    }

    if (status < 400) return null; // no error for successful responses
    let base = ERROR_MAP[status];

    if (!base) {
        if (status >= 500) {
            base = { type: ERROR_TYPES.SERVER_FAILURE, message: `ERROR_CODE ${status}: Unexpected server error occurred.` };
        } else if (status >= 400) {
            base = { type: ERROR_TYPES.BAD_REQUEST, message: `ERROR_CODE ${status}: The request could not be processed.` };
        } else {
            base = { type: ERROR_TYPES.UNKNOWN_FAILURE, message: `ERROR_CODE ${status}: An unexpected error occurred.` };
        }
    }

    const extractedMessage  = data && typeof data === "object"
        ? data?.message || data?.error || data?.error_description || null
        : data
        ? String(data)
        : "No message provided";

    return {
        ...base, source: {
            code: status, message: extractedMessage, raw: data
        }
    };
}

function graphqlErrorHandler({ data }) {
    if (!data || !Array.isArray(data.errors) || data.errors.length === 0) {
        return null;
    }

    const err = data.errors[0];
    const code = err?.extensions?.code;
    let type = ERROR_TYPES.BAD_REQUEST;

    switch (code) {
        case "UNAUTHENTICATED":
            type = ERROR_TYPES.UNAUTHORIZED;
            break;
        case "FORBIDDEN":
            type = ERROR_TYPES.FORBIDDEN;
            break;
        case "NOT_FOUND":
            type = ERROR_TYPES.NOT_FOUND;
            break;
        case "INTERNAL_SERVER_ERROR":
            type = ERROR_TYPES.SERVER_FAILURE;
            break;
        case "RATE_LIMITED":
            type = ERROR_TYPES.RATE_LIMITED;
            break;
        default:
            type = ERROR_TYPES.BAD_REQUEST;
    }

    return {
        type,
        message: err?.message || "GraphQL error",
        source: {
            code: code,
            message: err?.message,
            raw: data
        }
    };
}

function createResponse({ data = null, error = null, status = null }) {
    return { data, error, status };
}

function CheckErrorAndResponse(response) {
    const httpError = httpErrorHandler({
        status: response.status,
        data: response.data
    });

    if (httpError) {
        return createResponse({
            error: httpError,
            status: response.status,
        })
    }

    const graphqlError = graphqlErrorHandler({
        data: response.data
    });

    if (graphqlError) {
        return createResponse({
            error: graphqlError,
            status: response.status,
        })
    }

    return createResponse({
        data: response.data?.data ?? null,
        status: response.status
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
        return CheckErrorAndResponse(res);

    } catch (err) {
        return createResponse({
            error: {
                type: ERROR_TYPES.NETWORK_FAILURE,
                message: err.message || "Network error occurred",
                source: {code: null, message: null, raw: err}
            }
        });
    }
}

async function GET({ url, params = null }) {
    try {
        const res = await axios.get(url, {
            params,
            timeout: 5000,
            validateStatus: () => true
        });
        return CheckErrorAndResponse(res);

    } catch (err) {
        return createResponse({
            error: {
                type: ERROR_TYPES.NETWORK_FAILURE,
                message: err.message || "Network error occurred",
                source: {code: null, message: null, raw: err}
            },
        });
    }
}

module.exports = {
    ERROR_TYPES,
    POST,
    GET
};