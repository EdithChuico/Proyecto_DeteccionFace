import React, { useState } from 'react';

const API_CONFIG = 'http://localhost:8080/api/configuracion';
const CLAVE_RESULTADOS = 'smart-assistance-resultados-geocerca';

const calcularDistancia = (lat1, lon1, lat2, lon2) => {
    const radioTierra = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    return radioTierra * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const obtenerResultadosGuardados = () => {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_RESULTADOS)) || [];
    } catch {
        return [];
    }
};

const PruebaGeocerca = () => {
    const [escenario, setEscenario] = useState('E1');
    const [conexion, setConexion] = useState('Wi-Fi');
    const [vpn, setVpn] = useState('No');
    const [posicionEsperada, setPosicionEsperada] = useState('Dentro');
    const [estado, setEstado] = useState('Listo para iniciar.');
    const [resultados, setResultados] = useState(obtenerResultadosGuardados());

    const guardarResultado = (resultado) => {
        setResultados((anteriores) => {
            const nuevos = [...anteriores, resultado];
            localStorage.setItem(CLAVE_RESULTADOS, JSON.stringify(nuevos));
            return nuevos;
        });
    };

    const ejecutarPrueba = async () => {
        setEstado('Obteniendo ubicación...');

        const inicioUbicacion = performance.now();

        try {
            const posicion = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });

            const finUbicacion = performance.now();

            setEstado('Consultando la configuración de geocerca...');

            const inicioConsulta = performance.now();
            const respuestaConfig = await fetch(API_CONFIG);

            if (!respuestaConfig.ok) {
                throw new Error(`No se pudo consultar la geocerca: HTTP ${respuestaConfig.status}`);
            }

            const config = await respuestaConfig.json();
            const finConsulta = performance.now();

            const distancia = calcularDistancia(
                posicion.coords.latitude,
                posicion.coords.longitude,
                config.latitud,
                config.longitud
            );

            const validacion = distancia <= config.radioMetros ? 'Aceptada' : 'Rechazada';

            const validacionCorrecta =
                (posicionEsperada === 'Dentro' && validacion === 'Aceptada') ||
                (posicionEsperada === 'Fuera' && validacion === 'Rechazada');

            const resultado = {
                Fecha_Hora: new Date().toISOString(),
                Escenario: escenario,
                Conexion: conexion,
                VPN: vpn,
                Posicion_Esperada: posicionEsperada,
                Latitud: posicion.coords.latitude.toFixed(6),
                Longitud: posicion.coords.longitude.toFixed(6),
                Precision_m: posicion.coords.accuracy.toFixed(2),
                Tiempo_Obtencion_ms: (finUbicacion - inicioUbicacion).toFixed(2),
                Tiempo_Consulta_Config_ms: (finConsulta - inicioConsulta).toFixed(2),
                Distancia_m: distancia.toFixed(2),
                Radio_Geocerca_m: config.radioMetros,
                Validacion: validacion,
                Validacion_Correcta: validacionCorrecta ? 'Sí' : 'No',
                Error: ''
            };

            console.table([resultado]);
            guardarResultado(resultado);
            setEstado(`Prueba registrada: ${validacion}.`);
        } catch (error) {
            const resultadoError = {
                Fecha_Hora: new Date().toISOString(),
                Escenario: escenario,
                Conexion: conexion,
                VPN: vpn,
                Posicion_Esperada: posicionEsperada,
                Latitud: '',
                Longitud: '',
                Precision_m: '',
                Tiempo_Obtencion_ms: '',
                Tiempo_Consulta_Config_ms: '',
                Distancia_m: '',
                Radio_Geocerca_m: '',
                Validacion: 'Error',
                Validacion_Correcta: 'No',
                Error: error.message
            };

            console.table([resultadoError]);
            guardarResultado(resultadoError);
            setEstado(`Error registrado: ${error.message}`);
        }
    };

    const descargarCSV = () => {
        if (resultados.length === 0) return;

        const columnas = [
            'Fecha_Hora', 'Escenario', 'Conexion', 'VPN', 'Posicion_Esperada',
            'Latitud', 'Longitud', 'Precision_m', 'Tiempo_Obtencion_ms',
            'Tiempo_Consulta_Config_ms', 'Distancia_m', 'Radio_Geocerca_m',
            'Validacion', 'Validacion_Correcta', 'Error'
        ];

        const escaparCSV = (valor) => `"${String(valor ?? '').replaceAll('"', '""')}"`;

        const contenido = [
            columnas.join(','),
            ...resultados.map((fila) =>
                columnas.map((columna) => escaparCSV(fila[columna])).join(',')
            )
        ].join('\n');

        const archivo = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(archivo);
        const enlace = document.createElement('a');

        enlace.href = url;
        enlace.download = 'resultados-geocerca.csv';
        enlace.click();

        URL.revokeObjectURL(url);
    };

    const limpiarResultados = () => {
        if (!window.confirm('¿Deseas eliminar todos los resultados guardados?')) return;

        localStorage.removeItem(CLAVE_RESULTADOS);
        setResultados([]);
        setEstado('Resultados eliminados.');
    };

    return (
        <div style={{ maxWidth: '720px', margin: '40px auto', padding: '24px' }}>
            <h2>Pruebas de geocerca</h2>
            <p>Resultados guardados: <strong>{resultados.length}</strong></p>

            <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                <label>
                    Escenario
                    <input
                        value={escenario}
                        onChange={(e) => setEscenario(e.target.value)}
                        placeholder="Ejemplo: E1"
                    />
                </label>

                <label>
                    Conexión configurada
                    <select value={conexion} onChange={(e) => setConexion(e.target.value)}>
                        <option>Wi-Fi</option>
                        <option>Datos móviles</option>
                    </select>
                </label>

                <label>
                    VPN configurada
                    <select value={vpn} onChange={(e) => setVpn(e.target.value)}>
                        <option>No</option>
                        <option>Sí</option>
                    </select>
                </label>

                <label>
                    Posición física esperada
                    <select
                        value={posicionEsperada}
                        onChange={(e) => setPosicionEsperada(e.target.value)}
                    >
                        <option>Dentro</option>
                        <option>Fuera</option>
                    </select>
                </label>
            </div>

            <button onClick={ejecutarPrueba}>Ejecutar una prueba</button>
            <button onClick={descargarCSV} style={{ marginLeft: '10px' }}>
                Descargar CSV
            </button>
            <button onClick={limpiarResultados} style={{ marginLeft: '10px' }}>
                Limpiar resultados
            </button>

            <p style={{ marginTop: '20px' }}>{estado}</p>
        </div>
    );
};

export default PruebaGeocerca;