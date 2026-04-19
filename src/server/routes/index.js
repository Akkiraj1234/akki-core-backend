const { SECRET } = require("../../config");
const AUTH_KEY = SECRET.AUTH_KEY;

async function protect(request, reply) {
    const key = request.headers["x-api-key"];

    if (!AUTH_KEY || key !== AUTH_KEY) {
        return reply.code(401).send({ error: "Unauthorized" });
    }
}

async function registerRoutes(app, deps = {}) {
    const { databaseManager, cacheManager } = deps;

    app.get("/health", { preHandler: protect }, async () => {
        return {
            ok: true,
            timestamp: new Date().toISOString()
        };
    });

    app.get("/state", { preHandler: protect }, async () => {
        return {
            ok: true,
            database: databaseManager?.snapshot?.() ?? { total: 0, keys: [] },
            cache: {
                size: cacheManager?.size?.() ?? 0
            }
        };
    });

    // app.get("/state", async () => {
    //     return {
    //         ok: true,
    //         database: databaseManager?.snapshot?.() ?? { total: 0, keys: [] },
    //         cache: {
    //             size: cacheManager?.size?.() ?? 0
    //         }
    //     };
    // });

    app.get("/data/:key", { preHandler: protect }, async (request, reply) => {
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
