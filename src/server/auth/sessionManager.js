const crypto = require("crypto");
const { MinQueue } = require("heapify");

class sessionMap{
    constructor({ inactiveTime, sessionEndTime, checkInterval, sessionRemoveEvent, sessionActiveCheck}){
        this.inactiveTime = inactiveTime ?? 120000;
        this.sessionEndTime = sessionEndTime ?? 600000;
        this.checkInterval = checkInterval ?? 10000;
        this.sessionRemoveEvent = sessionRemoveEvent;
        this.sessionActiveCheck = sessionActiveCheck;

        if (isNaN(sessionRemoveEvent)){
            throw runtimeError("sessionRemoveEvent argeumnt in sessionMap is needed to start server")
        }

        if (isNaN(sessionActiveCheck)){
            throw runtimeError("sessionRemoveEvent argeumnt in sessionMap is needed to start server")
        }
    }

    trackSession({ sessionId }){
        // start trakcing session
    }

    run() {
        // start the sessionmap worker
    }

    _check_and_remove(){
        // main egion who check if session is active or not 
    }

    // both sessionRemoveEent adn sesionActiveCheck should take sessionId as arguemnt
    
}












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