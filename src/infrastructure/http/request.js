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


function httpsErrorHandler(status, data) {
    const errorMap = {
        400: { type: "BAD_REQUEST", retryable: false, message: "Bad request - check query and variables" },
        401: { type: "UNAUTHORIZED", retryable: false, message: "Unauthorized - check credentials" },
        403: { type: "FORBIDDEN", retryable: false, message: "Forbidden - check access rights" },   
        404: { type: "NOT_FOUND", retryable: false, message: "not found - check username or repository name" },
        429: { type: "RATE_LIMITED", retryable: true, message: "Rate limited - retry after delay" },
        500: { type: "SERVER_ERROR", retryable: true, message: "Internal server error - retry later" },
        502: { type: "BAD_GATEWAY", retryable: true, message: "Bad gateway - retry later" },
        503: { type: "SERVICE_UNAVAILABLE", retryable: true, message: "Service unavailable - retry later" },
    }

    let base = errorMap[status];

    if (!base) {
        if (status >= 500) {
            base = { type: "SERVER_ERROR", retryable: true, message: `UNKNOWN server error` };
        } else if (status >= 400) {
            base = { type: "BAD_REQUEST", retryable: false, message: `UNKNOWN Bad request` };
        }else {
            base = { type: "UNKNOWN_ERROR", retryable: false, message: "An unknown error occurred" };
        }
    }

    const message = typeof data === "object" 
        ? data?.message || null
        : data ? String(data):  "No message provided";

    return { ... base, 
        source: { status: status, message: message }
    };
}


async function POST({ url, query, variables, headers = {} }) {
    try {
        const finalHeaders = {
            "Content-Type": "application/json",
            "Referer": "https://leetcode.com",
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
        // console.log(`Leetcode API response status: ${res.status}`);
        // console.log(`Leetcode API response data: ${JSON.stringify(res.data)}`);

        // HTTP errors
        if (res.status === 429) {
            return { error: { type: "RATE_LIMITED", retryable: true } };
        }

        if (res.status >= 500) {
            return { error: { type: "SERVER_ERROR", retryable: true } };
        }

        if (res.status >= 400) {
            return { error: { type: "BAD_REQUEST", retryable: false } };
        }

        // GraphQL errors
        if (res.data.errors) {
            return { error: { type: "BAD_REQUEST", retryable: false } };
        }
        return { data: res.data.data };

    } catch (err) {
        return { error: { type: "NETWORK_ERROR", retryable: true } };
    }
}

async function GET({url, params = null}) {

    
}