class CacheManager {
    constructor({ defaultTTL = 60_000, logger = null } = {}) {
        this.defaultTTL = Math.max(0, Number(defaultTTL) || 0);
        this.logger = logger;
        this.store = new Map();
    }

    _log(level, message, data = null) {
        if (!this.logger) return;
        this.logger.log({
            level,
            source: "CACHE",
            message,
            data
        });
    }

    set(key, value, { ttlMs = this.defaultTTL } = {}) {
        if (!key) return false;

        const ttl = Math.max(0, Number(ttlMs) || 0);
        const expiresAt = ttl > 0 ? Date.now() + ttl : null;

        this.store.set(key, {
            value,
            expiresAt
        });
        return true;
    }

    get(key) {
        const item = this.store.get(key);
        if (!item) return null;

        if (item.expiresAt && Date.now() >= item.expiresAt) {
            this.store.delete(key);
            this._log("info", "Cache expired", { key });
            return null;
        }

        return item.value;
    }

    has(key) {
        return this.get(key) !== null;
    }

    delete(key) {
        return this.store.delete(key);
    }

    clear() {
        this.store.clear();
    }

    size() {
        return this.store.size;
    }
}

module.exports = {
    CacheManager
};
