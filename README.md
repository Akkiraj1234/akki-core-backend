# akki-core-backend

`akki-core-backend` is a modular data orchestration backend designed to continuously collect, normalize, and serve data from multiple external services through a unified API layer.

Unlike traditional request-driven backends, this system is execution-driven: data is fetched, processed, and maintained proactively, and APIs serve the latest computed state.

The system is designed as a **self-managing backend core**, where services are automatically discovered, scheduled, executed, and monitored as part of a centralized orchestration layer.

## Overview

In simple terms, the system is built around four core parts:

* Service (Fetcher Layer)
* Core (Orbit + Task)
* Infrastructure (HTTP, auth, messaging, logging)
* Delivery (Storage + API layer)

## Plug-and-Play Design

* Services (fetcher layer) are file-based and auto-loaded
* Each service defines its own fetchers and scheduling logic
* New services can be added without modifying core logic

## What it does

* Fetches data from external services (GitHub, LeetCode, Spotify, etc.)
* Normalizes responses into a consistent internal format
* Executes tasks through a controlled scheduling system
* Caches and stores the latest results in memory
* Exposes structured data via protected APIs
* Provides a foundation for monitoring, error propagation, and adaptive scheduling

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

```bash
npm install
npm start
```

## Dev Script Runner

```bash
pip -m venv .venv
pip install -r requirements.txt
npm run tool
```

## License

Source available for educational viewing only.
Reuse, modification, or redistribution is not permitted.

[Read License](./License.md)
