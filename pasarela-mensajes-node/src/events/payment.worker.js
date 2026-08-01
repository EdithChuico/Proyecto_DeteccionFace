const { paymentBus } = require("./payment.bus");

paymentBus.on("payment.created", (payload) => {
    console.log("[CONSUMIDOR] Pago creado:", payload);
});

paymentBus.on("payment.link.generated", (payload) => {
    console.log("[CONSUMIDOR] Link PayPhone generado:", payload);
});

paymentBus.on("payment.failed", (payload) => {
    console.log("[CONSUMIDOR] Pago fallido:", payload);
});