const { formatHeatmap, handleServiceError } = require("../utils.js");
const { POST } = require("../infrastructure")
const { createConfigNotError, createMissingRequiredInputError } = require("../error.js");

// config
const LEETCODE_API_ENDPOINT = CONFIG.leetcode.endpoint
const USERNAME = CONFIG.leetcode.username

// Thing i am fixing 
// 1. code structure and readability
// 2. heatmap data always using formatHeatmap
// 3. function should not take input from global scope must use default value.

// Things to fix
// 1. fetchLeetcodeHeatmapLastNYears add a argument name active user years to return only years with activity, and add a argument name baseYear to specify the base year for last N years calculation (default to current year)


function _createSubmissionCalendarQuery(yearList = []) {
    /**
     * Builds a GraphQL query to fetch LeetCode submission calendar data
     * for multiple years in a single request.
     */
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


function formatLeetcodeHeatmap(data) {
    /**
     * Format LeetCode submission calendar into heatmap data.
     * @param {any} data
     * @returns {any[]}
     */
    if (!data) return [];

    const parsed = typeof data === "string" 
        ? JSON.parse(data) 
        : data;

    const dayCountMap = new Map();

    for (const timestamp in parsed) {
        const dayIndex = Math.floor(Number(timestamp) / 86400);
        const count = Number(parsed[timestamp]) || 0;

        if (!Number.isFinite(dayIndex)) continue;
        dayCountMap.set(dayIndex, (dayCountMap.get(dayIndex) ?? 0) + count);
    }

    return Array.from(dayCountMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date - b.date);
}

async function LeetcodeProfileData() {
    /**
     * Fetch LeetCode profile stats (solved vs total by difficulty).
     * @param {string} username
     * @returns {Promise<{
     *   username: string,
     *   solved: { easy: number, medium: number, hard: number },
     *   total: { easy: number, medium: number, hard: number }
     * }>}
     */

    const query = `
    query getUserProfile($username: String!) {
        matchedUser(username: $username){ 
            submitStats{
                acSubmissionNum { dfifficulty count }
            }
        }
        allQuestionsCount {difficulty count}
    }`;

    const response = await POST({
        url: LEETCODE_API_ENDPOINT,
        data: { query, variables: { username } },
        headers: {"Referer": "https://leetcode.com"}
    });

    return handleServiceError({
        response,
        format: (data) => {
            const payload = data?.data;
            const userStats = payload?.matchedUser?.submitStats?.acSubmissionNum ?? [];
            const totalStats = payload?.allQuestionsCount ?? [];

             const getCount = (arr, diff) => {
                return arr.find(x => x.difficulty === diff)?.count || 0;
            };

            return {
                username: username ?? USERNAME ?? "unknown",
                solved: {
                    easy: getCount(userStats, "Easy"),
                    medium: getCount(userStats, "Medium"),
                    hard: getCount(userStats, "Hard"),
                },
                total: {
                    easy: getCount(totalStats, "Easy"),
                    medium: getCount(totalStats, "Medium"),
                    hard: getCount(totalStats, "Hard")
                }
            }
        }
    });
}

async function fetchLeetcodeHeatmapLastNYears({ username, lastNYears = 10, baseYear = null}) {
    /**
     * Fetch LeetCode heatmap for last N years.
     * 
     * @param {Object} params
     * @param {string} params.username
     * @param {number} [params.lastNYears=10]
     * @param {number} [params.baseYear]
     * 
     * @returns {Promise<{
     *   availableYears: number[],
     *   calendar: Record<string, {
     *     streak: number,
     *     totalActiveDays: number,
     *     heatmap: any[]
     *   }>
     * }>}
     */
    
    const selectedUsername = username ?? USERNAME;
    if (!baseYear) { baseYear = new Date().getFullYear()}
    const effectiveYears = Math.max(1, Number(lastNYears) || 1);
    const years = Array.from({ length: effectiveYears }, (_, idx) => baseYear - idx);
    const query = _createSubmissionCalendarQuery( years );
    
    const response = await POST({
        url: LEETCODE_API_ENDPOINT,
        data: { query, variables: { username: selectedUsername, years } },
        headers: {"Referer": "https://leetcode.com"}
    });

    return handleServiceError({
        response,
        format: (data) => {
            const payload = data?.data;
            const matchedUser = payload?.matchedUser;
            
            const result = {
                availableYears: years,
                calendar: {}
            }

            for (const year of years) {
                const yearData = matchedUser?.[`year${year}`] ?? {};
                result.calendar[year] = {
                    streak: yearData.streak ?? 0,
                    totalActiveDays: yearData.totalActiveDays ?? 0,
                    heatmap: formatLeetcodeHeatmap(yearData.submissionCalendar)
                }
            }
            return result;
        }
    });
}

async function fetchLeetcodeHeatmap({ username, year = null }) {
    /**
     * Fetch LeetCode heatmap data for a specific year.
     *
     * @param {Object} params
     * @param {string} params.username
     * @param {number} [params.year] - Defaults to current year
     *
     * @returns {Promise<{
     *   activeYears: number[],
     *   availableYears: number[],
     *   calendar: Record<string, {
     *     streak: number,
     *     totalActiveDays: number,
     *     heatmap: any[]
     *   }>
     * }>}
     */

    const selectedUsername = username ?? USERNAME;
    if (year === null) {year = new Date().getFullYear()}

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

    const response = await POST({
        url: LEETCODE_API_ENDPOINT,
        data: { query, variables: { username: selectedUsername, year } },
        headers: {"Referer": "https://leetcode.com"}
    });

    return handleServiceError({
        response,
        format: (data) => {
            const payload = data?.data;
            const userCalendar = payload?.matchedUser?.userCalendar ?? {};

            return {
                activeYears: userCalendar.activeYears ?? [],
                availableYears: [year],
                calendar: {
                    [year]: {
                        streak: userCalendar.streak ?? 0,
                        totalActiveDays: userCalendar.totalActiveDays ?? 0,
                        heatmap: formatLeetcodeHeatmap(userCalendar.submissionCalendar)
                    }
                }
            }
        }
    });
}

async function main() {
    const data = await Promise.all([
        LeetcodeProfileData({ username: CONFIG.leetcode.username }),
        fetchLeetcodeHeatmapLastNYears({ username: CONFIG.leetcode.username, lastNYears: 5 }),
        fetchLeetcodeHeatmap({ username: CONFIG.leetcode.username })
    ]);
    data.forEach((res) => {
        console.dir(
            res?.error?.error ? `No data found ${JSON.stringify(res.error)}`: res, 
            { depth: null })
    });
}

// id : {callable, prioriy, nextrun:ms}
const worker_map = {
    "LeetcodeProfileData": {
        callable: LeetcodeProfileData,
        key: "leetcode.profile",
        priority: "high",
        next_run: 2 * 3600 * 1000
    },
    "fetchLeetcodeHeatmap": {
        callable: fetchLeetcodeHeatmap,
        key: "leetcode.heatmap.current",
        priority: "high",
        next_run: 1800 * 1000
    },
    "fetchLeetcodeHeatmapLastNYears": {
        callable: fetchLeetcodeHeatmapLastNYears,
        key: "leetcode.heatmap.history",
        priority: "low",
        next_run: 24 * 3600 * 1000
    },
}

module.exports = {
    worker_map
}

if (require.main === module) {
    main();
}
