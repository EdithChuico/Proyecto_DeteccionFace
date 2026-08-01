const EventEmitter = require("events");

const paymentBus = new EventEmitter();

function publishPaymentEvent(eventName, payload) {
    console.log(`[PUBLICADO] ${eventName}`, payload);
    paymentBus.emit(eventName, payload);
}

module.exports = {
    paymentBus,
    publishPaymentEvent
};