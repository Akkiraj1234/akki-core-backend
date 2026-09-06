function serviceData(databaseManager, key) {
    const record = databaseManager?.get?.(key);
    return record?.data?.data ?? record?.data ?? null;
}

