
# 📌 Backend TODO

- [📌 Backend TODO](#-backend-todo)
  - [v1.1 ( In Progress )](#v11--in-progress-)
    - [Core#### Orbit](#core-orbit)
      - [Tasks](#tasks)
      - [Reporter](#reporter)
      - [Storage](#storage)
    - [Server](#server)
      - [Routes](#routes)
      - [Rate Limit + Cache](#rate-limit--cache)
      - [Server Core](#server-core)
    - [Utils](#utils)
  - [v1.0 (Current Stable)](#v10-current-stable)
    - [Core Setup](#core-setup)
    - [Base Modules](#base-modules)
  - [Backlog (Ideas / Future) (v1.2)](#backlog-ideas--future-v12)
    - [Config](#config)
    - [Infrastructure](#infrastructure)
      - [HTTP (request.js)](#http-requestjs)
      - [Token Manager](#token-manager)
      - [Messaging](#messaging)
      - [Observer](#observer)

---

## v1.1 ( In Progress )

### Core#### Orbit

- [ ] Generate reports based on protocol
- [ ] Integrate with reporter module
- [ ] Allow config updates via user response

#### Tasks

- [ ] tasks should be able to track failures and create list.
- [ ] Add retry with exponential backoff if autoresolve
- [ ] Pause service after X failures (circuit breaker)
- [ ] Tasks should be able to understand which error is fixable and which one not.
- [ ] Send failure, auto-resolve and manual resolve events to Orbit

#### Reporter

- [ ] Improve logging system (color + schema config)
- [ ] Add controllable logging (on/off via config)
- [ ] Implement email reporting system
- [ ] Add error reporting + scheduled reports
- [ ] Standardize report format

---

#### Storage

- [ ] Implement cache manager (RAM + Redis)
- [ ] Add PostgreSQL storage support
- [ ] Build CRUD with locking system
- [ ] Implement priority locking system

---

### Server

#### Routes

- [ ] Implement versioned routes (v1)
- [ ] Map functions to routes via protocol

#### Rate Limit + Cache

- [ ] Add cache wrapper for optimized reads
- [ ] Implement rate limit system
- [ ] Add SSE support (one-way communication)
- [ ] Auto-remove old connections

#### Server Core

- [ ] Start server using config
- [ ] Initialize cache + PostgreSQL
- [ ] Load all routes dynamically
- [ ] Add startup health check + status

---

### Utils

- [ ] Improve sanitizer system (config-based)
- [ ] Optimize formatHeatmap performance
- [ ] Preserve streak across years
- [ ] Move memory functions → observer
- [ ] Create lightweight memory checker
- [ ] Add memory tracking in runServices
- [ ] Improve constants/property system

---

## v1.0 (Current Stable)

### Core Setup

- [x] Project structure initialized
- [x] Bootstrap system created
- [x] Module-based architecture setup

### Base Modules

- [x] Config (local support)
- [x] Core (basic orbit + tasks structure)
- [x] Infrastructure (basic structure)
- [x] Server setup (initial)
- [x] Utils functions

---

## Backlog (Ideas / Future) (v1.2)

### Config

- [ ] Implement PostgreSQL fallback flow
- [ ] Add DB storage for config (`config` table)
- [ ] Handle missing config error properly

---

### Infrastructure

#### HTTP (request.js)

- [ ] Move error builder to `error.js`
- [ ] Enforce observer-based network calculations

#### Token Manager

- [ ] Fix StaticAuthHandler → return token only
- [ ] Trigger save after refresh token update
- [ ] Standardize error handling (protocol-based)

---

#### Messaging

- [ ] Complete databus implementation

---

#### Observer

- [ ] Rename decisionEngine
- [ ] Integrate resource_monitor properly
- [ ] Improve next_time calculation
- [ ] Add caching + DB persistence
- [ ] Add network usage tracking
- [ ] Optimize RAM usage tracking
- [ ] Trigger orbit on RAM spikes

---

- [ ] Advanced monitoring dashboard
- [ ] Distributed system support
- [ ] Plugin/module system
