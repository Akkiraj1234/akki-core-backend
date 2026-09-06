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
    const { from, to } = request.query;
    const data = serviceData(databaseManager, "github.heatmap");

    if (!data) {
        return {
            ok: false,
            message: "Heatmap data not found"
        };
    }

    // no query → return complete heatmap
    return {
        ok: true,
        from: from ?? null,
        to: to ?? null,
        data: filterHeatmap(data, from, to)
    };
}

async function eventsHandler(request, databaseManager) {
    const { from, to, repo, repoName } = request.query;
    const data = serviceData(databaseManager, "github.events");

    if (!data) return { ok: false, message: "Events data not found" };

    const filtered = (Array.isArray(data) ? data : []).filter((event) => {
        const eventRepo = event?.repo?.name ?? "";
        const matchesRepo = !(repo || repoName) || eventRepo === (repo || repoName);
        const matchesFrom = !from || matchesDateRange(event?.createdAt, from, null);
        const matchesTo = !to || matchesDateRange(event?.createdAt, null, to);
        return matchesRepo && matchesFrom && matchesTo;
    });

    return { ok: true, from: from ?? null, to: to ?? null, repo: repo ?? repoName ?? null, data: filtered };
}

async function repositoriesHandler(request, databaseManager) {
    const { limit, sort } = request.query;
    const data = serviceData(databaseManager, "github.repositories") ?? [];
    const requestedLimit = limit === undefined ? null : Number(limit);
    const boundedLimit = Number.isFinite(requestedLimit) && requestedLimit >= 0
        ? Math.floor(requestedLimit)
        : null;
    const repositories = Array.isArray(data) ? [...data] : [];

    if (String(sort).toLowerCase() === "latest" || String(sort).toLowerCase() === "updated") {
        repositories.sort((left, right) =>
            parseDate(right?.updatedAt) - parseDate(left?.updatedAt)
        );
    }

    return {
        ok: true,
        limit: boundedLimit,
        sort: sort ?? null,
        data: boundedLimit === null ? repositories : repositories.slice(0, boundedLimit)
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

    app.get(
        `${ParentRoute}/profile`, config,
        cached("profile", profileDataHandler(databaseManager))
    );
    app.get(
        `${ParentRoute}/heatmap`, config,
        cached("heatmap", async (request) => heatmapHandler(request, databaseManager))
    );
    app.get(
        `${ParentRoute}/events`, config,
        cached("events", async (request) => eventsHandler(request, databaseManager))
    );
    app.get(
        `${ParentRoute}/repositories`, config,
        cached("repositories", async (request) => repositoriesHandler(request, databaseManager))
    );
    app.get(
        `${ParentRoute}/repo-info`, config,
        cached("repo-info", repositoryInfoHandler)
    );
    app.get(
        `${ParentRoute}/workingrepos`, config,
        cached("workingrepos", async (request) => workingRepositoriesHandler(request, databaseManager))
    );
}


module.exports = { 
    registerRoutes 
};


