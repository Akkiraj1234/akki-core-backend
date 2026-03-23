const axios = require("axios");
const { CONFIG } = require("../config");
const PROFILEENDPOINT = `${CONFIG.roadmap.endpoint}/${CONFIG.roadmap.routes.profile}`;
const USERNAME = CONFIG.roadmap.username;


async function RoadmapProfileData({username}) {
    const res = await axios.get(
        `${PROFILEENDPOINT}/${username}`
    )

    data = res.data
    return {
        name: data.name,
        avatar: data.avatar,
        avilabletohire: data.onboardingStatus,
        customRoadmaps: data.customRoadmaps,
        onboarding_info: data.onboarding,
        activity: data.activity,
        totalActivityCount: data.totalActivityCount,
        roadmap: data.roadmaps,
    }
    // return res.data;
}





async function main() {
    console.log(await RoadmapProfileData({username: USERNAME}))
}
if (require.main === module) {
    main();
}


// roadmap sh userend point: https://github.com/kamranahmedse/developer-roadmap/blob/master/src/api/api.ts