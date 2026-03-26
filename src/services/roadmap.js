const { GET, POST } = require("../infrastructure")
const { CONFIG } = require("../config");
const PROFILEENDPOINT = `${CONFIG.roadmap.endpoint}/${CONFIG.roadmap.routes.profile}`;
const USERNAME = CONFIG.roadmap.username;

class Task {
    constructor({ cashManager }) {
        this.cashManager = cashManager;
    }
    
    
}

async function RoadmapProfileData({ username }) {
    const res = await GET({
        url: `${PROFILEENDPOINT}/${username}`
    });

    data = res.data
    if (res.data) {
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
    }
    else {
        return res?.error ?? null
    }
}






async function main() {
    result = await RoadmapProfileData({ username: USERNAME });
    console.log(JSON.stringify(result, null, 2));
}
if (require.main === module) {
    main();
}


// roadmap sh userend point: https://github.com/kamranahmedse/developer-roadmap/blob/master/src/api/api.ts