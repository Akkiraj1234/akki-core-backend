
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

    // Profile: direct DB access
    app.get(`/leetcode/profile`, config, async (request) => {
        const data = serviceData(databaseManager, "leetcode.profile");
        return data === null ? { ok: false, message: "leetcode.profile data not found" } : { ok: true, data };
    });

    // Submission: cached latest N (default 10)
    app.get(`/leetcode/submission`, config, createCachedHandler({
        cacheManager,
        key: `leetcode:submission`,
        handler: async (request) => {
            const n = request.query?.n === undefined ? 10 : Math.max(0, Math.floor(Number(request.query.n) || 0));
            const data = serviceData(databaseManager, "leetcode.submissiondata") ?? [];
            return { ok: true, n, data: n === null ? data : data.slice(0, n) };
        }
    }));

    // Heatmap: return only 1 year, cached
    app.get(`/leetcode/heatmap`, config, createCachedHandler({
        cacheManager,
        key: `leetcode:heatmap`,
        handler: async () => {
            const data = serviceData(databaseManager, "leetcode.heatmap.history");
            if (!data) return { ok: false, message: "Heatmap data not found" };
            const years = Object.keys(data?.years ?? {});
            if (years.length === 0) return { ok: true, data: { years: {} } };
            const latest = years.sort().slice(-1)[0];
            return { ok: true, year: latest, data: { years: { [latest]: data.years[latest] } } };
        }
    }));

    // Solutions: cached, support n default 10
    app.get(`/leetcode/solutions`, config, createCachedHandler({
        cacheManager,
        key: `leetcode:solutions`,
        handler: async (request) => {
            const n = request.query?.n === undefined ? 10 : Math.max(0, Math.floor(Number(request.query.n) || 0));
            const data = serviceData(databaseManager, "leetcode.recentsolution") ?? [];
            return { ok: true, n, data: n === null ? data : data.slice(0, n) };
        }
    }));

    // Submissions: cached, support n default 10
    app.get(`/leetcode/submissions`, config, createCachedHandler({
        cacheManager,
        key: `leetcode:submissions`,
        handler: async (request) => {
            const n = request.query?.n === undefined ? 10 : Math.max(0, Math.floor(Number(request.query.n) || 0));
            const data = serviceData(databaseManager, "leetcode.recentsubmission") ?? [];
            return { ok: true, n, data: n === null ? data : data.slice(0, n) };
        }
    }));

    // Skills: direct DB access (no caching)
    app.get(`/leetcode/skills`, config, async (request) => {
        const data = serviceData(databaseManager, "leetcode.skillstats");
        return data === null ? { ok: false, message: "skillstats data not found" } : { ok: true, data };
    });
}

module.exports = { registerRoutes };