// channel.js
const EventEmitter = require("events");

class Channel {
    constructor() {
        this.emitter = new EventEmitter();
    }

    send(channel, message) {
        this.emitter.emit(channel, message);
    }

    listen(channel, handler) {
        this.emitter.on(channel, handler);
        return () => this.off(channel, handler); // unsubscribe helper
    }

    once(channel, handler) {
        this.emitter.once(channel, handler);
    }

    off(channel, handler) {
        this.emitter.off(channel, handler);
    }
}

module.exports = {
    Channel
}