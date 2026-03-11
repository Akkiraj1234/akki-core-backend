const Fastify = require("fastify")
const app = Fastify()

async function health() {
        return {ok: true}
}

app.get("/health", health)

async function start() {
        try {
                await app.listen({port: 3000, host: "0.0.0.0"})
                console.log("server running on port : 3000")
        } catch (err) {
                console.error(err)
                process.exit(1)
        }
}
start()
