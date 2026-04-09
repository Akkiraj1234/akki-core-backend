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
// make sure input dont have invalid date, count and also handle null or undefined input
// also make sure output heatmap only have date and count and also sort by date in ascending order
// and also no dubplicate date in the input 
// suppose to follow accseding order


function isStreak({time1, time2}){
    const day1 = Math.floor(time1 / 86400000);
    const day2 = Math.floor(time2 / 86400000);
    const diff = Math.abs( day2 - day1 );
    
    return diff === 1; // we will never get same day
}

function formatHeatmap(heatmap) {
    let globalLongestStreak = 0;
    let globalTotalActiveDays = 0;
    let globalTotalContributions = 0;

    let longestStreak = 0;
    let totalActiveDays = 0;
    let totalContributions = 0;

    let currentStreak = 0;
    let previousTime = null;
    let currentYear = null;
    let heatmapData = [];
    const years = {};

    for (const item of heatmap) {

        // safety check for input data
        const { date = null, count = 0 } = item ?? {};
        if ( date === null || count <= 0 ) continue; // count less then 0 consider invalid data
        const year = new Date(date).getUTCFullYear();
        if (!year || Number.isNaN(year)) continue;


        if ( currentYear === null || currentYear !== year ) {
            
            // if data is more then 0 then only add data
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
            heatmapData = [];
            
            currentStreak = 1;
            longestStreak = 1;
            totalActiveDays = 0;
            totalContributions = 0;
        }
        if (isStreak({time1: previousTime, time2: date})) {
            currentStreak += 1;
            longestStreak = Math.max(longestStreak, currentStreak);
        }
        else {
            currentStreak = 1;
        }
        previousTime = date;
        totalContributions += count;
        totalActiveDays += 1;
        if (count > 0) { 
            heatmapData.push({ date, count })
        }
    }
    if (totalContributions > 0) {
        years[currentYear] = {
            heatmap: heatmapData,
            currentStreak,
            longestStreak,
            totalActiveDays,
            totalContributions
        }
    }
    globalLongestStreak = Math.max(globalLongestStreak, longestStreak);
    globalTotalActiveDays += totalActiveDays;
    globalTotalContributions += totalContributions;

    return {
        ... years,
        meta: {
            currentStreak: currentStreak,
            longestStreak: globalLongestStreak,
            totalActiveDays: globalTotalActiveDays,
            totalContributions: globalTotalContributions
        }
    }
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