const { SECRET } = require("../../config");
const AUTH_KEY = SECRET.AUTH_KEY;



async function protect(request, reply) {
    const apiKey = request.headers["x-api-key"];

    if (AUTH_KEY && apiKey === AUTH_KEY) {
        return;
    }

    try {
        await request.jwtVerify();

        if (request.user?.type !== "frontend") {
            return reply.code(401).send({
                error: "Unauthorized"
            });
        }

    } catch {
        return reply.code(401).send({
            error: "Unauthorized"
        });
    }
}

async function registerRoutes(app, deps = {}) {
    const { databaseManager, cacheManager } = deps;

    const init_config = {
        config: {
            rateLimit: {
                max: 5,
                timeWindow: "1 minute"
            }
        }
    }
    const init_func = async () => {
        const token = app.jwt.sign(
            { type: "frontend" },
            { expiresIn: "1h" }
        );
        
        return {
            ok: true,
            token,
            expiresIn: "1h"
        }
    }

    const health_func = async () => {
        return {
            ok: true,
            timestamp: new Date().toISOString()
        };
    }

    const render_internal_health_func = async () => {
        return { ok: true };
    }

    const state_func = async () => {
        return {
            ok: true,
            database: databaseManager?.snapshot?.() ?? {
                total: 0,
                keys: []
            },
            cache: {
                size: cacheManager?.size?.() ?? 0
            }
        }
    }

    const data_key_func = async (request, reply) => {
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
    }

    app.post("/init", init_config, init_func);
    app.get("/health", { preHandler: protect }, health_func);
    app.get("/render_internal_health", render_internal_health_func);
    app.get("/state", { preHandler: protect }, state_func);
    app.get("/data/:key", { preHandler: protect },data_key_func);
}



module.exports = {
    registerRoutes
};