
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

function parseEndDate(value) {
    const timestamp = parseDate(value);
    if (timestamp === null) return null;
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value))
        ? timestamp + 86400000 - 1
        : timestamp;
}

function filterHeatmap(data, from, to) {
    if (!from && !to) return data;

    const fromDate = parseDate(from);
    const toDate = parseEndDate(to);
    const years = {};

    for (const [year, yearData] of Object.entries(data?.years ?? {})) {
        const heatmap = (yearData?.heatmap ?? []).filter((item) => {
            const date = parseDate(item?.date);
            return date !== null &&
                (fromDate === null || date >= fromDate) &&
                (toDate === null || date <= toDate);
        });

        if (heatmap.length > 0) years[year] = { ...yearData, heatmap };
    }

    return { ...data, years };
}

function limitData(data, limit) {
    if (limit === undefined) return data;
    const count = Math.max(0, Math.floor(Number(limit)));
    return Number.isFinite(count) && Array.isArray(data)
        ? data.slice(0, count)
        : data;
}

async function registerRoutes({ app, deps = {}, protect }) {
    const { databaseManager, cacheManager } = deps;
    const config = protect ? { preHandler: protect } : {};
    const route = (path, key, transform) => {
        app.get(`/leetcode/${path}`, config, createCachedHandler({
            cacheManager,
            key: `leetcode:${path}`,
            handler: async (request) => {
                const data = serviceData(databaseManager, key);
                return data === null
                    ? { ok: false, message: `${key} data not found` }
                    : { ok: true, data: transform ? transform(data, request.query ?? {}) : data };
            }
        }));
    };

    route("profile", "leetcode.profile");
    route("submission", "leetcode.submissiondata");
    route("heatmap", "leetcode.heatmap.history", (data, query) =>
        filterHeatmap(data, query.from, query.to)
    );
    route("solutions", "leetcode.recentsolution", (data, query) =>
        limitData(data, query.limit)
    );
    route("submissions", "leetcode.recentsubmission", (data, query) =>
        limitData(data, query.limit)
    );
    route("skills", "leetcode.skillstats");
}

module.exports = { registerRoutes };