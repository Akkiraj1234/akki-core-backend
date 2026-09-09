const { on_demand_map } = require("../../services/github");
const { createCachedHandler } = require("../storage/route_cache");
const { serviceData } = require("./utils");



function profileDataHandler(databaseManager) {
    return async () => {
        const data = serviceData(databaseManager, "github.profile");
        return data
            ? { ok: true, data }
            : { ok: false, message: "Profile data not found" };
    };
}


function parseDate(value) {
    if (!value) return null;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
}

function parseEndDate(value) {
    if (!value) return null;
    const timestamp = parseDate(value);
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value))
        ? timestamp + 86400000 - 1
        : timestamp;
}

function matchesDateRange(value, from, to) {
    const timestamp = parseDate(value);
    if (timestamp === null) return false;

    const fromDate = parseDate(from);
    const toDate = parseEndDate(to);

    return (fromDate === null || timestamp >= fromDate) &&
        (toDate === null || timestamp <= toDate);
}

function filterHeatmap(data, from, to) {
    if (!from && !to) return data;

    const filteredYears = {};
    for (const [year, yearData] of Object.entries(data?.years ?? {})) {
        const heatmap = (yearData?.heatmap ?? []).filter(({ date }) =>
            matchesDateRange(date, from, to)
        );

        if (heatmap.length > 0) {
            filteredYears[year] = { ...yearData, heatmap };
        }
    }

    return { ...data, years: filteredYears };
}

async function heatmapHandler(request, databaseManager) {
    // For now return only the most recent year's heatmap (no query support)
    const data = serviceData(databaseManager, "github.heatmap");

    if (!data) return { ok: false, message: "Heatmap data not found" };

    const years = Object.keys(data?.years ?? {});
    if (years.length === 0) return { ok: true, data: { years: {} } };

    const latestYear = years.sort().slice(-1)[0];
    return {
        ok: true,
        year: latestYear,
        data: { years: { [latestYear]: data.years[latestYear] } }
    };
}

async function eventsHandler(request, databaseManager) {
    // Return latest N events (default 10) optionally filtered by repo
    const n = request.query?.n === undefined ? 10 : Math.max(0, Math.floor(Number(request.query.n) || 0));
    const repo = request.query?.repo ?? request.query?.repoName ?? null;
    const data = serviceData(databaseManager, "github.events");

    if (!data) return { ok: false, message: "Events data not found" };

    const events = Array.isArray(data) ? data : [];
    const filtered = repo ? events.filter(e => (e?.repo?.name ?? "") === repo) : events;
    const sliced = n === 0 ? [] : (n ? filtered.slice(0, n) : filtered);

    return { ok: true, n: n === 0 ? 0 : n, repo: repo ?? null, data: sliced };
}

async function repositoriesHandler(request, databaseManager) {
    // Support `n` to return latest N repositories; otherwise return full set
    const n = request.query?.n === undefined ? null : Math.max(0, Math.floor(Number(request.query.n) || 0));
    const sort = request.query?.sort ?? null;
    const data = serviceData(databaseManager, "github.repositories") ?? [];
    const repositories = Array.isArray(data) ? [...data] : [];

    if (String(sort).toLowerCase() === "latest" || String(sort).toLowerCase() === "updated") {
        repositories.sort((left, right) =>
            parseDate(right?.updatedAt) - parseDate(left?.updatedAt)
        );
    }

    return {
        ok: true,
        n: n,
        sort: sort,
        data: n === null ? repositories : repositories.slice(0, n)
    };
}

async function repositoryInfoHandler(request) {
    const { owner, repo } = request.query;
    const result = await on_demand_map.fetchers.repoinfo.callable({ owner, repo });
    if (result?.error || result?.type) {
        return {
            ok: false,
            error: result.error ?? result,
            code: result.code ?? null
        };
    }

    return { ok: true, ...result };
}

function filterWorkingRepositories(data, from, to) {
    if (!Array.isArray(data)) return [];
    const fromDate = parseDate(from);
    const toDate = parseEndDate(to);

    return data.filter((repository) => {
        const startedAt = parseDate(repository?.started_at);
        const endedAt = parseDate(repository?.ended_at) ?? Number.POSITIVE_INFINITY;
        return startedAt !== null &&
            (toDate === null || startedAt <= toDate) &&
            (fromDate === null || endedAt >= fromDate);
    });
}

async function workingRepositoriesHandler(request, databaseManager) {
    const { from, to } = request.query;
    const record = ["github.workingrepos", "github.workingrepo", "workingrepos"]
        .map((key) => databaseManager?.get?.(key))
        .find(Boolean);
    const data = record?.data?.data ?? record?.data ?? [];

    return {
        ok: true,
        from: from ?? null,
        to: to ?? null,
        data: filterWorkingRepositories(data, from, to)
    };
}


async function registerRoutes({ app, deps = {}, protect}){
    const { databaseManager, cacheManager } = deps;
    const ParentRoute = "/github";
    const config = protect ? { preHandler: protect } : {};
    const cached = (key, handler) => createCachedHandler({
        cacheManager,
        key: `github:${key}`,
        handler
    });

    // Profile: direct DB access, no route-level caching
    app.get(`${ParentRoute}/profile`, config, profileDataHandler(databaseManager));

    // Heatmap: no query, only latest year, no caching
    app.get(`${ParentRoute}/heatmap`, config, async (request) => heatmapHandler(request, databaseManager));

    // Events: cached, supports `n` (default 10) and optional `repo`
    app.get(`${ParentRoute}/events`, config, cached("events", async (request) => eventsHandler(request, databaseManager)));

    // Repositories: cached, supports `n` and optional sort
    app.get(`${ParentRoute}/repositories`, config, cached("repositories", async (request) => repositoriesHandler(request, databaseManager)));

    // Repo-info: cached always
    app.get(`${ParentRoute}/repo-info`, config, cached("repo-info", repositoryInfoHandler));

    // Rename workingrepos -> activerepo: direct DB access, no caching
    app.get(`${ParentRoute}/activerepo`, config, async (request) => {
        const resp = await workingRepositoriesHandler(request, databaseManager);
        return { ok: resp.ok, data: resp.data };
    });
}


module.exports = { 
    registerRoutes 
};


