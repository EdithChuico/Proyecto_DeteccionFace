// src/routes/paypal.routes.js
const express = require('express');
const router = express.Router();

router.post('/crear-pago', async (req, res) => {
    try {
        const { monto } = req.body;

        // Recuperamos los valores reales de tu archivo .env
        const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
        const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
        const BASE_URL = process.env.PAYPAL_BASE_URL;

        if (!CLIENT_ID || !CLIENT_SECRET) {
            console.error("Faltan las credenciales en el .env");
            return res.status(500).json({ error: "Credenciales no configuradas" });
        }

        // 1. Obtener Token
        const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        const tokenRes = await fetch(`${BASE_URL}/v1/oauth2/token`, {
            method: 'POST',
            body: 'grant_type=client_credentials',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // Si PayPal rechaza, imprimimos el error exacto que nos envía
        if (!tokenRes.ok) {
            const errorDetalle = await tokenRes.text();
            console.error("🔥 PayPal rechazó la autenticación. Detalle:", errorDetalle);
            throw new Error("Fallo al autenticar con PayPal");
        }

        const { access_token } = await tokenRes.json();

        // 2. Crear Orden
        const orderRes = await fetch(`${BASE_URL}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                intent: "CAPTURE",
                purchase_units: [{ amount: { currency_code: "USD", value: monto.toString() } }],
                application_context: {
                    return_url: "http://localhost:3000/empleado",
                    cancel_url: "http://localhost:3000/empleado"
                }
            })
        });

        if (!orderRes.ok) {
            const errorOrden = await orderRes.text();
            console.error("PayPal falló al crear la orden. Detalle:", errorOrden);
            throw new Error("Fallo al crear la orden de pago");
        }

        const orderData = await orderRes.json();
        // ---------------------------------------------------------
        // EVENTO PARA EL LABORATORIO: payment.created
        // ---------------------------------------------------------
        const eventoCreated = {
            event: "payment.created",
            transactionId: orderData.id, // El ID que nos da PayPal
            provider: "PayPal",
            amount: parseFloat(monto),
            currency: "USD",
            status: "CREATED",
            date: new Date().toISOString()
        };

        console.log("=========================================");
        console.log("NUEVO MENSAJE PUBLICADO:");
        console.log(JSON.stringify(eventoCreated, null, 2));
        console.log("=========================================");
        // ---------------------------------------------------------

        // 3. Enviar enlace al frontend
        const enlaceAprobacion = orderData.links.find(link => link.rel === "approve").href;
        res.json({
            enlace: enlaceAprobacion,
            mensajePublicado: eventoCreated
        });

    } catch (error) {
        console.error(" Error general en la ruta de pagos:", error.message);
        res.status(500).json({ error: "Error creando pago en PayPal" });
    }
});
// Agrega esto debajo de tu ruta '/crear-pago'
router.post('/capturar-pago', async (req, res) => {
    try {
        const { token } = req.body;

        const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
        const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
        const BASE_URL = process.env.PAYPAL_BASE_URL;

        // 1. Obtener Token de nuevo
        const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        const tokenRes = await fetch(`${BASE_URL}/v1/oauth2/token`, {
            method: 'POST',
            body: 'grant_type=client_credentials',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const { access_token } = await tokenRes.json();

        // 2. CAPTURAR EL DINERO
        const captureRes = await fetch(`${BASE_URL}/v2/checkout/orders/${token}/capture`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            }
        });

        const captureData = await captureRes.json();

        // ---------------------------------------------------------
        // EVENTO PARA EL LABORATORIO: payment.approved
        // ---------------------------------------------------------
        let eventoApproved = null;
        if (captureData.status === "COMPLETED") {
            // Buscamos el monto en la respuesta de PayPal (suele estar anidado)
            const captureMonto = captureData.purchase_units[0].payments.captures[0].amount.value;

            eventoApproved = {
                event: "payment.approved",
                transactionId: captureData.id,
                provider: "PayPal",
                amount: parseFloat(captureMonto),
                currency: "USD",
                status: "APPROVED",
                date: new Date().toISOString()
            };

            console.log("=========================================");
            console.log("NUEVO MENSAJE PUBLICADO Y CONSUMIDO:");
            console.log(JSON.stringify(eventoApproved, null, 2));
            console.log("Acción del consumidor: Guardando el resultado y actualizando el estado de la transacción en el sistema de asistencia.");
            console.log("=========================================");
        }
        // ---------------------------------------------------------

        res.json({
            data: captureData,
            mensajePublicado: eventoApproved
        });

    } catch (error) {
        console.error("❌ Error capturando pago:", error);
        res.status(500).json({ error: "Error capturando pago" });
    }
});
module.exports = router;