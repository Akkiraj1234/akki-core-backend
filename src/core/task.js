

class Task {
    constructor({ Config, services, taskName, channel }) {
        this.Config = Config;
        this.services = services;
        this.taskName = taskName;
        this.channel = channel;
    }

    start() {
        for (const service of this.services) {
            
        }
    }
}

module.exports = {
    Task
}