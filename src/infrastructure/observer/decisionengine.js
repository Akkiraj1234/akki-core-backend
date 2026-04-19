class DecisionEngineCore {
    constructor(config = {}) {
        this.config = {
            dailyLimit: 1,
            monthlyLimit: 1,
            alphaDaily: 0.2,
            alphaMonthly: 0.05,
            weightDaily: 0.7,
            weightMonthly: 0.3,
            k: 0.5,
            gamma: 1,
            warmupSamples: 3,
            ...config
        };

        this._normalizeConfig();

        this.state = {
            dailyUsage: 0,
            monthlyUsage: 0,
            dailyAvg: null,
            monthlyAvg: null,
            samples: 0,
            lastUpdatedMonth: this._getMonthKey()
        };

        this.cache = {
            pressure: 0,
            loadFactor: 1
        };
    }

    updateConfig(config = {}) {
        this.config = {
            ...this.config,
            ...config
        };
        this._normalizeConfig();
        this._recomputeCache();
    }

    ingest(data = {}) {
        const { dailyUsage = 0, monthlyUsage = 0 } = data;

        this._handleMonthRollover();

        this.state.dailyUsage += dailyUsage;
        this.state.monthlyUsage += monthlyUsage;

        this._updateAverages();
        this._recomputeCache();
    }

    nextRun(estimate, priority = 1) {
        const safePriority = Math.max(priority, 0.0001);
        const priorityFactor = 1 / Math.pow(safePriority, this.config.gamma);

        // 🔥 FIX: apply priority ONLY to overload, not base estimate
        const extraLoad = this.cache.loadFactor - 1;

        return estimate * (1 + extraLoad * priorityFactor);
    }

    resetDaily() {
        this.state.dailyUsage = 0;
        this.state.dailyAvg = null;
        this.state.samples = 0;
        this._recomputeCache();
    }

    resetMonthly() {
        this.state.monthlyUsage = 0;
        this.state.monthlyAvg = null;
        this.state.samples = 0;
        this._recomputeCache();
    }

    _updateAverages() {
        const D = this.state.dailyUsage / this.config.dailyLimit;
        const M = this.state.monthlyUsage / this.config.monthlyLimit;

        if (this.state.samples === 0 || this.state.dailyAvg === null) {
            this.state.dailyAvg = D;
            this.state.monthlyAvg = M;
        } else {
            this.state.dailyAvg += this.config.alphaDaily * (D - this.state.dailyAvg);
            this.state.monthlyAvg += this.config.alphaMonthly * (M - this.state.monthlyAvg);
        }

        this.state.samples++;
    }

    _recomputeCache() {
        if (
            this.state.samples === 0 ||
            this.state.dailyAvg === null ||
            this.state.monthlyAvg === null
        ) {
            this.cache.pressure = 0;
            this.cache.loadFactor = 1;
            return;
        }

        const epsilon = 0.0001;

        const D = this.state.dailyUsage / this.config.dailyLimit;
        const M = this.state.monthlyUsage / this.config.monthlyLimit;

        const D_A = Math.max(this.state.dailyAvg, epsilon);
        const M_A = Math.max(this.state.monthlyAvg, epsilon);

        // Only overload matters
        const overloadD = Math.max(0, (D - D_A) / D_A);
        const overloadM = Math.max(0, (M - M_A) / M_A);

        let pressure =
            (this.config.weightDaily * overloadD) +
            (this.config.weightMonthly * overloadM);

        pressure = this._clamp(pressure, 0, 3);

        const confidence = this._clamp(
            this.state.samples / this.config.warmupSamples,
            0,
            1
        );

        this.cache.pressure = pressure * confidence;
        this.cache.loadFactor = 1 + this.config.k * Math.pow(this.cache.pressure, 2);
    }

    _handleMonthRollover() {
        const currentMonth = this._getMonthKey();

        if (this.state.lastUpdatedMonth !== currentMonth) {
            this.state.monthlyUsage = 0;
            this.state.monthlyAvg = null;
            this.state.samples = 0;
            this.state.lastUpdatedMonth = currentMonth;
        }
    }

    _getMonthKey() {
        const d = new Date();
        return `${d.getFullYear()}-${d.getMonth() + 1}`;
    }

    _normalizeConfig() {
        this.config.dailyLimit = Math.max(1, this.config.dailyLimit);
        this.config.monthlyLimit = Math.max(1, this.config.monthlyLimit);
    }

    _clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
}

// =========================
// 🌐 Singleton wrapper
// =========================
let singleton = null;

function decisionEngine(config, data) {
    if (!singleton) {
        singleton = new DecisionEngineCore(config || {});
    } else if (config && Object.keys(config).length > 0) {
        singleton.updateConfig(config);
    }

    if (data && Object.keys(data).length > 0) {
        singleton.ingest(data);
    }

    return singleton;
}

module.exports = { decisionEngine };


// =========================
// 🧠 FUTURE MATH NOTES (IMPORTANT)
// =========================

/*
Future Upgrade: Monthly Pacing + Run Budget System

Goal:
- Ensure tasks are distributed across the month
- Prevent early exhaustion of resources
- Estimate how many runs are safe

Variables:

E  = cost per run
U_m = current monthly usage
T_m = monthly target
d   = current day
N   = total days in month
r   = remaining days = N - d

1. Ideal usage by today:
   idealUsed = T_m * (d / N)

2. Remaining budget:
   remaining = max(0, T_m - U_m)

3. Safe daily budget:
   safeDaily = remaining / max(r + 1, 1)

4. Runs estimation:
   runsLeftMonth = floor(remaining / E)
   runsToday = floor(safeDaily / E)

5. Optional baseline:
   lastMonthAvg (store single value)

   expectedToday = β * lastMonthAvg + (1 - β) * safeDaily

6. Pressure:
   pressure = max(0, (E / expectedToday) - 1)

7. Final:
   delay = estimate * (1 + k * pressure^2) / priority^gamma

Notes:
- Keep O(1)
- No history arrays
- Only store lastMonthAvg
*/

// =========================
// 🧪 TEST CASES
// =========================
if (require.main === module) {
    console.log("---- Decision Engine Tests ----\n");

    const engine = decisionEngine({
        dailyLimit: 1000,
        monthlyLimit: 20000
    });

    const runAll = (label, estimate = 500) => {
        console.log(`\n${label}`);
        console.log("  Normal =>", engine.nextRun(estimate, 1).toFixed(2));
        console.log("  High   =>", engine.nextRun(estimate, 2).toFixed(2));
        console.log("  Low    =>", engine.nextRun(estimate, 0.5).toFixed(2));
    };

    // 🟢 Test 1: No usage
    console.log("Test 1: No usage");
    runAll("Baseline");

    // 🟡 Test 2: Normal usage
    engine.ingest({ dailyUsage: 100, monthlyUsage: 100 });
    console.log("\nTest 2: Normal usage");
    runAll("Normal Load");

    // 🔴 Test 3: Spike
    engine.ingest({ dailyUsage: 900, monthlyUsage: 2000 });
    console.log("\nTest 3: Spike");
    runAll("Spike Load");

    // 🔵 Test 4: Recovery
    engine.resetDaily();
    engine.ingest({ dailyUsage: 50, monthlyUsage: 100 });
    console.log("\nTest 4: Recovery");
    runAll("Recovered");

    // 🔥 Test 5: Expected Spike (gradual build then burst)
    engine.resetDaily();
    engine.resetMonthly();

    // build baseline
    for (let i = 0; i < 3; i++) {
        engine.ingest({ dailyUsage: 100, monthlyUsage: 100 });
    }

    // sudden spike
    engine.ingest({ dailyUsage: 900, monthlyUsage: 2000 });

    console.log("\nTest 5: Expected Spike (real scenario)");
    runAll("Expected Spike");

    console.log("\n---- Done ----");
}