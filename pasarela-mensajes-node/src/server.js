

// src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Asegúrate de que el nombre del archivo coincida exactamente con el que creaste
const paypalRoutes = require('./routes/paypal.routes.js');

const app = express();

app.use(cors());
app.use(express.json());
// EL ENDPOINT DE IA PARA TU DASHBOARD
app.post('/api/ia/analisis', async (req, res) => {
    const { puntuales, atrasos } = req.body;

    // Le damos la estructura EXACTA que debe llenar, como un formulario
    const prompt = `Datos exactos del personal: ${puntuales} asistencias puntuales y ${atrasos} atrasos.
Instrucción estricta: Escribe un resumen de máximo 2 oraciones en un solo párrafo. 
- La primera oración debe evaluar el rendimiento según estos números.
- La segunda oración debe dar una única recomendación de recursos humanos.
NO uses listas, NO uses viñetas, NO agregues introducciones ni texto extra.`;

    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'phi3',
                prompt: prompt,
                system: "Eres un analista de datos muy estricto. Solo devuelves el texto pedido, sin saludos, sin explicaciones, sin formato de lista.",
                stream: false,
                options: {
                    temperature: 0.1, // Súper lógico
                    num_predict: 80   // Corta el texto rápido
                }
            })
        });

        const data = await response.json();
        res.json({ analisis: data.response });
    } catch (error) {
        console.error("Error con Ollama:", error);
        res.status(500).json({ analisis: "El motor de IA local está apagado o procesando." });
    }
});

// Aquí es donde daba el error. Si pusiste module.exports = router en el otro archivo, ya no fallará.
app.use('/api/paypal', paypalRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de pagos corriendo en http://localhost:${PORT}`);
});