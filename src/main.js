const { decisionEngine, logger } = require("./infrastructure");
const { CONFIG } = require("./config");
const { Orbit } = require("./core/orbit.js");
const { Server } = require("./server/server.js");
const { CacheManager } = require("./server/storage/cacheManager.js");
const { DatabaseManager } = require("./server/storage/databaseManager.js");

let shuttingDown = false;
let runtime = null;

async function bootstrap() {
    decisionEngine(CONFIG);

    const cacheManager = new CacheManager({ logger });
    const databaseManager = new DatabaseManager({ cacheManager, logger });
    const orbit = new Orbit({ servicePath: "../services" });
    const server = new Server({ databaseManager, cacheManager });

    // Plug database into Orbit task outputs
    databaseManager.attachChannel(orbit.channel);

    orbit.start();
    await server.start();

    runtime = { cacheManager, databaseManager, orbit, server };
    logger.info("Bootstrap complete");
}

async function main() {
    logger.info("Starting services...");
    await bootstrap();
}

async function shutdown({ err = null, force = false } = {}) {
    if (shuttingDown) return;
    shuttingDown = true;

    if (err) logger.error("Shutdown triggered by error", err);
    logger.warn("Shutting down services...");

    try {
        runtime?.databaseManager?.detachChannel?.();
        if (force) {
            await runtime?.server?.forceclose?.();
        } else {
            await runtime?.server?.close?.();
        }
    } finally {
        process.exit(err ? 1 : 0);
    }
}

process.on("SIGINT", () => shutdown({ force: true }));
process.on("SIGTERM", () => shutdown({ force: true }));
process.on("uncaughtException", (err) => shutdown({ err, force: true }));
process.on("unhandledRejection", (err) => shutdown({ err, force: true }));

main().catch((err) => shutdown({ err, force: true }));
