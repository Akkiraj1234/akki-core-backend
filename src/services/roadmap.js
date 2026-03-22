const axios = require("axios");
const { CONFIG } = require("../config");
const PROFILEENDPOINT = `${CONFIG.roadmap.endpoint}/${CONFIG.roadmap.routes.profile}`;
const USERNAME = CONFIG.roadmap.username



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

    } catch (err) {
        return { error: { type: "NETWORK_ERROR", retryable: true } };
    }
}

async function RoadmapProfileData({username}) {
    const res = await axios.get(
        `${PROFILEENDPOINT}/${username}`
    )

    data = res.data
    return {
        name: data.name,
        avilabletohire: data.onboardingStatus,
        
    }
    return res.data;
}

async function main() {
    console.log(await RoadmapProfileData({USERNAME}))
}



if (require.main === module) {
    main();
}


// roadmap sh userend point: https://github.com/kamranahmedse/developer-roadmap/blob/master/src/api/api.ts