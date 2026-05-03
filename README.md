# akki-core-backend

`akki-core-backend` is a modular data orchestration backend designed to continuously collect, maintain, and serve a consistent internal data layer from multiple external services through a unified API layer.

Unlike traditional request-driven backends, this system is execution-driven: data is fetched, processed, and maintained proactively, and APIs serve the latest computed state.

The system acts as a centralized orchestration core where services are automatically discovered, scheduled, executed, and monitored.

## Architecture

The system is built around four core layers:

* **Service (Fetcher Layer)** — integrates with external APIs
* **Core (Orbit + Task)** — controls scheduling and execution
* **Infrastructure** — HTTP, auth, messaging, and logging utilities
* **Delivery** — storage and API layer for exposing data

## What it does

* Fetches data from external services (GitHub, LeetCode, Spotify, etc.)
* Normalizes responses into a consistent internal format
* Executes tasks through a controlled scheduling system
* Caches and stores the latest results in memory
* Exposes structured data via protected APIs
* Provides a foundation for monitoring, error propagation, and adaptive scheduling

## Plug-and-Play Design

* Services (fetcher layer) are file-based and auto-loaded
* Each service defines its own fetchers and scheduling logic
* New services can be added without modifying core logic

## Resource Efficiency

The system is designed to operate under tight resource constraints, with a focus on low memory usage, minimal CPU overhead, and reduced bandwidth consumption.

It uses a server-controlled push model based on **Server-Sent Events (SSE)** instead of polling.

* The server manages connection state (e.g. `clientId`, timestamps, last update state)
* Updates are triggered only when underlying data changes
* Only the latest computed state is sent to connected clients
* Redundant transfers are avoided by sending incremental or current-state updates

This removes the need for repeated client polling and significantly reduces network overhead.

On the backend:

* All external data fetching is scheduled and precomputed
* Results are cached and stored in memory
* API responses are simple reads from the current state
* Execution paths are optimized to minimize CPU and memory usage

Under current configuration, the system operates within low resource limits (~500MB RAM, low CPU usage) while supporting high concurrent read access and low monthly bandwidth consumption.

The architecture is intentionally built to perform efficiently in constrained environments without relying on heavy infrastructure.

## Used In

* [akhand.dev](https://akhand.dev)
* Personal data aggregation and automation workflows

## More

For detailed information:

* [Documentation](./docs/intro.md)
* [Architecture](./docs/architecture.md)
* [TODO / Roadmap](./todo.md)

## Run

Make sure environment variables are configured.

```bash id="run1"
npm install
npm start
```

## Dev Script Runner

```bash id="run2"
pip -m venv .venv
pip install -r requirements.txt
npm run tool
```

## License

Source available for educational viewing only.
Reuse, modification, or redistribution is not permitted.

[Read License](./License.md)
