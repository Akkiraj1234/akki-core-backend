const DEFAULT_ROUTE_CACHE_TTL = 60_000;

function serializeQuery(query = {}) {
    return JSON.stringify(
        Object.keys(query)
            .sort()
            .reduce((result, key) => {
                result[key] = query[key];
                return result;
            }, {})
    );
}

function createCachedHandler({ cacheManager, key, handler, ttlMs }) {
    ttlMs = ttlMs ?? DEFAULT_ROUTE_CACHE_TTL
    
    return async (request, reply) => {
        if (!cacheManager?.get || !cacheManager?.set) {
            return handler(request, reply);
        }

        const cacheKey = `route:${key}:${serializeQuery(request.query)}`;
        const cached = cacheManager.get(cacheKey);
        if (cached !== null) return cached;

        const response = await handler(request, reply);
        if (response?.ok === true) {
            cacheManager.set(cacheKey, response, { ttlMs });
        }

        return response;
    };
}

module.exports = {
    createCachedHandler
};
