import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Users, Activity, AlertTriangle, Camera, Check, Loader2, MapPin, Crosshair } from 'lucide-react';
import './AdminDashboard.css';
import Estadisticas from '../components/Estadisticas';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('configuracion');
    const [listaEmpleados, setListaEmpleados] = useState([]);
    const [listaAsistencias, setListaAsistencias] = useState([]);

    // ESTADOS PARA LA GEOCERCA
    const [latitud, setLatitud] = useState('-0.253039');
    const [longitud, setLongitud] = useState('-79.175355');
    const [radio, setRadio] = useState('100');

    // Estados para la cámara y el formulario de enrolamiento automatizado
    const webcamRef = useRef(null);
    const [nombre, setNombre] = useState('');
    const [idEmpleado, setIdEmpleado] = useState('');
    const [contadorFotos, setContadorFotos] = useState(0);
    const [enrolando, setEnrolando] = useState(false);
    const [registroCompleto, setRegistroCompleto] = useState(false);

    // CARGAR DATOS REALES DE EMPLEADOS
    const cargarDatos = async () => {
        try {
            // Promesas en paralelo para optimizar el tiempo de respuesta
            const [resEmp, resAsist] = await Promise.all([
                fetch('http://localhost:8080/api/empleados/todos'),
                fetch('http://localhost:8080/api/asistencias/todas')
            ]);

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

    // FUNCIÓN PARA OBTENER UBICACIÓN ACTUAL DEL ADMIN
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

    const guardarGeocercaEnBD = async () => {
        try {
            const respuesta = await fetch('http://localhost:8080/api/configuracion', {
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
        if (!nombre.trim() || !idEmpleado.trim()) {
            alert("Por favor, ingresa la Cédula/ID y el Nombre Completo antes de iniciar.");
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
                            const respuesta = await fetch('http://localhost:8080/api/empleados/enrolar', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    empleadoId: idEmpleado,
                                    nombre: nombre,
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

    return (
        <div className="admin-container">
            {/* MENÚ LATERAL */}
            <aside className="admin-sidebar">
                <h2>Admin Panel</h2>
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
                    <button className="nav-btn">
                        <AlertTriangle size={20} /> Multas
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
                                <input type="text" placeholder="Ej. 1726354120" value={idEmpleado} onChange={(e) => setIdEmpleado(e.target.value)} disabled={enrolando || registroCompleto} className="input-text" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nombre Completo:</label>
                                <input type="text" placeholder="Ej. Edith Chuico" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={enrolando || registroCompleto} className="input-text" />
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


                {activeTab === 'estadisticas' && (
                    <section className="admin-section">
                        {/* Nuestro nuevo Dashboard Corporativo */}
                        <Estadisticas />

                        {/* La tabla la puedes colocar justo debajo del Dashboard */}
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
                                        // Extraer el registro más reciente de asistencia para este empleado
                                        const asistenciasEmpleado = listaAsistencias.filter(a => a.empleadoId === emp.id);
                                        const ultimaAsistencia = asistenciasEmpleado.length > 0
                                            ? asistenciasEmpleado.reduce((prev, current) => (new Date(prev.fechaHora) > new Date(current.fechaHora)) ? prev : current)
                                            : null;

                                        // Formatear los datos extraídos
                                        const horaIngreso = ultimaAsistencia
                                            ? new Date(ultimaAsistencia.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            : "Sin registro";
                                        const estado = ultimaAsistencia ? ultimaAsistencia.estado : "Inactivo";
                                        const multa = ultimaAsistencia ? `$${ultimaAsistencia.multa.toFixed(2)}` : "$0.00";

                                        // Determinar la clase visual
                                        const badgeClass = (estado === "A Tiempo" || estado === "Puntual")
                                            ? "badge-success"
                                            : (estado === "Inactivo" ? "" : "badge-danger");

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
                                                    <span className={`badge ${badgeClass}`} style={estado === "Inactivo" ? { backgroundColor: '#e2e8f0', color: '#475569' } : {}}>
                                                        {estado}
                                                    </span>
                                                </td>
                                                <td>{multa}</td>
                                                <td>
                                                    <button className="btn-accion btn-editar">Editar</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

            </main>
        </div>
    );
};

export default AdminDashboard;