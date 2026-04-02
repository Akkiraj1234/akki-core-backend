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


class Task {
    /*
    need to have a global worker_map varaible conaing info in this format
    worker_map = {
        id : {callable, prioriy, nextrun:ms}
    }
    */
    constructor ({cashReadOnly}) {
        this.cashReadOnly = cashReadOnly;
        this.error_info = {}
    }
    run() {
        console.log(this.cashReadOnly);

        return 
    }

    hardRun() {
        console.log("nothing have done here yrt please code!!")
    }

    stop() {
        console.log("log what?? code first bro :0 !!")
    }
}