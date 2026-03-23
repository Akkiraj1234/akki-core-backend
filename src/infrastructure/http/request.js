/**
 * Error Types
 *
 * TRANSIENT (retryable)
 * | Type               | When it occurs                           | Default action         |
 * |--------------------|------------------------------------------|------------------------|
 * | NETWORK_ERROR      | timeout, DNS, connection failure         | retry soon             |
 * | SERVER_ERROR       | HTTP 5xx (500, 502)                      | retry with backoff     |
 * | RATE_LIMITED       | HTTP 429                                 | retry after delay      |
 * | TEMP_UNAVAILABLE   | service temporarily unavailable (503)    | retry later            |
 *
 * PERMANENT (no retry)
 * | Type               | When it occurs                           | Default action         |
 * |--------------------|------------------------------------------|------------------------|
 * | USER_NOT_FOUND     | 404 (resource/user not found)            | stop                   |
 * | BAD_REQUEST        | 400 (invalid payload/query)              | report + stop          |
 * | UNAUTHORIZED       | 401 (auth failure)                       | report (fix config)    |
 * | FORBIDDEN          | 403 (access denied)                      | report                 |
 * | PARSE_ERROR        | invalid/unexpected response structure    | report                 |
 * | UNKNOWN_ERROR      | unclassified error                       | report                 |
 * 
 * Notes:
 * - Transport layer returns generic errors (e.g. NOT_FOUND)
 * - Service layer maps to domain-specific errors (e.g. USER_NOT_FOUND)
 * - retryable = true → safe to retry
 */
// the return type should be fixed
// for example return type should loook something like this:
// { data: {...}, error: null, status: 200 } 
// which supppose to be followed by all function like httserrorHandler, graphqlErrorHandler, POST, GET etc.

function httpErrorHandler({ status, data }) {
    if (status == null) {
        return {
            type: "NETWORK_ERROR",
            retryable: true,
            message: "Network failure or no response",
            source: { status: null, message: String(data || "No response") }
        }
    }

    if (status < 400) return null; // no error for successful responses

    const errorMap = {
        400: { type: "BAD_REQUEST", retryable: false, message: "Bad request - check query and variables" },
        401: { type: "UNAUTHORIZED", retryable: false, message: "Unauthorized - check credentials" },
        403: { type: "FORBIDDEN", retryable: false, message: "Forbidden - check access rights" },   
        404: { type: "NOT_FOUND", retryable: false, message: "not found - check username or repository name" },
        408: { type: "TIMEOUT", retryable: true, message: "Request timeout" },
        422: { type: "VALIDATION_ERROR", retryable: false, message: "Validation failed" },
        429: { type: "RATE_LIMITED", retryable: true, message: "Rate limited - retry after delay" },
        500: { type: "SERVER_ERROR", retryable: true, message: "Internal server error - retry later" },
        502: { type: "BAD_GATEWAY", retryable: true, message: "Bad gateway - retry later" },
        503: { type: "SERVICE_UNAVAILABLE", retryable: true, message: "Service unavailable - retry later" },
        504: { type: "GATEWAY_TIMEOUT", retryable: true, message: "Gateway timeout - retry later" },
    }

    let base = errorMap[status];

    if (!base) {
        if (status >= 500) {
            base = { type: "SERVER_ERROR", retryable: true, message: `UNKNOWN server error code: ${status}` };
        } else if (status >= 400) {
            base = { type: "CLIENT_ERROR", retryable: false, message: `UNKNOWN CLIENT error code: ${status}` };
        }else {
            base = { type: "UNKNOWN_ERROR", retryable: false, message: `An unknown error occurred error code: ${status}` };
        }
    }

    const message = data && typeof data === "object" 
        ? data?.message || data?.error || data?.error_description || null
        : data 
        ? String(data)
        : "No message provided";
    
    return { ... base, source: { 
        status: status, message: message }
    };
}


function graphqlErrorHandler({ data }){
    if (!data || !Array.isArray(data.errors) || data.errors.length === 0) {
        return null; // no error
    }
    if (data?.errors) {
        return {
            type: "BAD_REQUEST",
            retryable: false,
            source: {
                message: data.errors[0]?.message || "GraphQL error"
            }
        };
    }
    return null;
}

function createResponse(response) {
    return { data, error, status };
}

async function POST({ url, query, variables, headers = {} }) {
    try {
        const finalHeaders = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0",
            ...headers
        };
        const res = await axios.post(
            url,
            { query, variables },
            {
                headers: finalHeaders,
                timeout: 5000,
                validateStatus: () => true
            }
        );

        const httpError = httpErrorHandler({ 
            status: res.status,
             data: res.data 
        });

        if (httpError) {
            return createResponse({
                error: httpError,
                status: res.status,
            })
        }

        const graphqlError = graphqlErrorHandler({
            data: res.data
        });

        if (graphqlError) {
            return createResponse({
                error: graphqlError,
                status: res.status,
            })
        }

        return createResponse({
            data: res.data?.data ?? null,
            status: res.status
        });

    } catch (err) {
        return createResponse({
            error: {
                type: "NETWORK_ERROR",
                retryable: true,
                message: err.message || "Network error occurred",
            },
            status: null
        });
    }
}

async function GET({url, params = null}) {

    
}