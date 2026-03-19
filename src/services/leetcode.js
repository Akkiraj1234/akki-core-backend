const axios = require("axios");
const { CONFIG } = require("../config")
const Leetcode_APi_ENDPOINT = CONFIG['leetcode']['endpoint']
const USERNAME = CONFIG['leetcode']['username']



async function LeetcodeProfileData(username) {
    const quarry = `
    query getUserProfile($username: String!) {
    }
    `
}

const leetcode = {
    "easy": 300,
    "medium": 200,
    "hard": 200,
    "total eassy": 1700,
    "total medium": 1500,
    "total hard": 700
}


// {
//         "source": "leetcode",
//         "data": [[18723729192, 12]]
//       },