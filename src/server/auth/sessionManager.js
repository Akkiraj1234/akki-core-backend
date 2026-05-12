const crypto = require("crypto");


class SessionManager {

    constructor() {
        this.sessions = new Map();
    }

    create(data = {}) {

        const token = crypto.randomBytes(32).toString("hex");

        const session = {
            token,
            createdAt: Date.now(),
            lastSeen: Date.now(),
            clientVersion: data.clientVersion || 0,
            serverVersion: data.serverVersion || 0
        };

        this.sessions.set(token, session);

        return session;
    }

    get(token) {
        return this.sessions.get(token);
    }

    has(token) {
        return this.sessions.has(token);
    }

    touch(token) {

        const session =
            this.sessions.get(token);

        if (session) {
            session.lastSeen = Date.now();
        }
    }

    remove(token) {
        this.sessions.delete(token);
    }
}

module.exports = SessionManager;