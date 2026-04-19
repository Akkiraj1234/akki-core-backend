const { formatHeatmap, handleServiceError } = require("../utils");
const { GET } = require("../infrastructure")
const {
    createConfigNotFoundError,
    createMissingInputError
} = require("../error");

/**
 * Data source reference:
 * roadmap.sh doesn't expose a public API.
 * This endpoint was discovered from their frontend usage (after some digging 👀).
 *
 * Endpoint:
 * https://roadmap.sh/api/v1-get-public-profile
 *
 * Required header:
 * { Referer: "https://roadmap.sh" }
 *
 * Source:
 * https://github.com/kamranahmedse/developer-roadmap
 * https://github.com/kamranahmedse/developer-roadmap/blob/master/src/api/api.ts
 */
const PROFILEENDPOINT = "https://roadmap.sh/api/v1-get-public-profile";
const ROADMAP_HEADERS = { "Referer": "https://roadmap.sh" };
const AVATARENDPOINT = "https://assets.roadmap.sh/avatars"



/**
 * Flatten heatmap object into array format.
 *
 * ---
 * **Input**
 * ```js
 * { [date: string]: number }
 * ```
 *
 * **Output**
 * ```js
 * Array<{ date: number, count: number }>
 * ```
 *
 * **Rules**
 * - returns empty array for invalid input
 * - converts date string to timestamp (ms)
 * - defaults invalid counts to 0
 * - filters out invalid dates
 */
function flattenHeatmap(data) {
    if (!data || typeof data !== "object") return [];

    return Object.entries(data).map(([dateStr, count]) => {
        const parsed = Date.parse(dateStr);
        
        return {
            date: isNaN(parsed) ? null : parsed,
            count: Number(count) || 0
        }
    }).filter(item => item.date !== null);
}


/**
 * Normalize roadmap.sh profile data into standard structure.
 *
 * ---
 * **Input**
 * ```js
 * object (raw API response)
 * ```
 *
 * **Output**
 * ```js
 * {
 *   name: string,
 *   avatar: string,
 *   availableToHire: boolean,
 *   customRoadmaps: Array,
 *   onboardingInfo: object,
 *   activity: {
 *     heatmap: object,
 *     total: number
 *   },
 *   roadmap: Array
 * }
 * ```
 *
 * **Rules**
 * - returns empty object for invalid input
 * - safely accesses nested fields
 * - uses formatHeatmap for activity data
 */
function formatRoadmapdata(data) {
    if (!data) return {};

    const heatmap = formatHeatmap(
        flattenHeatmap(data.activity?.activityCount ?? {})
    )

    return {
        name: data.name ?? "",
        avatar: `${AVATARENDPOINT}/${data.avatar ?? ""}`,
        customRoadmaps: data.customRoadmaps ?? [],
        onboardingInfo: data.onboarding ?? {},
        activity: {
            heatmap,
            total: data.activity?.totalActivityCount ?? 0
        },
        roadmap: data.roadmaps ?? [],
    }
}


/**
 * Fetch roadmap.sh profile data.
 *
 * ---
 * **Input**
 * ```js
 * { username: string }
 * ```
 *
 * **Output (ServiceResponse)**
 * ```js
 * {
 *   data: object,
 *   error,
 *   code
 * }
 * ```
 *
 * **Rules**
 * - username is required
 * - uses GET + handleServiceError
 * - delegates formatting to formatRoadmapdata
 */
async function RoadmapProfileData({ username }) {

    if (!username) return createMissingInputError({ 
        field: "username", service: "LeetcodeProfileData" 
    });

    const response = await GET({
        url: `${PROFILEENDPOINT}/${username}`,
        headers: ROADMAP_HEADERS
    });

    return handleServiceError({
        response,
        format: formatRoadmapdata
    });
}


const worker_map = {
    initFunc: null,
    configKey: "services.roadmap.config",
    name: "Roadmap_Service",
    services: {
        "RoadmapProfileData": {
            callable: RoadmapProfileData,
            key: "roadmap.profile",
            priority: PRIORITY.high, 
            next_run: 2 * 3600 * 1000
        }   
    }
}

module.exports = {
    worker_map
}

if (require.main === module) {
    const { runServices } = require("../utils")
    runServices( worker_map )
}
