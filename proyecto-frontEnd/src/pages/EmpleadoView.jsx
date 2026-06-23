import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { ScanFace, CheckCircle, Loader2, MapPinOff, XCircle } from 'lucide-react';
import './EmpleadoView.css'; // ¡Llamamos al CSS externo!

const calcularDistancia = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const EmpleadoView = () => {
    const webcamRef = useRef(null);
    const [estado, setEstado] = useState('VERIFICANDO_UBICACION');
    const [datosRegistro, setDatosRegistro] = useState(null);
    const [distanciaAprox, setDistanciaAprox] = useState(null);
    const [radioPermitido, setRadioPermitido] = useState(100);
    const [idEmpleadoInput, setIdEmpleadoInput] = useState('');
    const [mensajeError, setMensajeError] = useState('');

    useEffect(() => {
        let idRastreoGps;
        let idIntervaloBd;

        const validarAcceso = async (coords) => {
            try {
                const respuesta = await fetch('http://localhost:8080/api/configuracion');
                const configBD = await respuesta.json();
                setRadioPermitido(configBD.radioMetros);

                const distancia = calcularDistancia(
                    coords.latitude, coords.longitude,
                    configBD.latitud, configBD.longitud
                );
                setDistanciaAprox(Math.round(distancia));

                setEstado(estadoActual => {
                    if (estadoActual === 'PROCESANDO' || estadoActual === 'CONFIRMADO' || estadoActual === 'RECHAZADO') return estadoActual;
                    return distancia <= configBD.radioMetros ? 'ESPERANDO' : 'FUERA_DE_RANGO';
                });

            } catch (error) {
                console.error("Error validando seguridad:", error);
                setEstado('FUERA_DE_RANGO');
            }
        };

        if ("geolocation" in navigator) {
            idRastreoGps = navigator.geolocation.watchPosition(
                (position) => {
                    const coords = position.coords;
                    validarAcceso(coords);
                    if (idIntervaloBd) clearInterval(idIntervaloBd);
                    idIntervaloBd = setInterval(() => validarAcceso(coords), 5000);
                },
                () => setEstado('FUERA_DE_RANGO'),
                { enableHighAccuracy: true, maximumAge: 0 }
            );
        } else {
            setEstado('FUERA_DE_RANGO');
        }

        return () => {
            if (idRastreoGps) navigator.geolocation.clearWatch(idRastreoGps);
            if (idIntervaloBd) clearInterval(idIntervaloBd);
        };
    }, []);

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
                body: JSON.stringify({ empleadoId: idEmpleadoInput, fotoBase64: fotoBase64 })
            });

            if (respuesta.ok) {
                const ahora = new Date();
                const horaFormateada = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const fechaFormateada = ahora.toLocaleDateString();

                setDatosRegistro({ hora: horaFormateada, fecha: fechaFormateada });
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
            console.error("Error conectando con el servidor", error);
            setMensajeError("No se pudo conectar con el servidor. Verifique su conexión.");
            setEstado('RECHAZADO');
        }
    }, [webcamRef, idEmpleadoInput]);

    return (
        <div className="empleado-container">
            <div className="empleado-card">

                <h2 className="titulo">Registro de Asistencia</h2>

                {estado === 'ESPERANDO' && (
                    <input
                        type="text"
                        placeholder="Ingrese su Cédula / ID"
                        value={idEmpleadoInput}
                        onChange={(e) => setIdEmpleadoInput(e.target.value)}
                        className="input-cedula"
                    />
                )}

                <div className="camara-container">
                    {estado === 'VERIFICANDO_UBICACION' && (
                        <div className="pantalla-mensaje bg-esperando">
                            <Loader2 size={40} className="spinner" color="#64748b" style={{ marginBottom: '10px' }} />
                            <p style={{ fontWeight: 'bold' }}>Obteniendo señal GPS...</p>
                        </div>
                    )}

                    {estado === 'FUERA_DE_RANGO' && (
                        <div className="pantalla-mensaje bg-error">
                            <MapPinOff size={50} style={{ marginBottom: '10px' }} />
                            <p style={{ fontWeight: 'bold' }}>Acceso Denegado</p>
                            <p style={{ fontSize: '13px', marginTop: '5px' }}>Estás a <strong>{distanciaAprox} metros</strong> de la empresa.</p>
                            <p style={{ fontSize: '12px', marginTop: '5px' }}>Acércate al perímetro de {radioPermitido}m para marcar.</p>
                        </div>
                    )}

                    {estado === 'RECHAZADO' && (
                        <div className="pantalla-mensaje bg-error">
                            <XCircle size={55} style={{ marginBottom: '15px', color: '#e11d48' }} />
                            <p style={{ fontSize: '18px', fontWeight: 'bold' }}>Verificación Fallida</p>
                            <p className="texto-error">{mensajeError}</p>

                            <button
                                onClick={() => { setEstado('ESPERANDO'); setIdEmpleadoInput(''); }}
                                className="btn-reintentar"
                            >
                                Intentar de nuevo
                            </button>
                        </div>
                    )}

                    {estado === 'ESPERANDO' && (
                        <>
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                videoConstraints={{ facingMode: "user" }}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div className="overlay-rostro"></div>
                        </>
                    )}

                    {estado === 'PROCESANDO' && (
                        <div className="pantalla-mensaje bg-esperando">
                            <Loader2 size={50} className="spinner" color="#2563eb" style={{ marginBottom: '10px' }} />
                            <p style={{ fontWeight: 'bold', color: '#1e293b' }}>Validando identidad...</p>
                            <p style={{ fontSize: '12px', color: '#64748b' }}>IA trabajando, por favor espere</p>
                        </div>
                    )}

                    {estado === 'CONFIRMADO' && datosRegistro && (
                        <div className="pantalla-mensaje bg-exito">
                            <CheckCircle size={55} style={{ marginBottom: '10px', color: '#22c55e' }} />
                            <p style={{ fontSize: '18px', fontWeight: 'bold' }}>¡Asistencia Registrada!</p>
                            <p className="texto-hora">{datosRegistro.hora}</p>
                            <p style={{ fontSize: '14px', opacity: 0.8 }}>{datosRegistro.fecha}</p>
                        </div>
                    )}
                </div>

                <button
                    onClick={capturarYEnviar}
                    disabled={estado !== 'ESPERANDO'}
                    className={`btn-principal ${estado === 'ESPERANDO' ? 'btn-esperando' : 'btn-deshabilitado'}`}
                >
                    <ScanFace size={20} />
                    {estado === 'FUERA_DE_RANGO' ? 'Ubicación Insegura' :
                        estado === 'RECHAZADO' ? 'Acceso Bloqueado' :
                            estado === 'VERIFICANDO_UBICACION' ? 'Buscando GPS...' :
                                estado === 'ESPERANDO' ? 'Escanear Rostro' : 'Espere...'}
                </button>

            </div>
        </div>
    );
};

export default EmpleadoView;