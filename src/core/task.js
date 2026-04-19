const { ChannelsID, PRIORITY } = require("../utils");
const { decisionEngine } = require("../infrastructure");
const DecisionEngine = decisionEngine()


function checkError(response) {
    return null
}

class Task {
    constructor({ Config, services, taskName, channel }) {
        this.Config = Config;
        this.services = services;
        this.taskName = taskName;
        this.channel = channel;

        this.queue = [];
        this.timer = null;

        this.buildServiceList();
    }

    buildServiceList() {
        const now = Date.now();

        for (const [name, service] of this.services.entries()){
            const { next_run = 1000 } = service.next_run;

            this.queue.push({
                name, service, time: now + next_run
            });
        }
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

        this.timer = setTimeout(() => {
            this.execute(next);
        }, delay);
    }

    execute(item) {
        const { name, service } = item;
        const { callable, key, priority = PRIORITY.medium, next_run = 1000 } = service;

        const response = callable(this.Config);
        const error = checkError(response);

        if (error) {
            this.channel.send(ChannelsID.Orbit, {
                type: "task_error",
                taskName: this.taskName,
                serviceName: name,
                error
            });
        }

        if (response && typeof response === "object") {
            this.channel.send(ChannelsID.DatBase, {
                key,
                data: response
            });
        }

        const delay = engine.nextRun(next_run, priority);
        item.time = Date.now() + delay;
        this.sortQueue();
        this.run();
    }
}

module.exports = {
    Task
}