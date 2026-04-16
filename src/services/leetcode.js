const { formatHeatmap, handleServiceError } = require("../utils");
const { POST } = require("../infrastructure");
const {
    createConfigNotFoundError,
    createMissingInputError
} = require("../error");

const LEETCODE_API_ENDPOINT = "https://leetcode.com/graphql";
const LEETCODE_HEADERS = { "Referer": "https://leetcode.com" };


/**
 * Build GraphQL query for multiple yearly calendars.
 *
 * ---
 * **Input**
 * ```js
 * yearList: number[]
 * ```
 *
 * **Output**
 * ```js
 * string (GraphQL query)
 * ```
 *
 * **Rules**
 * - generates dynamic aliases: year{YYYY}
 * - empty list returns minimal query
 */
function _createSubmissionCalendarQuery(yearList = []) {
    const yearQueries = yearList.map(year => `
        year${year}: userCalendar(year: ${year}) {
            submissionCalendar
            totalActiveDays
            streak
        }`
    ).join("\n");

    return `query getUserProfile($username: String!) {
        matchedUser(username: $username) {
            ${yearQueries}
        }
    }`
}


/**
 * Combine yearly submission calendars into a single heatmap array.
 *
 * ---
 * **Input**
 * ```js
 * {
 *   years: number[],
 *   matchedUser: object
 * }
 * ```
 *
 * **Output**
 * ```js
 * Array<{ date: number, count: number }>
 * ```
 *
 * **Rules**
 * - skips missing or invalid yearly data
 * - safely parses submissionCalendar (JSON)
 * - converts timestamps to milliseconds
 */
function combineHeatmaps(years = [], matchedUser = {}) {
    const combined = [];

    for (let i = 0; i < years.length; i++) {
        const yearData = matchedUser["year" + years[i]];
        if (!yearData) continue;

        let parsed = yearData.submissionCalendar;
        if (!parsed) continue;

        if (typeof parsed === "string") {
            try {
                parsed = JSON.parse(parsed);
            } catch {
                continue;
            }
        }

        for (const ts in parsed) {
            combined.push({
                date: ts * 1000,   
                count: parsed[ts] | 0 
            });
        }
    }

    return combined;
}

/**
 * Normalize stats array into difficulty counts.
 *
 * ---
 * **Input**
 * ```js
 * [{ difficulty: string, count: number }]
 * ```
 *
 * **Output**
 * ```js
 * { easy: number, medium: number, hard: number }
 * ```
 *
 * **Rules**
 * - ignores invalid entries
 * - defaults missing values to 0
 */
function getData(stats = []) {
    
    const output = { easy: 0, medium: 0, hard: 0 };

    for (const item of stats) {
        const { difficulty, count } = item ?? {};
        if (!difficulty) continue;
        output[difficulty] = count;
    }

    return {
        easy: output["Easy"] || 0,
        medium: output["Medium"] || 0,
        hard: output["Hard"] || 0
    }
};

/**
 * Fetches LeetCode stats (solved vs total by difficulty).
 *
 * ---
 * **Input**
 * ```js
 * { username: string }
 * ```
 *
 * **Output (ServiceResponse)**
 * ```js
 * {
 *   data: {
 *     username: string,
 *     solved: { easy, medium, hard },
 *     total:  { easy, medium, hard }
 *   },
 *   error,
 *   code
 * }
 * ```
 *
 * **Rules**
 * - username is required
 * - defaults missing values to 0
 * - uses POST + handleServiceError
 */
async function LeetcodeProfileData({ username }) {

    const query = `
    query getUserProfile($username: String!) {
        matchedUser(username: $username){ 
            submitStats{
                acSubmissionNum { difficulty count }
            }
        }
        allQuestionsCount {difficulty count}
    }`;
    
    if (!username) return createMissingInputError({ 
        field: "username", service: "LeetcodeProfileData" 
    });

    const response = await POST({
        url: LEETCODE_API_ENDPOINT,
        data: { query, variables: { username } },
        headers: LEETCODE_HEADERS
    });

    return handleServiceError({
        response,
        format: (data) => {
            const payload = data?.data;

            return {
                username,
                solved: getData(payload?.matchedUser?.submitStats?.acSubmissionNum),
                total: getData(payload?.allQuestionsCount)
            }

        }
    });
}


/**
 * Fetch LeetCode heatmap for last N years.
 *
 * ---
 * **Input**
 * ```js
 * {
 *   username: string,
 *   lastNYears?: number,   // default: 10
 *   baseYear?: number      // default: current year
 * }
 * ```
 *
 * **Output**
 * ```js
 * {
 *   availableYears: number[],
 *   calendar: {
 *     [year]: {
 *       streak: number,
 *       totalActiveDays: number,
 *       heatmap: Array
 *     }
 *   }
 * }
 * ```
 *
 * **Rules**
 * - lastNYears is normalized to >= 1
 * - baseYear defaults to current year
 * - missing values default to 0
 * - uses POST + handleServiceError
 */
async function fetchLeetcodeHeatmapLastNYears({ username, lastNYears = 10, baseYear = null}) {

    if (!username) return createMissingInputError({ 
        field: "username", service: "LeetcodeProfileData" 
    });
    if (baseYear === null) { baseYear = new Date().getFullYear() }
    const effectiveYears = Math.max(1, Number(lastNYears) || 1);
    const years = Array.from({ length: effectiveYears }, (_, idx) => baseYear - idx);
    const query = _createSubmissionCalendarQuery( years );
    
    const response = await POST({
        url: LEETCODE_API_ENDPOINT,
        data: { query, variables: { username } },
        headers: LEETCODE_HEADERS
    });

    return handleServiceError({
        response,
        format: (data) => {
            const payload = data?.data;
            const matchedUser = payload?.matchedUser;
            return formatHeatmap(
                combineHeatmaps(years, matchedUser)
            );
        }
    });
}

/**
 * @deprecated
 *
 * This function is deprecated and should NOT be used in new code.
 *
 * Reason:
 * - LeetCode `submissionCalendar` returns mixed data across years
 * - This function does NOT strictly enforce year filtering
 * - Leads to inconsistent and misleading results
 * - Replaced by `fetchLeetcodeHeatmapLastNYears` (use `lastNYears: 1`)
 *
 * ---
 * Recommended replacement:
 * ```js
 * fetchLeetcodeHeatmapLastNYears({
 *   username,
 *   lastNYears: 1,
 *   baseYear: year
 * });
 * ```
 *
 * ---
 * Input:
 * {
 *   username: string,
 *   year?: number // default: current year (not strictly enforced)
 * }
 *
 * ---
 * Actual Behavior:
 * - Fetches submission data that may include multiple years
 * - Does NOT filter data strictly by `year`
 * - Output may contain multiple years
 *
 * ---
 * Output:
 * {
 *   activeYears: number[],
 *   calendar: {
 *     years: {
 *       [year]: {
 *         heatmap: Array,
 *         currentStreak: number,
 *         longestStreak: number,
 *         totalActiveDays: number,
 *         totalContributions: number
 *       }
 *     },
 *     global: {
 *       currentStreak: number,
 *       longestStreak: number,
 *       totalActiveDays: number,
 *       totalContributions: number
 *     }
 *   }
 * }
 */
async function fetchLeetcodeHeatmap({ username, year = null }) {

    const query = `
    query userProfileCalendar($username: String!, $year: Int){
        matchedUser(username: $username) {
            userCalendar(year: $year) {
                activeYears
                streak
                totalActiveDays
                submissionCalendar
            }
        }
    }`;

    if (!username) return createMissingInputError({ 
        field: "username", service: "LeetcodeProfileData" 
    });

    if (year === null) { year = new Date().getFullYear()}
    const response = await POST({
        url: LEETCODE_API_ENDPOINT,
        data: { query, variables: { username } },
        headers: LEETCODE_HEADERS
    });

    return handleServiceError({
        response,
        format: (data) => {

            const payload = data?.data;
            const userCalendar = payload?.matchedUser?.userCalendar ?? {};
            const parsed = JSON.parse(userCalendar.submissionCalendar || "{}");
            const combined = [];

            for (const ts in parsed) {
                combined.push({ 
                    date: ts * 1000,
                    count: parsed[ts] | 0
                });
            }

            return {
                activeYears: userCalendar.activeYears ?? [],
                calendar: formatHeatmap( combined )
            }
        }
    });
}


const worker_map = {
    initFunc: null,
    configKey: "services.leetcode.config",
    services: {
        "LeetcodeProfileData": {
            callable: LeetcodeProfileData,
            key: "leetcode.profile",
            priority: "high",
            next_run: 2 * 3600 * 1000
        },
        "fetchLeetcodeHeatmapLastNYears": {
            callable: fetchLeetcodeHeatmapLastNYears,
            key: "leetcode.heatmap.history",
            priority: "medium",
            next_run: 24 * 3600 * 1000
        },
    }
}

module.exports = {
    worker_map
}

if (require.main === module) {
    const { runServices } = require("../utils")
    runServices( worker_map )
}