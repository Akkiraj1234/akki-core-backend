const Fastify = require('fastify');
const app = Fastify()

app.get("/health", async () => {
        return {ok: true}
})


async function health() {
        return {ok: true}
}

app.get("/health", health)
