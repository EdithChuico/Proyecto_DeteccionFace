import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { ScanFace, CheckCircle, Loader2, MapPinOff, XCircle } from 'lucide-react';
import './EmpleadoView.css';

// -------------------------------------------------------------------
// 1. EL SUJETO REAL: Componente que SOLO maneja la cámara y la IA
// -------------------------------------------------------------------
const ScannerBiometrico = () => {
    const webcamRef = useRef(null);
    const [estado, setEstado] = useState('ESPERANDO'); // ESPERANDO, PROCESANDO, CONFIRMADO, RECHAZADO
    const [datosRegistro, setDatosRegistro] = useState(null);
    const [idEmpleadoInput, setIdEmpleadoInput] = useState('');
    const [mensajeError, setMensajeError] = useState('');
    const [tipoMarcacion, setTipoMarcacion] = useState('ENTRADA');

    const capturarYEnviar = useCallback(async () => {
        if (!idEmpleadoInput.trim()) {
            setMensajeError("Por favor, ingrese su ID o Cédula antes de escanear el rostro.");
            setEstado('RECHAZADO');
            return;
        }

        const fotoBase64 = webcamRef.current.getScreenshot();
        setEstado('PROCESANDO');

        try {
            const respuesta = await fetch('http://localhost:8080/api/asistencias/marcar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ empleadoId: idEmpleadoInput, fotoBase64: fotoBase64, tipoMarcacion: tipoMarcacion })
            });

            if (respuesta.ok) {
                const ahora = new Date();
                setDatosRegistro({
                    hora: ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    fecha: ahora.toLocaleDateString()
                });
                setEstado('CONFIRMADO');

                setTimeout(() => {
                    setEstado('ESPERANDO');
                    setDatosRegistro(null);
                    setIdEmpleadoInput('');
                }, 4000);
            } else {
                const errorTexto = await respuesta.text();
                setMensajeError(errorTexto);
                setEstado('RECHAZADO');
            }
        } catch (error) {
            setMensajeError("No se pudo conectar con el servidor. Verifique su red.");
            setEstado('RECHAZADO');
        }
    }, [webcamRef, idEmpleadoInput, tipoMarcacion]);

    if (estado === 'PROCESANDO') return (
        <div className="pantalla-mensaje bg-esperando">
            <Loader2 size={50} className="spinner" color="#2563eb" style={{ marginBottom: '10px' }} />
            <p style={{ fontWeight: 'bold', color: '#1e293b' }}>Validando identidad...</p>
            <p style={{ fontSize: '12px', color: '#64748b' }}>IA trabajando, por favor espere</p>
        </div>
    );

    if (estado === 'CONFIRMADO' && datosRegistro) return (
        <div className="pantalla-mensaje bg-exito">
            <CheckCircle size={55} style={{ marginBottom: '10px', color: '#22c55e' }} />
            <p style={{ fontSize: '18px', fontWeight: 'bold' }}>¡Asistencia Registrada!</p>
            <p className="texto-hora">{datosRegistro.hora}</p>
            <p style={{ fontSize: '14px', opacity: 0.8 }}>{datosRegistro.fecha}</p>
        </div>
    );

    if (estado === 'RECHAZADO') return (
        <div className="pantalla-mensaje bg-error">
            <XCircle size={55} style={{ marginBottom: '15px', color: '#e11d48' }} />
            <p style={{ fontSize: '18px', fontWeight: 'bold' }}>Verificación Fallida</p>
            <p className="texto-error">{mensajeError}</p>
            <button onClick={() => { setEstado('ESPERANDO'); setIdEmpleadoInput(''); }} className="btn-reintentar">
                Intentar de nuevo
            </button>
        </div>
    );

    // Estado ESPERANDO (Por defecto)
    return (
        <>
            <input type="text" placeholder="Ingrese su Cédula / ID" value={idEmpleadoInput} onChange={(e) => setIdEmpleadoInput(e.target.value)} className="input-cedula" />
            <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: 'bold', color: '#1e293b' }}>
                    ¿Qué tipo de registro vas a realizar?
                </label>
                <select
                    className="form-input"
                    value={tipoMarcacion}
                    onChange={(e) => setTipoMarcacion(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}
                >
                    <option value="ENTRADA">Entrada (Inicio de jornada)</option>
                    <option value="SALIDA_ALMUERZO">Salida al Almuerzo</option>
                    <option value="REGRESO_ALMUERZO">Regreso del Almuerzo</option>
                    <option value="SALIDA_JUSTIFICADA">Salida Justificada (Cita médica, permiso)</option>
                    <option value="SALIDA">Salida (Fin de jornada)</option>
                </select>
            </div>
            <div className="camara-container">
                <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: "user" }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div className="overlay-rostro"></div>
            </div>
            <button onClick={capturarYEnviar} className="btn-principal btn-esperando">
                <ScanFace size={20} /> Escanear Rostro
            </button>
        </>
    );
};

// -------------------------------------------------------------------
// 2. EL PROXY (Escudo): SOLO maneja GPS. Decide si muestra la cámara o no.
// -------------------------------------------------------------------
const calcularDistancia = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const ProxyGeocerca = ({ children }) => {
    const [estadoGps, setEstadoGps] = useState('VERIFICANDO'); // VERIFICANDO, DENTRO_RANGO, FUERA_RANGO
    const [distanciaAprox, setDistanciaAprox] = useState(null);
    const [radioPermitido, setRadioPermitido] = useState(100);

    useEffect(() => {
        let idRastreoGps;
        let idIntervaloBd;

        const validarAcceso = async (coords) => {
            try {
                const respuesta = await fetch('http://localhost:8080/api/configuracion');
                const configBD = await respuesta.json();
                setRadioPermitido(configBD.radioMetros);

                const distancia = calcularDistancia(coords.latitude, coords.longitude, configBD.latitud, configBD.longitud);
                setDistanciaAprox(Math.round(distancia));
                setEstadoGps(distancia <= configBD.radioMetros ? 'DENTRO_RANGO' : 'FUERA_RANGO');
            } catch (error) {
                console.error("Error validando seguridad:", error);
                setEstadoGps('FUERA_RANGO');
            }
        };

        if ("geolocation" in navigator) {
            idRastreoGps = navigator.geolocation.watchPosition(
                (position) => {
                    validarAcceso(position.coords);
                    if (idIntervaloBd) clearInterval(idIntervaloBd);
                    idIntervaloBd = setInterval(() => validarAcceso(position.coords), 5000);
                },
                () => setEstadoGps('FUERA_RANGO'),
                { enableHighAccuracy: true, maximumAge: 0 }
            );
        } else {
            setEstadoGps('FUERA_RANGO');
        }

        const socket = new WebSocket('ws://localhost:8080/ws/geo');
        socket.onmessage = (event) => {
            if (event.data === 'REFRESH_GEO') {
                navigator.geolocation.getCurrentPosition(
                    (position) => validarAcceso(position.coords),
                    (error) => console.error(error),
                    { enableHighAccuracy: true }
                );
            }
        };

        return () => {
            if (idRastreoGps) navigator.geolocation.clearWatch(idRastreoGps);
            if (idIntervaloBd) clearInterval(idIntervaloBd);
            socket.close();
        };
    }, []);

    // El Proxy intercepta la visualización
    if (estadoGps === 'VERIFICANDO') return (
        <div className="pantalla-mensaje bg-esperando">
            <Loader2 size={40} className="spinner" color="#64748b" style={{ marginBottom: '10px' }} />
            <p style={{ fontWeight: 'bold' }}>Obteniendo señal GPS...</p>
        </div>
    );

    if (estadoGps === 'FUERA_RANGO') return (
        <>
            <div className="camara-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="pantalla-mensaje bg-error" style={{ height: '100%', width: '100%', borderRadius: '15px' }}>
                    <MapPinOff size={50} style={{ marginBottom: '10px' }} />
                    <p style={{ fontWeight: 'bold' }}>Acceso Denegado</p>
                    <p style={{ fontSize: '13px', marginTop: '5px' }}>Estás a <strong>{distanciaAprox} metros</strong> de la empresa.</p>
                    <p style={{ fontSize: '12px', marginTop: '5px' }}>Acércate al perímetro de {radioPermitido}m para marcar.</p>
                </div>
            </div>
            <button disabled className="btn-principal btn-deshabilitado">Ubicación Insegura</button>
        </>
    );

    // Si el Proxy da luz verde, renderiza a sus hijos (El Scanner)
    return children;
};


const ConsultarYPaypal = () => {
    const [cedula, setCedula] = useState('');
    const [deuda, setDeuda] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [pagando, setPagando] = useState(false);
    const paypalClientId = process.env.REACT_APP_PAYPAL_CLIENT_ID;

    const consultarDeuda = async () => {
        if (!cedula) return alert("Ingresa tu cédula");
        setCargando(true);
        try {
            const res = await fetch(`http://localhost:8080/api/asistencias/deuda/${encodeURIComponent(cedula.trim())}`);
            if (!res.ok) throw new Error('No se pudo consultar la deuda');
            const datos = await res.json();
            setDeuda(Number(datos.total) || 0);
        } catch (error) {
            alert("Error consultando deuda");
        }
        setCargando(false);
    };

    const manejarPagoExitoso = async () => {
        setPagando(true);
        try {
            // 1. Llamamos a Spring Boot para limpiar la deuda real
            const res = await fetch(`http://localhost:8080/api/asistencias/pagar/${encodeURIComponent(cedula.trim())}`, {
                method: 'POST'
            });

            // 2. Si Spring Boot falla, detenemos todo y lanzamos error
            if (!res.ok) {
                throw new Error('Spring Boot no pudo procesar el borrado de la deuda.');
            }

            // 3. Si todo sale bien, actualizamos la pantalla
            alert("¡Pago procesado con éxito en PayPal Sandbox! Deuda liquidada en el sistema.");
            setDeuda(0);

        } catch (error) {
            console.error("Error al actualizar la base de datos:", error);
            alert("El pago se hizo en PayPal, pero hubo un error de conexión con la Base de Datos para borrar la multa.");
        }
        setPagando(false);
    };

    return (
        <div style={{ padding: '20px', border: '1px solid #cbd5e1', borderRadius: '10px', marginTop: '20px', backgroundColor: '#f8fafc' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>Pagar Multas Acumuladas</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <input
                    type="text"
                    placeholder="Ingrese Cédula"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    className="input-cedula"
                    style={{ flex: 1, margin: 0 }}
                />
                <button onClick={consultarDeuda} className="btn-secundario" style={{ margin: 0 }}>
                    {cargando ? 'Buscando...' : 'Consultar'}
                </button>
            </div>

            {deuda !== null && (
                <div style={{ textAlign: 'center' }}>
                    {deuda > 0 ? (
                        <>
                            <h2 style={{ color: '#e11d48', marginBottom: '15px' }}>Deuda total: ${deuda.toFixed(2)}</h2>

                            {paypalClientId ? (
                                <PayPalScriptProvider options={{
                                    'client-id': paypalClientId,
                                    currency: 'USD',
                                    intent: 'capture'
                                }}>
                                    <PayPalButtons
                                        disabled={pagando}
                                        forceReRender={[deuda]}
                                        createOrder={(data, actions) => actions.order.create({
                                            purchase_units: [{
                                                description: `Pago de multas - empleado ${cedula.trim()}`,
                                                amount: { currency_code: 'USD', value: deuda.toFixed(2) }
                                            }]
                                        })}
                                        onApprove={async (data, actions) => {
                                            const order = await actions.order.capture();
                                            if (order.status !== 'COMPLETED') {
                                                throw new Error('PayPal no confirmó el pago.');
                                            }
                                            await manejarPagoExitoso();
                                        }}
                                        onError={() => alert('PayPal no pudo iniciar el pago. Intenta de nuevo.')}
                                        onCancel={() => alert('Pago cancelado. Tu deuda no fue modificada.')}
                                    />
                                </PayPalScriptProvider>
                            ) : (
                                <p role="alert" style={{ color: '#e11d48', margin: 0 }}>
                                    Configura REACT_APP_PAYPAL_CLIENT_ID en el archivo .env del frontend para habilitar PayPal.
                                </p>
                            )}

                            <button
                                hidden
                                onClick={manejarPagoExitoso}
                                disabled={pagando}
                                style={{
                                    backgroundColor: '#ffc439',
                                    color: '#111',
                                    padding: '12px 24px',
                                    borderRadius: '25px',
                                    border: 'none',
                                    fontWeight: 'bold',
                                    width: '100%',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                            >
                                {pagando ? 'Conectando con PayPal...' : `💳 Pagar $${deuda.toFixed(2)} con PayPal`}
                            </button>
                        </>
                    ) : (
                        <h3 style={{ color: '#22c55e' }}>¡Felicidades! No tienes multas pendientes.</h3>
                    )}
                </div>
            )}
        </div>
    );
};

// -------------------------------------------------------------------
// 3. LA VISTA PRINCIPAL
// -------------------------------------------------------------------
const EmpleadoView = () => {
    return (
        <div className="empleado-container">
            <div className="empleado-card">
                <h2 className="titulo">Registro de Asistencia</h2>

                {/* Aplicación directa del Patrón Proxy */}
                <ProxyGeocerca>
                    <ScannerBiometrico />
                </ProxyGeocerca>
                <ConsultarYPaypal />
            </div>
        </div>
    );
};

export default EmpleadoView;