
const { createCachedHandler } = require("../storage/route_cache");

function serviceData(databaseManager, key) {
    const record = databaseManager?.get?.(key);
    return record?.data?.data ?? record?.data ?? null;
}

function parseDate(value) {
    if (!value) return null;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
}

function filterActivity(data, from, to) {
    if (!from && !to) return data;
    const fromDate = parseDate(from);
    const toDate = parseDate(to);
    const heatmap = (data?.activity?.heatmap ?? []).filter((item) => {
        const date = parseDate(item?.date);
        return date !== null &&
            (fromDate === null || date >= fromDate) &&
            (toDate === null || date <= toDate);
    });

    return { ...data, activity: { ...data.activity, heatmap } };
}

async function registerRoutes({ app, deps = {}, protect }) {
    const { databaseManager, cacheManager } = deps;
    const config = protect ? { preHandler: protect } : {};

    app.get("/roadmap/profile", config, createCachedHandler({
        cacheManager,
        key: "roadmap:profile",
        handler: async (request) => {
            const data = serviceData(databaseManager, "roadmap.profile");
            return data
                ? { ok: true, data: filterActivity(data, request.query?.from, request.query?.to) }
                : { ok: false, message: "Roadmap profile data not found" };
        }
    }));
}

module.exports = { registerRoutes };