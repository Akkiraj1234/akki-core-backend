// const { Discord } = require("./discord/discord.js")
const { Server } = require("./server/server.js")
const services = [ new Server() ] 
let shuttingDown = false


async function startAll() {
        await Promise.all(
                services.map(service => service.start())
        )
}

async function shutdown({err = null, force = false} = {}) {
        if (shuttingDown) return
        shuttingDown = true

        if (err) console.error(err)
        console.log("shutting down services...")
        
        await Promise.all(
                services.map(service =>
                        force ? service.forceclose(err) : service.close(err)
                )
        )
        process.exit(err ? 1:0)
}

async function main() {
        console.log("Starting services...")
        try {await startAll()}
        catch(err) {await shutdown({ err })}
}

process.on("SIGINT", () => shutdown({force:true}))
process.on("SIGTERM", () => shutdown({force:true}))
process.on("uncaughtException", err => shutdown({ err, force: true }))
process.on("unhandledRejection", err => shutdown({ err, force: true }))
main()