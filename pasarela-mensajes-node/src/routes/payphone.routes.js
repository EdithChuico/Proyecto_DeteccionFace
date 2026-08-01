const express = require("express");
const router = express.Router();

const {
    preparePayphonePayment
} = require("../services/payphone.service");

const { publishPaymentEvent } = require("../events/payment.bus");

router.post("/prepare", async (req, res) => {
    try {
        const result = await preparePayphonePayment(req.body);

        publishPaymentEvent("payment.created", {
            provider: "PAYPHONE",
            clientTransactionId: result.clientTransactionId,
            amount: req.body.amount,
            status: "CREATED"
        });

        publishPaymentEvent("payment.link.generated", {
            provider: "PAYPHONE",
            clientTransactionId: result.clientTransactionId,
            paymentUrl: result.paymentUrl
        });

        res.json({
            ok: true,
            provider: "PAYPHONE",
            clientTransactionId: result.clientTransactionId,
            paymentUrl: result.paymentUrl
        });

    } catch (error) {
        publishPaymentEvent("payment.failed", {
            provider: "PAYPHONE",
            reason: error.response?.data || error.message
        });

        res.status(500).json({
            ok: false,
            message: "Error preparando pago PayPhone",
            detail: error.response?.data || error.message
        });
    }
});

module.exports = router;