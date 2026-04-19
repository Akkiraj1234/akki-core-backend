const { ChannelsID, PRIORITY } = require("../utils");
const { decisionEngine, logger } = require("../infrastructure");
const { ERROR_TYPES } = require("../error");
const engine = decisionEngine();

function checkError(response) {
    if (!response) return null;
    if (response instanceof Error) return response.message || String(response);
    if (typeof response === "string") return response;
    if (typeof response === "object") {
        if (response.error) return response.error;
        if (response.code && response.data == null) return String(response.code);
    }
    return null;
}

function formatDuration(ms = 0) {
    const total = Math.max(0, Math.floor(Number(ms) || 0));
    if (total < 1000) return `${total}ms`;

    const seconds = Math.floor(total / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;

    if (hours > 0) return `${hours}h ${remMins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
}

function getRetryAfterMs(error) {
    const isRateLimited =
        error?.type === ERROR_TYPES.RATE_LIMITED ||
        error?.source?.code === 429;

    if (!isRateLimited) return null;

    const headers = error?.context?.response?.headers ?? {};
    const retryAfterRaw =
        headers["retry-after"] ??
        headers["Retry-After"] ??
        headers.retryAfter ??
        null;

    if (retryAfterRaw == null) return 60_000;

    const asNum = Number(retryAfterRaw);
    if (Number.isFinite(asNum) && asNum > 0) return Math.floor(asNum * 1000);

    const retryAt = Date.parse(String(retryAfterRaw));
    if (Number.isFinite(retryAt)) {
        const delta = retryAt - Date.now();
        return delta > 0 ? delta : 60_000;
    }

    return 60_000;
}

class Task {
    constructor({ config, Config, services, name, channel }) {
        // Keep backward compatibility with both `config` and `Config` payload keys.
        this.config = config ?? Config ?? {};
        this.services = services;
        this.taskName = name;
        this.channel = channel;

        this.queue = [];
        this.timer = null;

        this.buildServiceList();
    }

    log(level, message, data = null) {
        logger.log({
            level,
            source: `TASK:${this.taskName}`,
            message,
            data
        });
    }

    buildServiceList() {
        const now = Date.now();

        for (const [name, service] of Object.entries(this.services)){
            const { next_run = 1000 } = service;
            const firstRunAt = now + next_run;

            this.queue.push({
                name, service, time: firstRunAt
            });

            this.log("info", `Service '${name}' queued`, {
                nextRunIn: formatDuration(next_run),
                nextRunAt: new Date(firstRunAt).toISOString()
            });
        }
    }

    async runInitial() {
        this.log("info", "Initial run started", {
            services: Object.keys(this.services).length
        });

        for (const [name, service] of Object.entries(this.services)) {
            const { callable } = service;
            const startedAt = Date.now();

            try {
                this.log("info", `Initial run: executing '${name}'`);

                const res = await callable(this.config);
                const error = checkError(res);

                if (error) {
                    this.log("error", `Initial run failed for '${name}'`, {
                        duration: formatDuration(Date.now() - startedAt),
                        error
                    });
                    this.channel.send(ChannelsID.Orbit, {
                        type: "task_error",
                        taskName: this.taskName,
                        serviceName: name,
                        error
                    });
                    continue;
                }

                this.log("info", `Initial run success for '${name}'`, {
                    duration: formatDuration(Date.now() - startedAt)
                });
                this.channel.send(ChannelsID.DatBase, {
                    key: service.key,
                    data: res
                });
            } catch (err) {
                const message = err?.message || String(err);
                this.log("error", `Initial run threw for '${name}'`, {
                    duration: formatDuration(Date.now() - startedAt),
                    error: message
                });
                this.channel.send(ChannelsID.Orbit, {
                    type: "task_error",
                    taskName: this.taskName,
                    serviceName: name,
                    error: message
                });
            }
        }

        this.log("info", "Initial run complete");
    }

    async start() {
        await this.runInitial();  // ← first run

        this.sortQueue();
        this.run();               // ← scheduler kicks in
    }

    sortQueue() {
        this.queue.sort((a, b) => a.time - b.time);
    }

    run() {
        if (!this.queue.length) return;

        const now = Date.now();
        const next = this.queue[0];

        const delay = Math.max(0, next.time - now);

        clearTimeout(this.timer);

        this.log("info", `Next execution scheduled for '${next.name}'`, {
            runIn: formatDuration(delay),
            runAt: new Date(next.time).toISOString()
        });

        this.timer = setTimeout(() => {
            this.execute(next);
        }, delay);
    }

    async execute(item) {
        const { name, service } = item;
        const { callable, key, priority = PRIORITY.medium, next_run = 1000 } = service;
        const startedAt = Date.now();
        let lastError = null;

        this.log("info", `Executing '${name}'`, {
            priority,
            baseNextRun: formatDuration(next_run)
        });

        try {
            const response = await callable(this.config);
            const error = checkError(response);

            if (error) {
                lastError = error;
                this.log("error", `Execution failed for '${name}'`, {
                    duration: formatDuration(Date.now() - startedAt),
                    error
                });
                this.channel.send(ChannelsID.Orbit, {
                    type: "task_error",
                    taskName: this.taskName,
                    serviceName: name,
                    error
                });
            } else if (response && typeof response === "object") {
                this.log("info", `Execution success for '${name}'`, {
                    duration: formatDuration(Date.now() - startedAt)
                });
                this.channel.send(ChannelsID.DatBase, {
                    key,
                    data: response
                });
            }
        } catch (err) {
            const message = err?.message || String(err);
            lastError = message;
            this.log("error", `Execution threw for '${name}'`, {
                duration: formatDuration(Date.now() - startedAt),
                error: message
            });
            this.channel.send(ChannelsID.Orbit, {
                type: "task_error",
                taskName: this.taskName,
                serviceName: name,
                error: message
            });
        } finally {
            const baseDelay = Math.floor(engine.nextRun(next_run, priority));
            const retryAfterMs = getRetryAfterMs(lastError);
            const delay = Math.max(baseDelay, retryAfterMs ?? 0);
            const nextTime = Date.now() + delay;

            if (retryAfterMs) {
                this.log("warn", `Rate-limit backoff applied for '${name}'`, {
                    retryAfter: formatDuration(retryAfterMs),
                    originalDelay: formatDuration(baseDelay),
                    finalDelay: formatDuration(delay),
                    nextRunAt: new Date(nextTime).toISOString()
                });
            } else {
                this.log("info", `Rescheduled '${name}'`, {
                    nextRunIn: formatDuration(delay),
                    nextRunAt: new Date(nextTime).toISOString()
                });
            }

            item.time = nextTime;
            this.sortQueue();
            this.run();
        }
    }
}

module.exports = {
    Task
}
