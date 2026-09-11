const Fastify = require("fastify");
const rateLimit = require("@fastify/rate-limit");
const jwt = require("@fastify/jwt");
const { logger } = require("../infrastructure");
const { registerRoutes } = require("./route");

const DEFAULT_CORS_ORIGINS = [
    "http://localhost:5174",
    "https://akhand.dev"
];

function getCorsOrigins() {
    const origins = process.env.CORS_ORIGINS
        ?.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

    return origins?.length ? origins : DEFAULT_CORS_ORIGINS;
}

class Server {
    constructor({
        host = "0.0.0.0",
        port = Number(process.env.PORT) || 3000,
        databaseManager = null,
        cacheManager = null
    } = {}) {
        this.host = host;
        this.port = port;
        this.databaseManager = databaseManager;
        this.cacheManager = cacheManager;

        this.app = Fastify({ logger: false });
        this.initializeProtection();
        this.initializeCors();
        this.initializeRoutes();
    }

    initializeCors() {
        const allowedOrigins = new Set(getCorsOrigins());

        this.app.addHook("onRequest", async (request, reply) => {
            const origin = request.headers.origin;

            if (!allowedOrigins.has(origin)) return;

            reply.header("Access-Control-Allow-Origin", origin);
            reply.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
            reply.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            reply.header("Vary", "Origin");

            if (request.method === "OPTIONS") {
                return reply.code(204).send();
            }
        });
    }

    initializeProtection() {
        this.app.register(rateLimit, {
            max: 100,
            timeWindow: "1 minute"
        });
        
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured");
        }
        this.app.register(jwt, {
            secret: process.env.JWT_SECRET
        });
    }

    initializeRoutes() {
        registerRoutes(this.app, {
            databaseManager: this.databaseManager,
            cacheManager: this.cacheManager
        });
    }

    async start() {
        await this.app.listen({ port: this.port, host: this.host });
        logger.info(`HTTP server running on ${this.host}:${this.port}`);
    }

    async close() {
        await this.app.close();
        logger.info("HTTP server closed");
    }

    async forceclose() {
        try {
            await this.app.close();
            logger.warn("HTTP server force closed");
        } catch {
            // no-op for toy-mode shutdown path
        }
    }
}

module.exports = { Server };
