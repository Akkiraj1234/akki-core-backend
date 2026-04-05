# akhand.dev --- Full Project Blueprint (V1)

## 🧠 Vision

akhand.dev is a personal **data orchestration backend** that: - Fetches
data from multiple services (Spotify, GitHub, LeetCode, etc.) -
Normalizes and stores it - Serves it via API - Handles failures
gracefully using cache + fallback

------------------------------------------------------------------------

## ⚙️ Core Flow (V1)
```
Service → TaskManager → Cache → API
                          ↓
                        Snapshot (optional)
```
------------------------------------------------------------------------

## 🧩 Layers

### 1. Services

-   Fetch external data
-   Normalize responses

### 2. Task Manager

-   Executes workers
-   Stores results in cache

### 3. Cache Manager

-   Primary storage (RAM / Redis later)
-   Fast reads for API

### 4. Snapshot (DB - optional)

-   Stores last known good data
-   Used when services fail

### 5. API Layer

-   Reads ONLY from cache
-   Falls back to DB if needed

------------------------------------------------------------------------

## 📁 Folder Structure

```
├── bootstrap
│   └── bootstrap.js
├── config
│   ├── config.js
│   ├── config.json
│   └── index.js
├── core
│   ├── databus.js
│   └── orbit.js
├── infrastructure
│   ├── http
│   │   ├── request.js
│   │   └── tokenManager.js
│   ├── index.js
│   └── reporter
│       └── reporter.js
├── main.js
├── server
│   ├── routes
│   ├── server.js
│   ├── services
│   ├── storage
│   └── utils
├── services
│   ├── github.js
│   ├── leetcode.js
│   ├── roadmap.js
│   └── spotify.js
└── utils.js

```
------------------------------------------------------------------------

## 🔁 Data Strategy

-   Live data → Cache
-   Fallback → Snapshot DB
-   No full cache dumps

------------------------------------------------------------------------

## 🌐 Deployment

-   Frontend → Cloudflare (akhand.dev)
-   Backend → Render (api.akhand.dev)

------------------------------------------------------------------------

## 🚀 V1 Goals

-   Working API
-   Stable cache system
-   Basic task execution

------------------------------------------------------------------------

## 🔮 V2 Ideas

-   Orbit scheduler (adaptive timing)
-   Redis cache
-   User sessions
-   Rate limiting

------------------------------------------------------------------------

## 🧠 Mental Model

Cache = current state\
DB = history / fallback\
API = read layer\
TaskManager = execution engine\
Orbit = brain (later)

------------------------------------------------------------------------

## 🧪 Rules

-   API NEVER calls services
-   Services NEVER know cache
-   Cache is the single source of truth

------------------------------------------------------------------------

## 🔐 Security

-   Sanitize logs
-   Never expose tokens
-   .env must be ignored

------------------------------------------------------------------------

## 🧭 Final Thought

Build simple → make it work → then make it smart.
