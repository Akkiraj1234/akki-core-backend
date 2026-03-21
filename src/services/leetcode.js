const axios = require("axios");
const { CONFIG } = require("../config")
const LEETCODE_API_ENDPOINT = CONFIG.leetcode.endpoint
const USERNAME = CONFIG.leetcode.username



async function request({ url, query, variables, headers = {} }) {
    try {
        const finalHeaders = { "Content-Type": "application/json", ...headers };
        const res = await axios.post(
            url, 
            { query, variables }, 
            {
                headers: finalHeaders, 
                timeout: 5000,
                validateStatus: () => true
            }
        );
        
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

    }catch (err) {
        return { error: { type: "NETWORK_ERROR", retryable: true } };
    }
}


async function LeetcodeProfileData(username) {
    // takes data as dict containing {username: username,solved:{easy, medium, hard}, total: {easy, medium, hard}};
    const query = `
    query getUserProfile($username: String!) {
        matchedUser(username: $username){ 
            submitStats{
                asSubmissionNum { difficulty count }
            }
        }
        allQuestionsCount {difficulty count}
    }`;
    const res = await request({
        url: LEETCODE_API_ENDPOINT, 
        query: query, 
        variables: { username }
    });

    // safe search
    if (res.error) return res;
    if (!res.data?.matchedUser) {
        return { error: { type: "USER_NOT_FOUND", retryable: false } };
    }
    
    const userStats = res.data.matchedUser.submitStats.asSubmissionNum;
    const totalStats = res.data.allQuestionsCount;

    const getCount = (arr, diff) => 
        arr.find(x => x.difficulty === diff)?.count || 0;

    return {
        username: username,
        solved: {
            easy: getCount(userStats, "Easy"),
            medium: getCount(userStats, "Medium"),
            hard: getCount(userStats, "Hard"),
        },
        total:{
            easy: getCount(totalStats, "Easy"),
            medium: getCount(totalStats, "Medium"),
            hard: getCount(totalStats, "Hard")
        }
    };
}


async function getleetcodeheatmap(username) {
    const query = `
    query getUserProfile($username: String!) {
        matchedUser(username: $username){ 
            userCalendar { date value }
        }
    }`;
    const res = await request({
        url: LEETCODE_API_ENDPOINT, 
        query: query, 
        variables: { username }
    });

    // safe search
    if (res.error) return res;
    if (!res.data?.matchedUser) {
        return { error: { type: "USER_NOT_FOUND", retryable: false } };
    }
    
    const heatmapData = res.data.matchedUser.userCalendar;
    return heatmapData.map(entry => [entry.date, entry.value]);
}





// Data i need to return from this service
// "leetcode": {
//           "easy": 300,
//           "medium": 200,
//           "hard": 200,
//           "totalSolved": 1400,
//           "totalAvailable": 2300
//         },


// {
//         "source": "leetcode",
//         "data": [[18723729192, 12]]
//       },



// | Condition                         | Error type    |
// | --------------------------------- | ------------- |
// | `err.response.status >= 500`      | SERVER_ERROR  |
// | `err.response.status === 429`     | RATE_LIMITED  |
// | `err.response.status === 400`     | BAD_REQUEST   |
// | `err.response.status === 401/403` | AUTH_ERROR    |
// | `err.request`                     | NETWORK_ERROR |
// | else                              | UNKNOWN_ERROR |
// | Type               | When it occurs                                    | Default action     |
// | ------------------ | ------------------------------------------------- | ------------------ |
// | `NETWORK_ERROR`    | timeout, DNS, connection reset                    | retry soon         |
// | `SERVER_ERROR`     | HTTP 5xx (500, 502, 503)                          | retry with backoff |
// | `RATE_LIMITED`     | HTTP 429                                          | retry after delay  |
// | `TEMP_UNAVAILABLE` | upstream temporarily unavailable (non-HTTP cases) | retry later        |
// | Type             | When it occurs              | Default action               |
// | ---------------- | --------------------------- | ---------------------------- |
// | `USER_NOT_FOUND` | 404 / no matched user       | stop (no retry)              |
// | `BAD_REQUEST`    | 400 / invalid query payload | report + stop                |
// | `UNAUTHORIZED`   | 401                         | report (may need config fix) |
// | `FORBIDDEN`      | 403                         | report (access issue)        |
// | `PARSE_ERROR`    | unexpected response shape   | report                       |
// | `UNKNOWN_ERROR`  | anything unclassified       | report                       |

