import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
// Añadimos AlertCircle para el modal de error
import { Users, Activity, AlertTriangle, Camera, Check, Loader2, MapPin, Crosshair, LogOut, AlertCircle } from 'lucide-react';
import './AdminDashboard.css';
import { apiFetch } from '../api';
import Estadisticas from '../components/Estadisticas';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('estadisticas');
    const [listaEmpleados, setListaEmpleados] = useState([]);
    const [listaAsistencias, setListaAsistencias] = useState([]);
    const [correo, setCorreo] = useState('');
    // ESTADO PARA EL MODAL GLOBAL DE SESIÓN
    const [sesionExpirada, setSesionExpirada] = useState(false);

    // NUEVOS ESTADOS PARA REPORTES (PDF)
    const [empleadoReporte, setEmpleadoReporte] = useState('TODOS');
    const [mesReporte, setMesReporte] = useState(new Date().getMonth() + 1);
    const [anioReporte, setAnioReporte] = useState(new Date().getFullYear());
    const [enviandoReportes, setEnviandoReportes] = useState(false);

    // ESTADOS PARA LA GEOCERCA
    const [latitud, setLatitud] = useState('-0.253039');
    const [longitud, setLongitud] = useState('-79.175355');
    const [radio, setRadio] = useState('100');

    const webcamRef = useRef(null);
    const [errorCedula, setErrorCedula] = useState('');
    const [nombre, setNombre] = useState('');
    const [idEmpleado, setIdEmpleado] = useState('');
    const [contadorFotos, setContadorFotos] = useState(0);
    const [enrolando, setEnrolando] = useState(false);
    const [registroCompleto, setRegistroCompleto] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState({ id: '', nombre: '', estado: 'Activo' });

    // ✨ EL VIGILANTE SUPREMO DE LA SESIÓN ✨
    // Revisa silenciosamente cada 5 segundos si el token ya caducó
    useEffect(() => {
        const verificarVigenciaToken = () => {
            const token = localStorage.getItem('admin_token');
            if (!token) return;

            try {
                // Decodificamos la carga útil del JWT (la parte central) para leer la fecha de expiración (exp)
                const payloadCodificado = token.split('.')[1];
                const payloadDecodificado = JSON.parse(atob(payloadCodificado));

                // exp viene en segundos, lo pasamos a milisegundos
                const tiempoExpiracion = payloadDecodificado.exp * 1000;

                if (Date.now() >= tiempoExpiracion) {
                    setSesionExpirada(true);
                }
            } catch (error) {
                console.error("Error validando la sesión:", error);
            }
        };

        const idIntervalo = setInterval(verificarVigenciaToken, 5000);
        return () => clearInterval(idIntervalo); // Limpiamos al salir
    }, []);

    const validarCedulaEcuatoriana = (cedula) => {
        if (!cedula || cedula.length !== 10 || !/^\d+$/.test(cedula)) return false;
        const provincia = parseInt(cedula.substring(0, 2), 10);
        if ((provincia < 1 || provincia > 24) && provincia !== 30) return false;
        const tercerDigito = parseInt(cedula.substring(2, 3), 10);
        if (tercerDigito >= 6) return false;
        const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
        let suma = 0;
        for (let i = 0; i < coeficientes.length; i++) {
            let valor = parseInt(cedula.charAt(i), 10) * coeficientes[i];
            suma += valor > 9 ? valor - 9 : valor;
        }
        const digitoVerificadorEsperado = suma % 10 === 0 ? 0 : 10 - (suma % 10);
        const digitoVerificadorReal = parseInt(cedula.charAt(9), 10);
        return digitoVerificadorEsperado === digitoVerificadorReal;
    };

    const cargarDatos = async () => {
        try {
            const [resEmp, resAsist] = await Promise.all([
                apiFetch('http://localhost:8080/api/empleados/todos'),
                apiFetch('http://localhost:8080/api/asistencias/todas')
            ]);
            if (!resEmp || !resAsist) return;
            const dataEmp = await resEmp.json();
            const dataAsist = await resAsist.json();

            setListaEmpleados(dataEmp);
            setListaAsistencias(dataAsist);
        } catch (error) {
            console.error("Error en la extracción de datos:", error);
        }
    };

    useEffect(() => {
        if (activeTab === 'estadisticas') {
            cargarDatos();
        }
    }, [activeTab]);

    const obtenerUbicacionActual = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLatitud(pos.coords.latitude.toFixed(6));
                    setLongitud(pos.coords.longitude.toFixed(6));
                },
                () => alert("Por favor, permite el acceso a la ubicación en tu navegador.")
            );
        } else {
            alert("Tu navegador no soporta geolocalización.");
        }
    };

    const cerrarSesion = () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_nombre');
        localStorage.removeItem('admin_foto');
        navigate('/login');
    };

    const enviarReportes = async () => {
        setEnviandoReportes(true);
        try {
            const respuesta = await apiFetch('http://localhost:8080/api/reportes/enviar', {
                method: 'POST',
                body: JSON.stringify({
                    empleadoId: empleadoReporte,
                    mes: parseInt(mesReporte),
                    anio: parseInt(anioReporte)
                })
            });

            if (respuesta && respuesta.ok) {
                alert("¡Los reportes PDF se están generando y enviando en segundo plano! Revisa los correos en unos momentos.");
            } else {
                alert("Hubo un error al solicitar el envío de reportes al servidor.");
            }
        } catch (error) {
            console.error("Error al enviar reportes:", error);
            alert("Fallo de red al intentar conectar con el servidor.");
        } finally {
            setEnviandoReportes(false);
        }
    };

    const guardarGeocercaEnBD = async () => {
        try {
            const respuesta = await apiFetch('http://localhost:8080/api/configuracion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    latitud: parseFloat(latitud),
                    longitud: parseFloat(longitud),
                    radioMetros: parseInt(radio)
                })
            });

            if (respuesta.ok) {
                alert("¡Configuración guardada de verdad en PostgreSQL!");
            } else {
                alert("Error al intentar guardar la configuración en el backend.");
            }
        } catch (error) {
            console.error("Error conectando al backend:", error);
            alert("No se pudo conectar con el servidor Spring Boot.");
        }
    };

    const iniciarRafagaCaptura = async () => {
        setErrorCedula('');
        if (!nombre.trim() || !idEmpleado.trim()) {
            alert("Por favor, ingresa la Cédula/ID y el Nombre Completo antes de iniciar.");
            return;
        }
        if (!validarCedulaEcuatoriana(idEmpleado)) {
            setErrorCedula('Cédula ecuatoriana inválida. Verifique los dígitos.');
            return;
        }
        setEnrolando(true);
        setRegistroCompleto(false);
        setContadorFotos(0);

        let fotosAcumuladas = [];

        const intervalo = setInterval(async () => {
            if (webcamRef.current) {
                const fotoBase64 = webcamRef.current.getScreenshot();
                if (fotoBase64) {
                    fotosAcumuladas.push(fotoBase64);
                    setContadorFotos(fotosAcumuladas.length);

                    if (fotosAcumuladas.length >= 3) {
                        clearInterval(intervalo);

                        try {
                            const respuesta = await apiFetch('http://localhost:8080/api/empleados/enrolar', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    empleadoId: idEmpleado,
                                    nombre: nombre,
                                    correo: correo,
                                    fotosBase64: fotosAcumuladas
                                })
                            });

                            if (respuesta.ok) {
                                setEnrolando(false);
                                setRegistroCompleto(true);
                            } else {
                                const textoError = await respuesta.text();
                                alert("El servidor rechazó los datos: " + textoError);
                                setEnrolando(false);
                            }
                        } catch (error) {
                            console.error("Error conectando con el backend:", error);
                            alert("Fallo de red al intentar guardar.");
                            setEnrolando(false);
                        }
                    }
                }
            }
        }, 400);
    };

    const reiniciarRegistro = () => {
        setNombre('');
        setIdEmpleado('');
        setContadorFotos(0);
        setRegistroCompleto(false);
    };

    const abrirEditarModal = (emp) => {
        setEmpleadoSeleccionado({ id: emp.id, nombre: emp.nombre, estado: emp.estado || 'Activo' });
        setIsModalOpen(true);
    };

    const guardarCambiosEmpleado = async (e) => {
        e.preventDefault();
        const adminNombre = localStorage.getItem('admin_nombre') || "Admin Desconocido";

        try {
            const respuesta = await apiFetch(`http://localhost:8080/api/empleados/actualizar/${empleadoSeleccionado.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: empleadoSeleccionado.nombre,
                    estado: empleadoSeleccionado.estado,
                    modificadoPor: adminNombre
                })
            });

            if (respuesta && respuesta.ok) {
                setIsModalOpen(false);
                cargarDatos();
            } else {
                alert("Error al actualizar la información del trabajador.");
            }
        } catch (error) {
            console.error(error);
            alert("Fallo de red al intentar conectar con el servidor.");
        }
    };

    return (
        <div className="admin-container">

            {/* ✨ MODAL DE SESIÓN EXPIRADA (Global) ✨ */}
            {sesionExpirada && (
                <div
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)' }}
                    onClick={cerrarSesion}
                >
                    <div
                        style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <AlertCircle size={50} color="#e11d48" style={{ margin: '0 auto 15px auto' }} />
                        <h3 style={{ color: '#0f172a', fontSize: '20px', marginBottom: '10px' }}>Su sesión ha expirado</h3>
                        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '25px' }}>
                            Por su seguridad, el acceso fue revocado. Debe iniciar sesión nuevamente para continuar.
                        </p>
                        <button
                            onClick={cerrarSesion}
                            style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '6px', fontWeight: 'bold', width: '100%', cursor: 'pointer' }}
                        >
                            Aceptar e Iniciar Sesión
                        </button>
                    </div>
                </div>
            )}

            {/* MENÚ LATERAL */}
            <aside className="admin-sidebar">
                <h2>Panel de Administrador</h2>
                <nav className="admin-nav">
                    <button onClick={() => setActiveTab('estadisticas')} className={`nav-btn ${activeTab === 'estadisticas' ? 'activo' : ''}`}>
                        <Activity size={20} /> Monitoreo en Vivo
                    </button>
                    <button onClick={() => setActiveTab('registro')} className={`nav-btn ${activeTab === 'registro' ? 'activo' : ''}`}>
                        <Users size={20} /> Nuevo Empleado
                    </button>
                    <button onClick={() => setActiveTab('configuracion')} className={`nav-btn ${activeTab === 'configuracion' ? 'activo' : ''}`}>
                        <MapPin size={20} /> Geocerca GPS
                    </button>
                    <button onClick={() => setActiveTab('multas')} className={`nav-btn ${activeTab === 'multas' ? 'activo' : ''}`}>
                        <AlertTriangle size={20} /> Generar Multas (PDF)
                    </button>
                    <button onClick={cerrarSesion} className="nav-btn">
                        <LogOut size={20} /> Cerrar Sesión
                    </button>
                </nav>
            </aside>

            {/* ÁREA DE CONTENIDO PRINCIPAL */}
            <main className="admin-main">
                {activeTab === 'registro' && (
                    <section className="admin-section">
                        <h2>Enrolamiento Automatizado para IA</h2>
                        <p className="text-muted">
                            Ingrese los datos del empleado. Al iniciar, el sistema capturará 3 fotos nítidas optimizadas para el modelo de Inteligencia Artificial (DeepFace).
                        </p>

                        <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', marginTop: '20px' }}>
                            <div className="form-group">
                                <label className="form-label">ID / Cédula:</label>
                                <input
                                    type="text"
                                    placeholder="Ej. 1726354120"
                                    value={idEmpleado}
                                    onChange={(e) => {
                                        setIdEmpleado(e.target.value);
                                        if (errorCedula) setErrorCedula('');
                                    }}
                                    disabled={enrolando || registroCompleto}
                                    className={`input-text ${errorCedula ? 'input-error' : ''}`}
                                    style={errorCedula ? { borderColor: '#ef4444' } : {}}
                                />
                                {errorCedula && (
                                    <span style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px', display: 'block', fontWeight: '500' }}>
                                        {errorCedula}
                                    </span>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nombre Completo:</label>
                                <input type="text" placeholder="Ej. Edith Chuico" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={enrolando || registroCompleto} className="input-text" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
                                <label style={{ fontWeight: 'bold', marginBottom: '5px', color: '#1f2937' }}>Correo Electrónico:</label>
                                <input
                                    type="email"
                                    placeholder="Ej. usuario@espe.edu.ec"
                                    value={correo}
                                    onChange={(e) => setCorreo(e.target.value)}
                                    style={{ padding: '8px', border: '1px solid #3b82f6', borderRadius: '4px' }}
                                />
                            </div>
                        </div>

                        <div className="enrolamiento-container">
                            <div className="camara-wrapper">
                                {!registroCompleto ? (
                                    <div className="camara-box">
                                        <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: "user" }} style={{ width: '100%', display: 'block' }} />
                                    </div>
                                ) : (
                                    <div className="exito-box">
                                        <Check size={50} style={{ marginBottom: '10px' }} />
                                        <h3>¡Enrolamiento Completo!</h3>
                                        <p>Se guardaron 3 fotos en el <strong>Storage de PocketBase</strong> (Nube) ☁️</p>
                                    </div>
                                )}

                                {enrolando && (
                                    <div className="progress-overlay">
                                        <Loader2 size={40} style={{ animation: 'spin 2s linear infinite', color: '#2563eb' }} />
                                        <h3 style={{ margin: '10px 0 0 0', color: '#1e293b' }}>Creando Dataset...</h3>
                                        <p style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '18px' }}>{contadorFotos} / 3 imágenes</p>
                                        <div className="progress-bar-bg">
                                            <div className="progress-bar-fill" style={{ width: `${(contadorFotos / 3) * 100}%` }}></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
                                <div className="info-panel">
                                    <h4 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>Instrucciones Técnicas:</h4>
                                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '14px', lineHeight: '1.6' }}>
                                        <li>Las capturas se envían de forma segura y encriptada a PocketBase Storage.</li>
                                        <li>Se utiliza DeepFace, por lo que solo se requieren 3 capturas de alta calidad.</li>
                                        <li>Se aplicará la consistencia en el backend mapeando los archivos al ID de PostgreSQL.</li>
                                        <li>Evite ocluir el rostro (lentes pesados, gorras) durante el proceso.</li>
                                    </ul>
                                </div>

                                {!registroCompleto ? (
                                    <button onClick={iniciarRafagaCaptura} disabled={enrolando} className="btn-captura">
                                        <Camera size={20} />
                                        {enrolando ? `Capturando (${contadorFotos}/3)` : 'Iniciar Captura Automática'}
                                    </button>
                                ) : (
                                    <button onClick={reiniciarRegistro} className="btn-secundario">
                                        Registrar Otro Empleado
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === 'configuracion' && (
                    <section className="admin-section">
                        <h2>Configuración de la Geocerca (GPS)</h2>
                        <p className="text-muted">Define el perímetro seguro. Los empleados solo podrán habilitar su cámara si se encuentran dentro de este radio.</p>

                        <div className="geocerca-container">
                            <div className="geocerca-form">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <button onClick={obtenerUbicacionActual} className="btn-outline">
                                        <Crosshair size={18} color="#2563eb" />
                                        Capturar Mi Ubicación Actual
                                    </button>

                                    <div className="divider"></div>

                                    <div className="form-group">
                                        <label className="form-label">Latitud de la Sucursal:</label>
                                        <input type="number" step="any" value={latitud} onChange={(e) => setLatitud(e.target.value)} className="input-text" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Longitud de la Sucursal:</label>
                                        <input type="number" step="any" value={longitud} onChange={(e) => setLongitud(e.target.value)} className="input-text" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Radio Permitido (Metros):</label>
                                        <input type="number" value={radio} onChange={(e) => setRadio(e.target.value)} className="input-text" />
                                    </div>

                                    <button onClick={guardarGeocercaEnBD} className="btn-captura" style={{ marginTop: '10px', width: '100%' }}>
                                        Guardar Configuración en BD
                                    </button>
                                </div>
                            </div>

                            <div className="mapa-wrapper">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    scrolling="no"
                                    marginHeight="0"
                                    marginWidth="0"
                                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(longitud) - 0.005},${parseFloat(latitud) - 0.005},${parseFloat(longitud) + 0.005},${parseFloat(latitud) + 0.005}&layer=mapnik&marker=${latitud},${longitud}`}
                                    style={{ border: 'none' }}
                                    title="Mapa Geocerca"
                                ></iframe>
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === 'multas' && (
                    <section className="admin-section">
                        <h2>Generación y Envío de Reportes (PDF)</h2>
                        <p className="text-muted">
                            Selecciona un trabajador o envíalo a todos. El sistema generará el PDF con las asistencias y multas del mes y lo enviará por correo automáticamente gracias a la cola asíncrona.
                        </p>

                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label className="form-label">Seleccionar Trabajador:</label>
                            <select
                                className="select-custom"
                                value={empleadoReporte}
                                onChange={(e) => setEmpleadoReporte(e.target.value)}
                            >
                                <option value="TODOS">Todos los Empleados (Envío Masivo)</option>
                                {listaEmpleados.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.nombre} - {emp.id}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Mes:</label>
                                <select
                                    className="select-custom"
                                    value={mesReporte}
                                    onChange={(e) => setMesReporte(e.target.value)}
                                >
                                    <option value="1">Enero</option>
                                    <option value="2">Febrero</option>
                                    <option value="3">Marzo</option>
                                    <option value="4">Abril</option>
                                    <option value="5">Mayo</option>
                                    <option value="6">Junio</option>
                                    <option value="7">Julio</option>
                                    <option value="8">Agosto</option>
                                    <option value="9">Septiembre</option>
                                    <option value="10">Octubre</option>
                                    <option value="11">Noviembre</option>
                                    <option value="12">Diciembre</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Año:</label>
                                <input
                                    type="number"
                                    className="input-text"
                                    value={anioReporte}
                                    onChange={(e) => setAnioReporte(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            onClick={enviarReportes}
                            disabled={enviandoReportes}
                            className="btn-captura"
                            style={{ marginTop: '25px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                        >
                            {enviandoReportes ? (
                                <>
                                    <Loader2 size={20} style={{ animation: 'spin 2s linear infinite' }} />
                                    Procesando envío asíncrono...
                                </>
                            ) : (
                                'Generar y Enviar Reportes PDF'
                            )}
                        </button>
                    </section>
                )}

                {activeTab === 'estadisticas' && (
                    <section className="admin-section">
                        <Estadisticas />

                        <div className="tabla-container" style={{ marginTop: '20px' }}>
                            <table className="tabla-asistencias">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Empleado</th>
                                        <th>Hora de Ingreso</th>
                                        <th>Estado</th>
                                        <th>Multa</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {listaEmpleados.map((emp) => {
                                        const asistenciasEmpleado = listaAsistencias.filter(a => a.empleadoId === emp.id);
                                        const ultimaAsistencia = asistenciasEmpleado.length > 0
                                            ? asistenciasEmpleado.reduce((prev, current) => (new Date(prev.fechaHora) > new Date(current.fechaHora)) ? prev : current)
                                            : null;

                                        const horaIngreso = ultimaAsistencia
                                            ? new Date(ultimaAsistencia.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            : "Sin registro";

                                        const estadoTrabajador = emp.estado || "Activo";
                                        const multa = ultimaAsistencia ? `$${ultimaAsistencia.multa.toFixed(2)}` : "$0.00";

                                        const badgeClass = estadoTrabajador === "Activo" ? "badge-success" : "badge-danger";

                                        return (
                                            <tr key={emp.id}>
                                                <td>#{emp.id}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div className="avatar-placeholder">👤</div>
                                                        {emp.nombre}
                                                    </div>
                                                </td>
                                                <td>{horaIngreso}</td>
                                                <td>
                                                    <span className={`badge ${badgeClass}`} style={estadoTrabajador === "Inactivo" ? { backgroundColor: '#e2e8f0', color: '#475569' } : {}}>
                                                        {estadoTrabajador}
                                                    </span>
                                                </td>
                                                <td>{multa}</td>
                                                <td>
                                                    <button onClick={() => abrirEditarModal(emp)} className="btn-accion btn-editar">Editar</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* MODAL DE EDICIÓN Y DESACTIVACIÓN */}
                {isModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3 className="modal-header">Modificar Datos de Trabajador</h3>
                            <form onSubmit={guardarCambiosEmpleado}>

                                <div className="form-group">
                                    <label className="form-label">Cédula / ID (Solo lectura):</label>
                                    <input type="text" className="input-text" value={empleadoSeleccionado.id} disabled style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} />
                                </div>

                                <div className="form-group" style={{ marginTop: '15px' }}>
                                    <label className="form-label">Nombre Completo:</label>
                                    <input
                                        type="text"
                                        className="input-text"
                                        value={empleadoSeleccionado.nombre}
                                        onChange={(e) => setEmpleadoSeleccionado({ ...empleadoSeleccionado, nombre: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group" style={{ marginTop: '15px' }}>
                                    <label className="form-label">Estado de la Cuenta:</label>
                                    <select
                                        className="select-custom"
                                        value={empleadoSeleccionado.estado}
                                        onChange={(e) => setEmpleadoSeleccionado({ ...empleadoSeleccionado, estado: e.target.value })}
                                    >
                                        <option value="Activo">Activo (Habilitado para marcar)</option>
                                        <option value="Inactivo">Inactivo (Desactivado del sistema)</option>
                                    </select>
                                </div>

                                <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secundario" style={{ padding: '8px 16px', backgroundColor: '#94a3b8', color: 'white', border: 'none', borderRadius: '5px' }}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn-captura" style={{ padding: '8px 16px', margin: 0, border: 'none', borderRadius: '5px' }}>
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminDashboard;