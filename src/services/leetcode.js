const { GET, POST } = require("../infrastructure")
const { CONFIG } = require("../config");
const LEETCODE_API_ENDPOINT = CONFIG.leetcode.endpoint
const USERNAME = CONFIG.leetcode.username

// Things to fix
// 1. remove repeated logic
// 2. fetchLeetcodeHeatmapLastNYears add a argument name active user years to return only years with activity, and add a argument name baseYear to specify the base year for last N years calculation (default to current year)
// 3. fix formatLeetcodeHeatmap to use dict {date, data} to store heatmap and + array to itrate easily over each date
// 4. requests should handle all error documanted bellow


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

    const res = await POST({
        url: LEETCODE_API_ENDPOINT,
        query: query,
        variables: { username },
        headers: {"Referer": "https://leetcode.com"}
    });

    if (res.error) return res.error;
    const userStats = res.data.matchedUser.submitStats.acSubmissionNum;
    const totalStats = res.data.allQuestionsCount;

    const getCount = (arr, diff) => {
        return arr.find(x => x.difficulty === diff)?.count || 0;
    };

    return {
        username: username,
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
    };
}


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

    const parsed = typeof data === "string" ? JSON.parse(data) : data;

    const result = [];

    for (const timestamp in parsed) {
        result.push({
            date: new Date(Number(timestamp) * 1000)
                .toISOString()
                .split("T")[0],
            count: parsed[timestamp]
        });
    }

    return result;
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

    const res = await POST({
        url: LEETCODE_API_ENDPOINT,
        query: query,
        variables: { username, years},
        headers: {"Referer": "https://leetcode.com"}
    });

    if (res?.error) return res.error;
    const data = res.data.matchedUser;

    const result = { 
        availableYears: years,
        calendar: {}
    };

    for (const year of years) {
        const yearData = data[`year${year}`] ?? {}
        
        result.calendar[year] = {
            streak: yearData.streak ?? 0,
            totalActiveDays: yearData.totalActiveDays ?? 0,
            heatmap: yearData.submissionCalendar 
                ? formatLeetcodeHeatmap(yearData.submissionCalendar)
                : []
        }
    }
    return result;
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

    const res = await POST({
        url: LEETCODE_API_ENDPOINT,
        query: query,
        variables: { username, year },
        headers: {"Referer": "https://leetcode.com"}
    });

    // safe search
    if (res?.error) return res.error;
    const data = res.data.matchedUser.userCalendar ?? {};

    return { 
        activeYears: data.activeYears,
        availableYears: [year],
        calendar: {
            [year]: {
                streak: data.streak ?? 0,
                totalActiveDays: data.totalActiveDays ?? 0,
                heatmap: data.submissionCalendar
                    ? formatLeetcodeHeatmap(data.submissionCalendar)
                    : []
            }
        }
    };
}


class Worker{
    constructor({ cacheStorage }) {
        this.cacheStorage = cacheStorage;
        // orbit only give read only instance of cacheStorage
    }

    async run() {
        const [, last_sync] = await this.cacheStorage.get("LeetcodeProfileData") ?? [null, null];
        const [, last_sync_heatmap] = await this.cacheStorage.get("fetchLeetcodeHeatmapLastNYears") ?? [null, null];
        const [, last_sync_heatmap_year] = await this.cacheStorage.get("fetchLeetcodeHeatmap") ?? [null, null];
    }

    async hardRun() {
        // run without time stamp check, force update
    }

    async close() {
        // shutdown eveything
        // and save stuff if needed
    }
} 

module.exports = {
    Worker
}

async function main() {
    const data1 = await LeetcodeProfileData({ username: CONFIG.leetcode.username });
    const data2 = await fetchLeetcodeHeatmapLastNYears({ username: CONFIG.leetcode.username, lastNYears: 5 });
    const data3 = await fetchLeetcodeHeatmap({ username: CONFIG.leetcode.username });

    console.dir(data1?.error ? `No data found ${JSON.stringify(data1.error)}`: data1, { depth: null });
    console.dir(data2?.error ? `No data found ${JSON.stringify(data2.error)}`: data2, { depth: null });
    console.dir(data3?.error ? `No data found ${JSON.stringify(data3.error)}` : data3, { depth: null });
}

if (require.main === module) {
    main();
}

