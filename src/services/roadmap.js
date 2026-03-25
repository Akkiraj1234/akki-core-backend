const { GET, POST } = require("../infrastructure")
const { CONFIG } = require("../config");
const PROFILEENDPOINT = `${CONFIG.roadmap.endpoint}/${CONFIG.roadmap.routes.profile}`;
const USERNAME = CONFIG.roadmap.username;


// error info will store data in thsi format 
// error_info = {
//     "method_name": {
//         error_type: ["total type of error happen"],
//         total_error_in_row: 20,
//         last_error: unixtime,
//         first_error: unixtime
//     }
// }

class Task {
    constructor ({cashReadOnly}) {
        this.cashReadOnly = cashReadOnly;
        this.error_info = {}
    }

    run() {
        console.log(this.cashReadOnly);
    }

    headRun() {
        console.log("nothing have done here yrt please code!!")
    }

    stop() {
        console.log("log what?? code first bro :0 !!")
    }
}

const worker_map = {

}


async function RoadmapProfileData({ username }) {
    const res = await GET({
        url: `${PROFILEENDPOINT}/${username}`
    });

    data = res.data

    
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