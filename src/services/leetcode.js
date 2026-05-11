const { formatHeatmap, handleServiceError, PRIORITY } = require("../utils");
const { POST, GET } = require("../infrastructure");
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
        const key = difficulty.toLowerCase();
        if (key in output) {
            output[key] = count ?? 0;
        }
    }

    return output;
}

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
 *     profileUrl: string,
 *     avatar: string,
 *     bio: string,
 *     totalViews: number,
 *     ranking: number,
 *     reputation: number,
 *     starRating: number,
 *     contestBadge: any,
 *     followers: number,
 *     following: number
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
        matchedUser(username: $username) { 

            contestBadge{
                name
                expired,
                hoverText,
                icon
            }
            profile {
                userAvatar
                aboutMe
                ranking
                reputation
                starRating
                postViewCount
            }
        }
        
        followers(userSlug: $username) {
            allNum
        }
        following(userSlug: $username) {
            allNum
        }
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
            const matchedUser = payload?.matchedUser;
            const profileData = matchedUser?.profile

            return {
                username,
                profileUrl: `https://leetcode.com/u/${username}/`,
                avatar: profileData?.userAvatar ?? "",
                bio: profileData?.aboutMe ?? "",
                totalViews: profileData?.postViewCount ?? 0,
                ranking: profileData?.ranking ?? 0,
                reputation: profileData?.reputation ?? 0,
                starRating: profileData?.starRating ?? 0,
                contestBadge: matchedUser?.contestBadge ?? null,
                followers: payload?.followers?.allNum ?? 0,
                following: payload?.following?.allNum ?? 0
            }

        }
    });
}


/**
 * Fetches normalized LeetCode submission statistics.
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
 *
 *     submission: {
 *       solved: {
 *         easy: number,
 *         medium: number,
 *         hard: number
 *       },
 *
 *       failed: {
 *         easy: number,
 *         medium: number,
 *         hard: number
 *       },
 *
 *       untouched: {
 *         easy: number,
 *         medium: number,
 *         hard: number
 *       },
 *
 *       total: {
 *         easy: number,
 *         medium: number,
 *         hard: number
 *       }
 *     },
 *
 *     languageProblemCount: [
 *       {
 *         languageName: string,
 *         problemsSolved: number
 *       }
 *     ]
 *   },
 *   error,
 *   code
 * }
 * ```
 *
 * **Rules**
 * - username is required
 * - missing values default to 0
 * - invalid difficulty entries are ignored safely
 * - response is normalized for frontend usage
 * - uses POST + handleServiceError
 */
async function LeetcodeSubmissionData({ username }) {
    
    // OLD SYSTEM TO RETRIEVE DATA
    // const query = `
    // query getUserProfile($username: String!) {
    //     matchedUser(username: $username) {
    //         username,

    //         submitStats{
    //             acSubmissionNum { 
    //                 difficulty 
    //                 count 
    //             }
    //         }

    //     }
    //     languageProblemCount {
    //         languageName
    //         problemsSolved
    //     }
    //     allQuestionsCount {
    //         difficulty 
    //         count
    //     }
    // }`

    const query = `
    query getUserProfile($username: String!) {

        userProfileUserQuestionProgressV2(userSlug: $username){
            numAcceptedQuestions {
                count
                difficulty
            }
            numFailedQuestions {
                count
                difficulty
            }
            numUntouchedQuestions {
                count
                difficulty
            }
        }
        
        allQuestionsCount {
            difficulty 
            count
        }

        matchedUser(username: $username){
            languageProblemCount {
                languageName
                problemsSolved

            }
        }

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
            const submissionV2 = payload?.userProfileUserQuestionProgressV2

            return {
                username,
                submission: {
                    solved: getData(submissionV2?.numAcceptedQuestions ?? {}),
                    failed: getData(submissionV2?.numFailedQuestions ?? {}),
                    untouched: getData(submissionV2?.numUntouchedQuestions ?? {}),
                    total: getData(payload?.allQuestionsCount ?? {})
                },
                languageProblemCount: payload?.matchedUser?.languageProblemCount ?? []
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
 * Fetches recent public LeetCode solution articles.
 *
 * ---
 * **Input**
 * ```js
 * {
 *   username: string,
 *   skip?: number,
 *   first?: number
 * }
 * ```
 *
 * **Output (ServiceResponse)**
 * ```js
 * {
 *   data: [
 *     {
 *       title: string,
 *       createdAt: string | null,
 *       url: string
 *     }
 *   ],
 *   error,
 *   code
 * }
 * ```
 *
 * **Rules**
 * - username is required
 * - skip defaults to 0
 * - first defaults to 20
 * - missing values are normalized safely
 * - returns only public solution articles
 * - generates direct LeetCode solution URLs
 * - uses POST + handleServiceError
 */
async function LeetcodeRecentSolution({ username, skip = 0, limit = 20 }) {
    const query = `
    query userSolutionArticles( 
        $username: String!, 
        $skip: Int!, 
        $limit: Int!
    ) {
        ugcArticleUserSolutionArticles(
            username: $username, 
            skip: $skip, 
            first: $limit 
        ) {
            edges { 
                node {
                    title
                    createdAt
                    slug
                    questionSlug
                    topicId
                }
            }
        }
    }`;

    if (!username) return createMissingInputError({ 
        field: "username", service: "LeetcodeProfileData" 
    });

    const response = await POST({
        url: LEETCODE_API_ENDPOINT,
        data: { query, variables: { username, skip, limit } },
        headers: LEETCODE_HEADERS
    });

    return handleServiceError({
        response,
        format: ( data ) => {
            const payload = data?.data;
            const edges = payload?.ugcArticleUserSolutionArticles?.edges ?? [];

            return edges.map(({node}) => ({
                title: node?.title ?? "",
                createdAt: node?.createdAt ?? null,
                url: node?.questionSlug && node?.topicId && node?.slug
                    ? `https://leetcode.com/problems/${node.questionSlug}/solutions/${node.topicId}/${node.slug}`
                    : null
            }));
        }
    });
}


/**
 * Fetches recent accepted LeetCode submissions.
 *
 * ---
 * **Input**
 * ```js
 * {
 *   username: string,
 *   limit?: number
 * }
 * ```
 *
 * **Output (ServiceResponse)**
 * ```js
 * {
 *   data: [
 *     {
 *       id: string,
 *       title: string,
 *       titleSlug: string,
 *       timestamp: string
 *     }
 *   ],
 *   error,
 *   code
 * }
 * ```
 *
 * **Rules**
 * - username is required
 * - limit defaults to 20
 * - returns only accepted submissions
 * - timestamp is returned as unix timestamp string
 * - uses POST + handleServiceError
 */
async function LeetcodeRecentSubmission({ username, limit = 20 }) {
    const query = `
    query recentAcSubmissions($username: String!, $limit: Int!) {
        recentAcSubmissionList(
            username: $username
            limit: $limit
        ) {
            id
            title
            titleSlug
            timestamp
        }
    }`;

    if (!username) return createMissingInputError({ 
        field: "username", service: "LeetcodeProfileData" 
    });

    const response = await POST({
        url: LEETCODE_API_ENDPOINT,
        data: { query, variables: { username, limit } },
        headers: LEETCODE_HEADERS
    });

    return handleServiceError({
        response,
        format: ( data ) => {
            const payload = data?.data;
            const submission = payload?.recentAcSubmissionList ?? [];
            
            return submission.map(( item ) => ({
                title: item?.title ?? "",
                timestamp: item?.timestamp ?? 0,

                url: item?.titleSlug 
                    ? `https://leetcode.com/problems/${item?.titleSlug}/description/` 
                    : null
            }));
        }
    });
}


/**
 * Fetches LeetCode skill/tag statistics grouped by difficulty level.
 *
 * ---
 * **Input**
 * ```js
 * {
 *   username: string
 * }
 * ```
 *
 * **Output (ServiceResponse)**
 * ```js
 * {
 *   data: {
 *     advanced: [
 *       {
 *         tagName: string,
 *         problemsSolved: number
 *       }
 *     ],
 *
 *     intermediate: [
 *       {
 *         tagName: string,
 *         problemsSolved: number
 *       }
 *     ],
 *
 *     fundamental: [
 *       {
 *         tagName: string,
 *         problemsSolved: number
 *       }
 *     ]
 *   },
 *   error,
 *   code
 * }
 * ```
 *
 * **Rules**
 * - username is required
 * - returns categorized tag statistics
 * - tags are grouped into:
 *   - advanced
 *   - intermediate
 *   - fundamental
 * - safely normalizes missing response data
 * - empty categories fallback to empty arrays
 * - uses POST + handleServiceError
 */
async function leetcodeSkillStats({ username }) {
    query = `
    query skillStats($username: String!) {
        matchedUser(username: $username) {
            tagProblemCounts {
                advanced {
                    tagName
                    problemsSolved
                }
                intermediate {
                    tagName
                    problemsSolved
                }
                fundamental {
                    tagName
                    problemsSolved
                }
            }
        }
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
        format: ( data ) => {
            const payload = data?.data;
            return payload?.matchedUser?.tagProblemCounts ?? {
                advanced: [],
                intermediate: [],
                fundamental: []
            };
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
    name: "Leetcode_Service",
    services: {
        "LeetcodeProfileData": {
            callable: LeetcodeProfileData,
            key: "leetcode.profile",
            priority: PRIORITY.high,
            next_run: 2 * 3600 * 1000
        },
        "LeetcodeSubmissionData": {
            callable: LeetcodeSubmissionData,
            key: "leetcode.submissiondata",
            priority: PRIORITY.high,
            next_run: 2 * 3600 * 1000
        },
        "fetchLeetcodeHeatmapLastNYears": {
            callable: fetchLeetcodeHeatmapLastNYears,
            key: "leetcode.heatmap.history",
            priority: PRIORITY.medium,
            next_run: 24 * 3600 * 1000
        },
        "LeetcodeRecentSolution": {
            callable: LeetcodeRecentSolution,
            key: "leetcode.recentsolution",
            priority: PRIORITY.medium,
            next_run: 24 * 3600 * 1000
        },
        "LeetcodeRecentSubmission": {
            callable: LeetcodeRecentSubmission,
            key: "leetcode.recentsubmission",
            priority: PRIORITY.medium,
            next_run: 24 * 3600 * 1000
        },
        "leetcodeSkillStats": {
            callable: leetcodeSkillStats,
            key: "leetcode.skillstats",
            priority: PRIORITY.high,
            next_run: 5 * 3600 * 1000
        }
    }
}


module.exports = {
    worker_map
}


if (require.main === module) {
    const { runServices } = require("../utils")
    runServices( worker_map )
}
