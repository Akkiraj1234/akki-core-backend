const { ChannelsID } = require("../../utils");

class DatabaseManager {
    constructor({ cacheManager = null, logger = null, cacheTTL = 30_000 } = {}) {
        this.cacheManager = cacheManager;
        this.logger = logger;
        this.cacheTTL = cacheTTL;
        this.records = new Map();
        this.unsubscribe = null;
    }

    _log(level, message, data = null) {
        if (!this.logger) return;
        this.logger.log({
            level,
            source: "DATABASE",
            message,
            data
        });
    }

    attachChannel(channel, databaseChannel = ChannelsID.DatBase) {
        if (!channel || typeof channel.listen !== "function") return;
        if (this.unsubscribe) this.unsubscribe();

        this.unsubscribe = channel.listen(
            databaseChannel,
            this.handleMessage.bind(this)
        );

        this._log("info", "Database listener attached", { channel: databaseChannel });
    }

    detachChannel() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
            this._log("info", "Database listener detached");
        }
    }

    handleMessage(message = {}) {
        const { key, data } = message;
        if (!key) {
            this._log("warn", "Skipped write: missing key", { message });
            return;
        }

        this.upsert(key, data, { source: "task-channel" });
    }

    upsert(key, data, { source = "manual" } = {}) {
        const record = {
            key,
            data,
            source,
            updatedAt: new Date().toISOString()
        };

        this.records.set(key, record);

        if (this.cacheManager) {
            this.cacheManager.set(`db:${key}`, record, { ttlMs: this.cacheTTL });
        }

        this._log("info", "Record upserted", { key, source });
        return record;
    }

    get(key) {
        if (!key) return null;

        if (this.cacheManager) {
            const cached = this.cacheManager.get(`db:${key}`);
            if (cached) return cached;
        }

        const record = this.records.get(key) ?? null;
        if (record && this.cacheManager) {
            this.cacheManager.set(`db:${key}`, record, { ttlMs: this.cacheTTL });
        }
        return record;
    }

    keys() {
        return Array.from(this.records.keys());
    }

    snapshot() {
        return {
            total: this.records.size,
            keys: this.keys()
        };
    }
}

module.exports = {
    DatabaseManager
};
