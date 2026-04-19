const Fastify = require("fastify");
const { logger } = require("../infrastructure");
const { registerRoutes } = require("./routes");

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
        this.initializeRoutes();
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
