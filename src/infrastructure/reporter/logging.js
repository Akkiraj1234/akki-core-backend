class Logger {
    log({ level = "info", source = "SYSTEM", message = "", data = null }) {
        const time = new Date().toISOString();

        console.log(
            `[${time}] [${level.toUpperCase()}] ${source} - ${message}`,
            data || ""
        );
    }

    info(message, data) {
        this.log({ level: "info", message, data });
    }

    error(message, data) {
        this.log({ level: "error", message, data });
    }

    warn(message, data) {
        this.log({ level: "warn", message, data });
    }
}

module.exports = new Logger();