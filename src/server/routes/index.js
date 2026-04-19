async function registerRoutes(app, deps = {}) {
    const { databaseManager, cacheManager } = deps;

    app.get("/health", async () => {
        return {
            ok: true,
            timestamp: new Date().toISOString()
        };
    });

    app.get("/state", async () => {
        return {
            ok: true,
            database: databaseManager?.snapshot?.() ?? { total: 0, keys: [] },
            cache: {
                size: cacheManager?.size?.() ?? 0
            }
        };
    });

    app.get("/data/:key", async (request, reply) => {
        const { key } = request.params || {};
        const record = databaseManager?.get?.(key) ?? null;

        if (!record) {
            reply.code(404);
            return {
                ok: false,
                message: "Record not found",
                key
            };
        }

        return {
            ok: true,
            record
        };
    });
}

module.exports = {
    registerRoutes
};
