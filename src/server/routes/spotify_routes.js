const { createCachedHandler } = require("../storage/route_cache");

function serviceData(databaseManager, key) {
    const record = databaseManager?.get?.(key);
    return record?.data?.data ?? record?.data ?? null;
}

function applyLimit(data, limit) {
    if (limit === undefined || !Number.isFinite(Number(limit))) return data;
    const count = Math.max(0, Math.floor(Number(limit)));
    if (Array.isArray(data)) return data.slice(0, count);
    if (!data || typeof data !== "object") return data;

    return Object.fromEntries(Object.entries(data).map(([key, value]) =>
        [key, Array.isArray(value) ? value.slice(0, count) : value]
    ));
}

async function registerRoutes({ app, deps = {}, protect }) {
    const { databaseManager, cacheManager } = deps;
    const config = protect ? { preHandler: protect } : {};
    const routes = {
        profile: "spotify.profile_info",
        "current-playing": "spotify.current_playing",
        playlists: "spotify.user_playlists",
        "recently-played": "spotify.recently_played",
        "top-tracks": "spotify.top_tracks",
        "top-artists": "spotify.top_artists"
    };

    for (const [path, key] of Object.entries(routes)) {
        app.get(`/spotify/${path}`, config, createCachedHandler({
            cacheManager,
            key: `spotify:${path}`,
            handler: async (request) => {
                const data = serviceData(databaseManager, key);
                return data === null
                    ? { ok: false, message: `${key} data not found` }
                    : { ok: true, data: applyLimit(data, request.query?.limit) };
            }
        }));
    }
}

module.exports = { registerRoutes };