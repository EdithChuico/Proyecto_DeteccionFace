const axios = require("axios");

function generateClientTransactionId() {
    const base = Date.now().toString(36).toUpperCase();
    return `TX${base}`.substring(0, 15);
}

function cleanText(value, maxLength) {
    return String(value || "")
        .replace(/[^\w\sÁÉÍÓÚáéíóúÑñ.,:-]/g, "")
        .substring(0, maxLength);
}

async function preparePayphonePayment(orderData = {}) {
    const clientTransactionId = generateClientTransactionId();

    const amount = Number(orderData.amount || 200);

    if (!Number.isInteger(amount) || amount <= 0) {
        throw new Error("El monto debe enviarse como entero en centavos.");
    }

    const body = {
        amount: amount,
        amountWithoutTax: amount,
        clientTransactionId: clientTransactionId,
        currency: "USD",
        reference: cleanText(orderData.reference || "Pago con API Link", 100)
    };

    console.log("[PAYPHONE BODY]", body);

    const response = await axios.post(
        `${process.env.PAYPHONE_BASE_URL}/api/Links`,
        body,
        {
            headers: {
                Authorization: `Bearer ${process.env.PAYPHONE_TOKEN}`,
                "Content-Type": "application/json"
            }
        }
    );

    return {
        clientTransactionId,
        providerResponse: response.data,
        paymentUrl: response.data
    };
}

module.exports = {
    preparePayphonePayment
};