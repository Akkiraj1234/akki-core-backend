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