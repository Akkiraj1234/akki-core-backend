// bus.js
const EventEmitter = require("events");

class Bus extends EventEmitter { }

const bus = new Bus();

module.exports = {
    bus
}