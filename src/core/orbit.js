/*
Hierarchical Async Orchestration System”

ORBIT (Global Orchestrator)
- Scheduling: decides when tasks run
- Global Control: start / stop / pause tasks
- Task Lifecycle Management (startTask, stopTask, forceStop)
- Event Handling (NOT interpretation): rescvies failling, resolved forward to log and all
- Pattern Detection (your strong idea 🔥): detact -flapping (fail → resolve → repeat), instability, abnormal frequency
- Policy Engine (optional but powerful): JSON rules like: “task 23 unstable → alert”

TASK (Domain Controller)
- Fetcher Management: groups them - high / medium / low priority
- Execution Strategy: decides which fetchers to run
- Error Handling (FULL ownership): interprets errors desides to retry dealy and more.
- State Tracking (important): tracks fatcher health.
- State Transitions (very important): detects healthy → failing, failing → resolved
- Reporting (trigger only): sends to Orbit:failing, resolved for report
- Next Run Decision: calculate nextRunEstimate

FETCHER (Execution Unit)
- Perform Work
- Return Result
----------------------------------------------------
Note
----------------------------------------------------
FETCHER should return data in this format:
return { data, error, code }; where they can use createResponse({ data, error, code }) from utils.js for standardization.
----------------------------------------------------
*/
const { getDataWithAddress, ChannelsID } = require("../utils")
const { logger, Channel } = require("../infrastructure");
const { ServiceNotFoundError } = require("../error");
const { SECRET, CONFIG } = require("../config");
const { Task } = require("./task")
const path = require("path");
const fs = require("fs");


// will pass src/services
class Orbit {
    constructor ({ servicePath }) {
        this.servicePath = path.isAbsolute(servicePath)
            ? servicePath
            : path.resolve(__dirname, servicePath)
        
        this.channel = Channel()
        this.Tasks = [];
    }
    
    getServices() {
        const stat = fs.statSync(this.servicePath);
        if (!stat.isDirectory()) throw new ServiceNotFoundError(
            `Invalid service path: "${this.servicePath}" is not a directory`
        )

        const files = fs.readdirSync(this.servicePath);
        const services = [];

        for (const file of files) {
            if (!file.endsWith(".js")) continue;

            try {
                const fullPath = path.join(this.servicePath, file);
                const mod = require(fullPath);
                if (mod?.worker_map) services.push(mod.worker_map);
            }
            catch (err) {
                logger.error(`Failed to load service: ${file}`, err.message);
            }
        };
        if (services.length === 0) {
            throw new ServiceNotFoundError("No valid services found");
        }
        return services;
    };

    validateService( workerMap ) {
        // report who did not loaded correctly
        return (
            workerMap &&
            typeof workerMap.configKey === "string" &&
            typeof workerMap.services === "object" && 
            workerMap.services !== null
        );
    }

    buildTask() {
        const workerTaskList = this.getServices()
            .filter(this.validateService)

        for (const { init, configKey, services, name } of workerTaskList){
            if (init) init(SECRET);

            const config = getDataWithAddress(
                CONFIG,
                configKey ?? ""
            )
            
            const task = new Task(
                { config, services, name, channel: this.channel }
            );
            this.Tasks.push(task);
        }
    }

    startTask() {
        for (const task of this.Tasks) {
            task.start();
        }
    }

    handleOrbitMessage( message ) {
        // handle messages from tasks like failing, resolved, nextRunEstimate and more
    }

    start() {
        this.channel.listen(
            ChannelsID.Orbit, 
            this.handleOrbitMessage
        );

        this.buildTask()
        this.startTask()
    }

}


if (require.main === module){
    const servicePath = "../services"
    const orbit = new Orbit({ servicePath })
    orbit.start()
}