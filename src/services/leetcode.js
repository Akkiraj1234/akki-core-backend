const { GET, POST } = require("../infrastructure")
const { CONFIG } = require("../config");
const { handleServiceError } = require("../utils.js");

const LEETCODE_API_ENDPOINT = CONFIG.leetcode.endpoint
const USERNAME = CONFIG.leetcode.username

// Things to fix
// 1. remove repeated logic
// 2. fetchLeetcodeHeatmapLastNYears add a argument name active user years to return only years with activity, and add a argument name baseYear to specify the base year for last N years calculation (default to current year)
// 3. fix formatLeetcodeHeatmap to use dict {date, data} to store heatmap and + array to itrate easily over each date
// 4. requests should handle all error documanted bellow

function _createSubmissionCalendarQuery(yearList = []) {
    /**
     * Build GraphQL query for LeetCode submission calendar by years.
     * @param {number[]} yearList - List of years (must not be empty)
     * @returns {string} GraphQL query string
     * @throws {Error} If yearList is empty
     */

    if (!yearList.length){
        throw new Error("yearList cannot be empty")
    }
    
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

    const result = [];

    for (const timestamp in parsed) {
        result.push({
            date: Math.floor(Number(timestamp) / 86400), //day level
            count: parsed[timestamp]
        });
    }

    return result;
}

async function LeetcodeProfileData({ username }) {
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
                acSubmissionNum { difficulty count }
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
                username: USERNAME ?? "unknown",
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
    
    if (!baseYear) { baseYear = new Date().getFullYear()}
    const years = Array.from( {length: lastNYears}, (_, idx) => baseYear - idx);
    const query = _createSubmissionCalendarQuery( years );
    
    const response = await POST({
        url: LEETCODE_API_ENDPOINT,
        data: { query, variables: { username, years } },
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
        data: { query, variables: { username, year } },
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
    "LeetcodeProfileData": {callable: LeetcodeProfileData, prioriy: "high", next_run: 3600},
    "fetchLeetcodeHeatmap": {callable: fetchLeetcodeHeatmap, prioriy: "high", next_run: 1800},
    "fetchLeetcodeHeatmapLastNYears": {callable: fetchLeetcodeHeatmapLastNYears, prioriy: "low", next_run: 1800},
}

module.exports = {
    worker_map
}

if (require.main === module) {
    main();
}
