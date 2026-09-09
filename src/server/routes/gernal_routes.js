const { createCachedHandler } = require("../storage/route_cache");
const { formatHeatmap } = require("../../utils");

function serviceData(databaseManager, key) {
    const record = databaseManager?.get?.(key);
    return record?.data?.data ?? record?.data ?? null;
}

function latestYearFrom(data) {
    const years = Object.keys(data?.years ?? {});
    if (years.length === 0) return null;
    const latest = years.sort().slice(-1)[0];
    return { year: latest, data: { years: { [latest]: data.years[latest] } } };
}

async function registerRoutes({ app, deps = {}, protect }) {
    const { databaseManager, cacheManager } = deps;
    const config = protect ? { preHandler: protect } : {};

    app.get(
        `/gernal/heatmap`,
        config,
        createCachedHandler({
            cacheManager,
            key: `gernal:heatmap`,
            handler: async () => {
                const github = serviceData(databaseManager, "github.heatmap");
                const leetcode = serviceData(databaseManager, "leetcode.heatmap.history");
                const roadmap = serviceData(databaseManager, "roadmap.profile");
                
                const githubLatest = github ? latestYearFrom(github) : null;
                const leetcodeLatest = leetcode ? latestYearFrom(leetcode) : null;
                // roadmap stores activity heatmap in either normalized format
                // (formatHeatmap output) or as an array of {date,count}. Handle both.
                let roadmapLatest = null;
                const rmHeat = roadmap?.activity?.heatmap;
                if (rmHeat) {
                    if (rmHeat?.years) {
                        roadmapLatest = latestYearFrom(rmHeat);
                    } else if (Array.isArray(rmHeat)) {
                        const normalized = formatHeatmap(rmHeat);
                        roadmapLatest = latestYearFrom(normalized);
                    }
                }

                return {
                    ok: true,
                    data: {
                        github: githubLatest ?? null,
                        leetcode: leetcodeLatest ?? null,
                        roadmap: roadmapLatest ?? null
                    }
                };
            }
        })
    );
}

module.exports = { registerRoutes };
