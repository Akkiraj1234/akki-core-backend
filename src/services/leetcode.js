const axios = require("axios");
const { CONFIG } = require("../config")
const LEETCODE_API_ENDPOINT = CONFIG.leetcode.endpoint
const USERNAME = CONFIG.leetcode.username



async function request({ url, query, variables, headers = {} }) {
    try {
        const finalHeaders = { 
            "Content-Type": "application/json", 
            "Referer": "https://leetcode.com",
            "User-Agent": "Mozilla/5.0",
            ...headers 
        };
        const res = await axios.post(
            url, 
            { query, variables }, 
            {
                headers: finalHeaders, 
                timeout: 5000,
                validateStatus: () => true
            }
        );
        // console.log(`Leetcode API response status: ${res.status}`);
        // console.log(`Leetcode API response data: ${JSON.stringify(res.data)}`);

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
                acSubmissionNum { difficulty count }
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
        total:{
            easy: getCount(totalStats, "Easy"),
            medium: getCount(totalStats, "Medium"),
            hard: getCount(totalStats, "Hard")
        }
    };
}

async function leetcodeheatmap(username, year) {
    const query = `
    query userProfileCalendar($username: String!, $year: Int){
        matchedUser(username: $username) {
            userCalendar(year: $year) {
                activeYears,
                streak,
                totalActiveDays,
                submissionCalendar
            }
        }
    }`;
    const res = await request({
        url: LEETCODE_API_ENDPOINT, 
        query: query, 
        variables: { username , year: year ?? null}
    });

    // safe search
    if (res.error) return res;
    if (!res.data?.matchedUser) {
        return { error: { type: "USER_NOT_FOUND", retryable: false } };
    }
    
    const heatmapData = res.data.matchedUser.userCalendar;
    return heatmapData;
    // return heatmapData.map(entry => [entry.date, entry.value]);
}



async function main(){
    const data1 = await LeetcodeProfileData(CONFIG.leetcode.username);
    const data2 = await leetcodeheatmap(CONFIG.leetcode.username);
    console.log(data1?.error ? `No data found ${JSON.stringify(data1.error)}`: data1);
    console.log(data2?.error ? `No data found ${JSON.stringify(data2.error)}`: data2);
}

if (require.main === module){
    main();
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

