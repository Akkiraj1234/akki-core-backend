const Fastify = require("fastify")

async function health() {
    return { ok: true }
}

class Server {
    constructor() {
        this.app = Fastify()
        this.port = 3000
        this.host = "0.0.0.0"

        this.initializeDirectory()
    }

    initializeDirectory() {
        this.app.get("/health", health)
    }

    async start() {
        await this.app.listen({ port: this.port, host: this.host })
        console.log(`server running on port : ${this.port}`)
    }

    async close() {
        console.log("closing server....")
        await this.app.close()
    }

    async forceclose() {
        console.log("closing forcibly")
        try {
            await this.app.close()
        } catch {}
    }
}

module.exports = { Server }