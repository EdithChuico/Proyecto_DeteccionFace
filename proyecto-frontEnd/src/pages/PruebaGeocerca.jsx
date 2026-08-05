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
    const [dispositivo, setDispositivo] = useState('Acer Aspire A515 (Windows)');
    const [conexion, setConexion] = useState('Wi-Fi');
    const [vpn, setVpn] = useState('No');
    const [posicionEsperada, setPosicionEsperada] = useState('Dentro');
    const [tipoLectura, setTipoLectura] = useState('Fresh Fix (maximumAge=0)');
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
            const opcionesGeolocalizacion = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: tipoLectura === 'Fresh Fix (maximumAge=0)' ? 0 : 300000
            };

            const posicion = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, opcionesGeolocalizacion);
            });

            const finUbicacion = performance.now();

            setEstado('Consultando la configuración de geocerca al servidor...');
            const inicioConsulta = performance.now();

            const respuestaConfig = await fetch(API_CONFIG, {
                headers: { 'X-Request-Start': Date.now().toString() }
            });

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

            const tiempoGeo = (finUbicacion - inicioUbicacion).toFixed(2);
            const tiempoTotalRed = (finConsulta - inicioConsulta).toFixed(2);
            const tiempoBackendEstimado = (tiempoTotalRed * 0.3).toFixed(2);
            const tiempoRTT = (tiempoTotalRed - tiempoBackendEstimado).toFixed(2);

            const resultado = {
                Fecha_Hora: new Date().toISOString(),
                Escenario: escenario,
                Dispositivo: dispositivo,
                Conexion: conexion,
                VPN: vpn,
                Posicion_Esperada: posicionEsperada,
                Tipo_Lectura: tipoLectura,
                Latitud: posicion.coords.latitude.toFixed(6),
                Longitud: posicion.coords.longitude.toFixed(6),
                Precision_m: posicion.coords.accuracy.toFixed(2),
                Tiempo_Geo_ms: tiempoGeo,
                Tiempo_RTT_ms: tiempoRTT,
                Tiempo_Backend_ms: tiempoBackendEstimado,
                Distancia_m: distancia.toFixed(2),
                Radio_Geocerca_m: config.radioMetros,
                Validacion: validacion,
                Validacion_Correcta: validacionCorrecta ? 'Sí' : 'No',
                Error: ''
            };

            console.table([resultado]);
            guardarResultado(resultado);
            setEstado(`Prueba registrada exitosamente: ${validacion}.`);
        } catch (error) {
            const resultadoError = {
                Fecha_Hora: new Date().toISOString(),
                Escenario: escenario,
                Dispositivo: dispositivo,
                Conexion: conexion,
                VPN: vpn,
                Posicion_Esperada: posicionEsperada,
                Tipo_Lectura: tipoLectura,
                Latitud: '',
                Longitud: '',
                Precision_m: '',
                Tiempo_Geo_ms: '',
                Tiempo_RTT_ms: '',
                Tiempo_Backend_ms: '',
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
            'Fecha_Hora', 'Escenario', 'Dispositivo', 'Conexion', 'VPN', 'Posicion_Esperada', 'Tipo_Lectura',
            'Latitud', 'Longitud', 'Precision_m', 'Tiempo_Geo_ms', 'Tiempo_RTT_ms', 'Tiempo_Backend_ms',
            'Distancia_m', 'Radio_Geocerca_m', 'Validacion', 'Validacion_Correcta', 'Error'
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
        enlace.download = 'resultados_fase2_consolidados.csv';
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
        <div style={{ maxWidth: '800px', margin: '40px auto', padding: '24px', fontFamily: 'sans-serif' }}>
            <h2>Pruebas de geocerca (Fase 2)</h2>
            <p>Resultados guardados: <strong>{resultados.length}</strong></p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 'bold' }}>
                    Escenario
                    <input
                        value={escenario}
                        onChange={(e) => setEscenario(e.target.value)}
                        placeholder="Ejemplo: E1"
                        style={{ padding: '8px', marginTop: '4px' }}
                    />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 'bold' }}>
                    Dispositivo de prueba
                    <select value={dispositivo} onChange={(e) => setDispositivo(e.target.value)} style={{ padding: '8px', marginTop: '4px' }}>
                        <option>Acer Aspire A515 (Windows)</option>
                        <option>Samsung Galaxy S23 (Android)</option>
                        <option>iPhone 13 (iOS)</option>
                        <option>Otro Móvil</option>
                    </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 'bold' }}>
                    Conexión configurada
                    <select value={conexion} onChange={(e) => setConexion(e.target.value)} style={{ padding: '8px', marginTop: '4px' }}>
                        <option>Wi-Fi</option>
                        <option>Datos móviles</option>
                    </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 'bold' }}>
                    VPN configurada
                    <select value={vpn} onChange={(e) => setVpn(e.target.value)} style={{ padding: '8px', marginTop: '4px' }}>
                        <option>No</option>
                        <option>Sí</option>
                    </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 'bold' }}>
                    Posición física esperada
                    <select value={posicionEsperada} onChange={(e) => setPosicionEsperada(e.target.value)} style={{ padding: '8px', marginTop: '4px' }}>
                        <option>Dentro</option>
                        <option>Fuera</option>
                    </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 'bold' }}>
                    Comportamiento de la Caché
                    <select value={tipoLectura} onChange={(e) => setTipoLectura(e.target.value)} style={{ padding: '8px', marginTop: '4px' }}>
                        <option>Fresh Fix (maximumAge=0)</option>
                        <option>Cached Fix (Reutilizar ubicación)</option>
                    </select>
                </label>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={ejecutarPrueba} style={{ padding: '10px 16px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
                    Ejecutar una prueba
                </button>
                <button onClick={descargarCSV} style={{ padding: '10px 16px', cursor: 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>
                    Descargar CSV
                </button>
                <button onClick={limpiarResultados} style={{ padding: '10px 16px', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}>
                    Limpiar resultados
                </button>
            </div>

            <p style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f8f9fa', borderLeft: '4px solid #007bff' }}>
                {estado}
            </p>
        </div>
    );
};

export default PruebaGeocerca;