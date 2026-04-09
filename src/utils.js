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


function isStreak(prev, curr) {
    if (prev === null) return false;
    const d1 = Math.floor(prev / 86400000);
    const d2 = Math.floor(curr / 86400000);
    return Math.abs(d2 - d1) === 1;
}

function formatHeatmap(heatmap = []) {
    /**
     * Formats raw heatmap data into a normalized yearly + global structure.
     *
     * ------------------------------------------------------------
     * Input:
     * ------------------------------------------------------------
     * heatmap: Array<{
     *   date: number (timestamp in ms),
     *   count: number
     * }>
     *
     * ------------------------------------------------------------
     * Output (Standard Format):
     * ------------------------------------------------------------
     * {
     *   years: {
     *     [year: string]: {
     *       heatmap: Array<{ date: number, count: number }>,
     *       currentStreak: number,
     *       longestStreak: number,
     *       totalActiveDays: number,
     *       totalContributions: number
     *     }
     *   },
     *   global: {
     *     currentStreak: number,
     *     longestStreak: number,
     *     totalActiveDays: number,
     *     totalContributions: number
     *   }
     * }
     *
     * ------------------------------------------------------------
     * Rules:
     * ------------------------------------------------------------
     * - Single pass processing (O(n))
     * - Ignores invalid entries (null, bad date, count <= 0)
     * - No duplicate handling (assumes input responsibility)
     * - No side effects
     * - Deterministic output
     */
    const years = {};

    const state = {
        currentYear: null,
        previousTime: null,

        year: {
            heatmap: [],
            currentStreak: 0,
            longestStreak: 0,
            totalActiveDays: 0,
            totalContributions: 0
        },

        global: {
            longestStreak: 0,
            totalActiveDays: 0,
            totalContributions: 0
        }
    };

    function finalizeYear() {
        const y = state.currentYear;
        if (y === null || state.year.totalContributions === 0) return;

        years[y] = { ...state.year };

        state.global.longestStreak = Math.max(
            state.global.longestStreak,
            state.year.longestStreak
        );

        state.global.totalActiveDays += state.year.totalActiveDays;
        state.global.totalContributions += state.year.totalContributions;
    }

    function resetYear(year) {
        state.currentYear = year;
        state.year = {
            heatmap: [],
            currentStreak: 0,
            longestStreak: 0,
            totalActiveDays: 0,
            totalContributions: 0
        };
        state.previousTime = null;
    }

    for (const item of heatmap) {
        const { date = null, count = 0 } = item ?? {};

        if (!date || count <= 0) continue;

        const year = new Date(date).getUTCFullYear();
        if (!year || Number.isNaN(year)) continue;

        if (state.currentYear !== year) {
            finalizeYear();
            resetYear(year);
        }

        // streak logic
        if (isStreak(state.previousTime, date)) {
            state.year.currentStreak += 1;
        } else {
            state.year.currentStreak = 1;
        }

        state.year.longestStreak = Math.max(
            state.year.longestStreak,
            state.year.currentStreak
        );

        // aggregation
        state.year.totalActiveDays += 1;
        state.year.totalContributions += count;

        state.year.heatmap.push({ date, count });

        state.previousTime = date;
    }

    // finalize last year
    finalizeYear();

    return {
        years,
        global: {
            currentStreak: state.year.currentStreak,
            longestStreak: state.global.longestStreak,
            totalActiveDays: state.global.totalActiveDays,
            totalContributions: state.global.totalContributions
        }
    };
}

module.exports = {
    sanitize,
    createResponse,
    handleServiceError,
    ERROR_TYPES,
    formatHeatmap
};


if (require.main === module) {
    const exampleInput = [
        { date: 1356998400000, count: 5 },  // 2013-01-01
        { date: 1357084800000, count: 3 },  // 2013-01-02
        { date: 1357171200000, count: 2 },  // 2013-01-03
        { date: 1357603200000, count: 4 },  // 2013-01-08
        { date: 1357689600000, count: 0 },  // 2013-01-09
        { date: 1357344000000, count: 1 },  // 2013-01-05
        { date: "invalid-date", count: 3 }, // invalid
        null,                               // null entry
        { date: 1357776000000 },            // 2013-01-10 (missing count)
        { date: 1357862400000, count: -5 }, // 2013-01-11 (negative scount)
        { date: 1388534400000, count: 4 },  // 2014-01-01
        { date: 1388620800000, count: 1 },  // 2014-01-02
        { date: 1388707200000, count: 1 },  // 2014-01-03
    ];

    console.log(
        JSON.stringify(
            formatHeatmap(exampleInput),
            null,
            2
        )
    );
}