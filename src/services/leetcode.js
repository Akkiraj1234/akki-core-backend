const axios = require("axios");
const { CONFIG } = require("../config")
const LEETCODE_API_ENDPOINT = CONFIG.leetcode.endpoint
const USERNAME = CONFIG.leetcode.username



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
    const res = await axios.post(
        LEETCODE_API_ENDPOINT,
        { query: query, variables: { username }},
        { headers: { "Content-Type": "application/json",} }
    );

    if (! res.ok) {
        return null;
    }
    if (!res.data.data.matchedUser) return null;
    
    const userStats = res.data.data.matchedUser.submitStats.asSubmissionNum;
    const totalStats = res.data.data.allQuestionsCount;

    const getCount = (arr, diff) => {
        arr.find(x => x.difficulty === diff)?.count || 0;
    }

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