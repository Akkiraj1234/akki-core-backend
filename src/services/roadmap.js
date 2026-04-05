/* 
Roadmap source can be found here
roadmap sh userend point: https://github.com/kamranahmedse/developer-roadmap/blob/master/src/api/api.ts
*/
const { GET } = require("../infrastructure")
const { CONFIG } = require("../config");
const { createResponse } = require("../utils.js")

// Constants
const PROFILEENDPOINT = `${CONFIG.roadmap.endpoint}/${CONFIG.roadmap.routes.profile}`;
const USERNAME = CONFIG.roadmap.username;


function formatRoadmapHeatmap(data) {
    if (!data || typeof data !== "object") return [];

    return Object.entries(data)
        .map(([date, count]) => {
            const timestamp = Date.parse(date);
            if (Number.isNaN(timestamp)) return null;

            return {
                date: Math.floor(timestamp / 86400000), // LeetCode-style day index
                count: Number(count) || 0
            };
        })
        .filter(Boolean)
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
    const response = await GET({
        url: `${PROFILEENDPOINT}/${username}`
    });

    if (response.error) {
        return createResponse({
            data: {},
            code: response.code,
            error: response.error
        });
    }

    return createResponse({
        data: formatRoadmapdata(response.data),
        code: response.code,
        error: response.error
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
