
# 📌 Backend TODO

- [📌 Backend TODO](#-backend-todo)
  - [v1.0 ( MVP )](#v10--mvp-)
    - [Core Setup](#core-setup)
    - [Base Modules](#base-modules)
    - [Storage](#storage)
    - [Reporter](#reporter)
    - [Server](#server)
    - [Infrastructure](#infrastructure)
  - [v1.1 ( In Progress )](#v11--in-progress-)
    - [Core](#core)
    - [Reporter](#reporter-1)
    - [Storage](#storage-1)
    - [Server](#server-1)
    - [Utils](#utils)
  - [v1.2 (Ideas / Future)](#v12-ideas--future)
    - [Config](#config)
    - [Infrastructure](#infrastructure-1)
    - [other](#other)

---

## v1.0 ( MVP ) 

### Core Setup

- [x] Project structure initialized
- [x] Bootstrap system created
- [x] Module-based architecture setup
- [ ] random delay on startup (stagger execution)
- [ ] prevent stuck tasks

### Base Modules

- [x] Config (local support)
- [x] Core (basic orbit + tasks structure)
- [x] Infrastructure (basic structure)
- [x] Server setup (initial)
- [x] Utils functions

### Storage

- [ ] Implement cache manager ( RAM )

### Reporter

- [ ] Improve logging system (color + schema config)
- [ ] include service name + duration

### Server

**Routes**

- [ ] Implement versioned routes (v1)
- [ ] Implement auto routes loader
- [ ] include service status route

**Rate Limit + Cache**

- [ ] Add SSE support (one-way communication)
- [ ] Auto-remove old connections

**Server Core**

- [ ] Load all routes dynamicall
- [ ] Load all routes dynamically

### Infrastructure

**request.js**

- [ ] kill long-running fetchers
- [ ] prevent stuck tasks

---

## v1.1 ( In Progress )

### Core

**Orbit**

- [ ] Generate reports based on protocol
- [ ] Integrate with reporter module
- [ ] Allow config updates via user response

**Tasks**

- [ ] tasks should be able to track failures and create list.
- [ ] Add retry with exponential backoff if autoresolve
- [ ] Pause service after X failures (circuit breaker)
- [ ] Tasks should be able to understand which error is fixable and which one not.
- [ ] Send failure, auto-resolve and manual resolve events to Orbit
- [ ] disable unstable services temporarily

### Reporter

- [ ] Add controllable logging (on/off via config)
- [ ] Implement email reporting system
- [ ] Add error reporting + scheduled reports
- [ ] Standardize report format

### Storage

- [ ] Implement cache manager ( Redis + ram fallback)
- [ ] Add PostgreSQL storage support
- [ ] Build CRUD with locking system
- [ ] Implement priority locking system

### Server

**Routes**

- [ ] Implement versioned routes (v2 with rate limit)
- [ ] Map functions to routes via protocol

**Rate Limit + Cache**

- [ ] Add cache wrapper for optimized reads
- [ ] Implement rate limit system

**Server Core**

- [ ] Start server using config
- [ ] Initialize cache + PostgreSQL

### Utils

- [ ] Improve sanitizer system (config-based)
- [ ] Optimize formatHeatmap performance
- [ ] Preserve streak across years
- [ ] Move memory functions → observer
- [ ] Create lightweight memory checker
- [ ] Add memory tracking in runServices
- [ ] Improve constants/property system

---

## v1.2 (Ideas / Future) 

### Config

- [ ] Implement PostgreSQL fallback flow
- [ ] Add DB storage for config (`config` table)
- [ ] Handle missing config error properly

### Infrastructure

**HTTP (request.js)**

- [ ] Move error builder to `error.js`
- [ ] Enforce observer-based network calculations

**Token Manager**

- [ ] Fix StaticAuthHandler → return token only
- [ ] Trigger save after refresh token update
- [ ] Standardize error handling (protocol-based)

**Messaging**

- [ ] Complete databus implementation

**Observer**

- [ ] Rename decisionEngine
- [ ] feed real API usage data
- [ ] link with rate limits
- [ ] Integrate resource_monitor properly
- [ ] Improve next_time calculation
- [ ] Add caching + DB persistence
- [ ] Add network usage tracking
- [ ] Optimize RAM usage tracking
- [ ] Trigger orbit on RAM spikes

### other
- [ ] Advanced monitoring dashboard
- [ ] Distributed system support
- [ ] Plugin/module system
