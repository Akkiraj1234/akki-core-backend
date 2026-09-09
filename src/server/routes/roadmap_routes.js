
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

    // Profile: return roadmap profile without heatmap
    app.get("/roadmap/profile", config, async (request) => {
        const data = serviceData(databaseManager, "roadmap.profile");
        if (!data) return { ok: false, message: "Roadmap profile data not found" };
        const { activity, ...rest } = data || {};
        return { ok: true, data: { ...rest } };
    });

    // Heatmap: return one-year activity (no caching)
    app.get("/roadmap/heatmap", config, async (request) => {
        const data = serviceData(databaseManager, "roadmap.profile");
        if (!data) return { ok: false, message: "Roadmap profile data not found" };
        const heatmap = data?.activity?.heatmap ?? [];
        // derive latest year entries
        const byYear = heatmap.reduce((acc, item) => {
            const y = new Date(item?.date).getFullYear();
            acc[y] = acc[y] || [];
            acc[y].push(item);
            return acc;
        }, {});
        const years = Object.keys(byYear).sort();
        const latest = years.length ? years.slice(-1)[0] : null;
        return latest ? { ok: true, year: latest, data: { years: { [latest]: { heatmap: byYear[latest] } } } } : { ok: true, data: { years: {} } };
    });
}

module.exports = { registerRoutes };