const { MinQueue } = require("heapify");
const crypto = require("crypto");


class SessionTracker{
    constructor({ 
        inactiveTime, 
        sessionEndTime, 
        checkInterval, 
        onSessionExpired, 
        isSessionActive 
    }){
        this.inactiveTime = inactiveTime ?? 120000;
        this.sessionEndTime = sessionEndTime ?? 600000;
        this.checkInterval = checkInterval ?? 10000;
        this.onSessionExpired = onSessionExpired;
        this.isSessionActive = isSessionActive;

        this.heap = new MinQueue();
        this.maxActiveCycles = Math.floor(
            this.sessionEndTime / this.inactiveTime
        )
        
        if (typeof onSessionExpired != "function") {
            throw new Error("sessionRemoveEvent must be function");
        }

        if (typeof isSessionActive != "function") {
            throw new Error("isSessionActive must be function")
        }
    }

    trackSession({ sessionId }){
        this.heap.push( [sessionId, Date.now(), 0] )
    }

    trackSession({ sessionId }){
        // start trakcing session
    }

    run() {
        // start the sessionmap worker
    }

    _check_and_remove(){
        // main engion who check if session is active or not 
    }

    // both sessionRemoveEent adn sesionActiveCheck should take sessionId as arguemnt
    
}











// its a binding
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