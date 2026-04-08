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
// return data in format follow docs.service.service.md[11.5 Heatmap Format (Standard)]
// {
//   "heatmap": {
//     "years": {
//       "2012": {
//         "heatmap": [
//           { "ts": 1356998400000, "count": 12 }
//         ],
//         "currentStreak": 5,
//         "longestStreak": 10,
//         "totalActiveDays": 40,
//         "totalContributions": 300,
//       }
//     },
//     "global": {
//       "currentStreak": 8,
//       "longestStreak": 20,
//       "totalActiveDays": 100,
//       "totalContributions": 300,
//     }
//   }
// }
// 
// take input as 
// heatmap: [
//   { date: 1356998400000, count: 5 },
//   { date: 1357084800000, count: 3 }
// ]

function isStreak({time1, time2}){
    const day1 = Math.floor(time1 / 86400000);
    const day2 = Math.floor(time2 / 86400000);
    const diff = Math.abs( day2 - day1 );
    
    return diff === 1; // we will never get same day
}

function createHeatmapDataFormate(heatmap) {
    let globalLongestStreak = 0;
    let globalTotalActiveDays = 0;
    let globalTotalContributions = 0;

    let longestStreak = 0;
    let totalActiveDays = 0;
    let totalContributions = 0;

    let currentYear = null;
    let currentStreak = 0;
    let previousTime = null;
    const years = {};
    let heatmapData = [];

    for (const {date, count} of heatmap) {
        const year = new Date(date).getUTCFullYear();
        
        if (currentYear === null || currentYear !== year) {
            
            if (totalContributions > 0) {
                years[currentYear] = {
                    heatmap: heatmapData,
                    currentStreak,
                    longestStreak,
                    totalActiveDays,
                    totalContributions
                }
            }
            currentYear = year;
            globalLongestStreak = Math.max(globalLongestStreak, longestStreak);
            globalTotalActiveDays += totalActiveDays;
            globalTotalContributions += totalContributions;
            currentStreak = 1;
            longestStreak = 1;
            totalActiveDays = 1;
            totalContributions = 0;
            heatmapData = [];
        }
        if (isStreak({time1: previousTime, time2: date})) {
            currentStreak += 1;
            longestStreak = Math.max(longestStreak, currentStreak);
        }
        else {
            currentStreak = 0;
        }
        previousTime = date;
        totalContributions += count;
        totalActiveDays += 1;
        if (count > 0) { 
            heatmapData.push({ date, count })
        }
    }
}
function createHeatmapDataFormate(heatmap) {
    const data = {
        years: {},
        global: {
            currentStreak: 0,
            longestStreak: 0,
            totalActiveDays: 0,
            totalContributions: 0
        }
    }
    let currentYear = null;
    let currentStreak = 0;
    let longestStreak = 0;
    let totalActiveDays = 0;
    let totalContributions = 0;
    let previousTime = 0;

    for (const {time, count} of heatmap) {
        const year = d.getUTCFullYear(time)
        if (!currentYear || currentYear != year){
            data.years[year] = {
                currentStreak: currentStreak,
                longestStreak: longestStreak,
                totalActiveDays: totalActiveDays,
                totalContributions: totalContributions
            }
        }
        if (isStreak(previousTime, time)) {
            currentStreak += 1;

            if (currentStreak >= longestStreak) {
                longestStreak = currentStreak
            }
        }
        else {
            currentStreak = 0;
        }
        previousTime = time;
        totalContributions += count
        totalActiveDays += 1;
    }
}

module.exports = {
    sanitize,
    createResponse,
    handleServiceError,
    ERROR_TYPES
};
