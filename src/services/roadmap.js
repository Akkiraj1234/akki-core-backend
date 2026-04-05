/* 
Roadmap source can be found here
roadmap sh userend point: https://github.com/kamranahmedse/developer-roadmap/blob/master/src/api/api.ts
*/
const { GET } = require("../infrastructure")
const { CONFIG } = require("../config");
const { handleServiceError } = require("../utils.js")

// Constants
const PROFILEENDPOINT = `${CONFIG.roadmap.endpoint}/${CONFIG.roadmap.routes.profile}`;
const USERNAME = CONFIG.roadmap.username;


function formatRoadmapHeatmap(data) {
    if (!data || typeof data !== "object") return [];

    const dayCountMap = new Map();

    for (const [date, count] of Object.entries(data)) {
            const timestamp = Date.parse(date);
            if (Number.isNaN(timestamp)) continue;
            
            const dayIndex = Math.floor(timestamp / 86400000);
            const normalizedCount = Number(count) || 0;
            dayCountMap.set(dayIndex, (dayCountMap.get(dayIndex) ?? 0) + normalizedCount);
    }

    return Array.from(dayCountMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date - b.date);
}
function formatRoadmapdata(data) {
    if (!data) return {};

    const heatmap = formatRoadmapHeatmap(data.activity?.activityCount ?? {});

    return {
        name: data.name,
        avatar: data.avatar,
        availableToHire: data.onboardingStatus,
        customRoadmaps: data.customRoadmaps,
        onboardingInfo: data.onboarding,
        activity: {
            heatmap,
            daily: heatmap, // compatibility alias
            total: data.activity?.totalActivityCount ?? 0
        },
        roadmap: data.roadmaps,
    }
}

async function RoadmapProfileData({ username }) {
    const selectedUsername = username ?? USERNAME;
    const response = await GET({
        url: `${PROFILEENDPOINT}/${selectedUsername}`
    });

    return handleServiceError({
        response,
        format: (data) => formatRoadmapdata(data)
    });
}

// id : {callable, prioriy, nextrun:ms}
const worker_map = {
    "RoadmapProfileData": {
        callable: RoadmapProfileData,
        key: "roadmap.profile",
        priority: "high", 
        next_run: 2 * 3600 * 1000
    }
}

module.exports = {
    worker_map
}

async function main() {
    const result = await RoadmapProfileData({ username: USERNAME });
    console.log(JSON.stringify(result, null, 2));
}
if (require.main === module) {
    main();
}
