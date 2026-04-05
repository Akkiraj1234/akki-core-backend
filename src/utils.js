const REDACTED = "[REDACTED]";
const MAX_STRING_PREVIEW = 200;
const MAX_DEPTH = 8;

const SENSITIVE_KEY_PATTERNS = [
    "authorization",
    "proxy-authorization",
    "x-api-key",
    "api-key",
    "apikey",
    "token",
    "access_token",
    "refresh_token",
    "id_token",
    "secret",
    "client_secret",
    "password",
    "passwd",
    "cookie",
    "set-cookie",
    "session",
    "jwt"
];

function shouldRedactKey(key) {
    const normalized = String(key).toLowerCase();
    return SENSITIVE_KEY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function sanitizeAuthValue(value) {
    if (typeof value !== "string") return REDACTED;
    const trimmed = value.trim();

    if (/^bearer\s+/i.test(trimmed)) return "Bearer [REDACTED]";
    if (/^basic\s+/i.test(trimmed)) return "Basic [REDACTED]";
    return REDACTED;
}

function sanitizeString(value) {
    if (value.length <= MAX_STRING_PREVIEW) return value;
    return `${value.slice(0, MAX_STRING_PREVIEW)}...[TRUNCATED]`;
}

function sanitizeValue(value, depth, seen) {
    if (value === null || value === undefined) return value;

    const valueType = typeof value;
    if (valueType === "number" || valueType === "boolean" || valueType === "bigint") return value;
    if (valueType === "symbol") return value.toString();
    if (valueType === "string") return sanitizeString(value);
    if (valueType === "function") return "[Function]";

    if (depth >= MAX_DEPTH) return "[MAX_DEPTH]";

    if (seen.has(value)) return "[Circular]";
    seen.add(value);

    if (Array.isArray(value)) {
        return value.map((item) => sanitizeValue(item, depth + 1, seen));
    }

    if (value instanceof Date) return value.toISOString();
    if (Buffer.isBuffer(value)) return `[Buffer length=${value.length}]`;
    if (value instanceof Error) {
        return {
            name: value.name,
            message: sanitizeString(value.message || ""),
            stack: typeof value.stack === "string" ? sanitizeString(value.stack) : null
        };
    }

    const out = {};
    for (const [rawKey, rawVal] of Object.entries(value)) {
        const key = String(rawKey);
        if (shouldRedactKey(key)) {
            out[key] = key.toLowerCase().includes("authorization")
                ? sanitizeAuthValue(rawVal)
                : REDACTED;
        } else {
            out[key] = sanitizeValue(rawVal, depth + 1, seen);
        }
    }
    return out;
}

function sanitize(input) {
    return sanitizeValue(input, 0, new WeakSet());
}

const ERROR_TYPES = Object.freeze({
    NETWORK_FAILURE: "NETWORK_FAILURE",
    SERVER_FAILURE: "SERVER_FAILURE",
    RATE_LIMITED: "RATE_LIMITED",
    TEMPORARY_UNAVAILABLE: "TEMPORARY_UNAVAILABLE",
    TIMEOUT: "TIMEOUT",

    NOT_FOUND: "NOT_FOUND",
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    BAD_REQUEST: "BAD_REQUEST",
    VALIDATION_FAILED: "VALIDATION_FAILED",

    PARSE_FAILURE: "PARSE_FAILURE",
    UNKNOWN_FAILURE: "UNKNOWN_FAILURE"
});

function createResponse({ data = null, error = null, code = null }) {
    return { data, error, code };
}

function handleServiceError({ response, format }) {
    if (response.error) {
        return createResponse({
            data: {},
            error: response.error,
            code: response.code
        });
    }
    
    return createResponse({
        data: format(response.data),
        error: response.error,
        code: response.code
    });
}

module.exports = {
    sanitize,
    createResponse,
    handleServiceError,
    ERROR_TYPES
};
