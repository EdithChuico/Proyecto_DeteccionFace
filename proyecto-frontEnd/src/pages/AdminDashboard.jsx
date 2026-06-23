import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { Users, Activity, AlertTriangle, Camera, Check, Loader2, MapPin, Crosshair, LogOut } from 'lucide-react';
import './AdminDashboard.css';
import { apiFetch } from '../api';
import Estadisticas from '../components/Estadisticas';

const AdminDashboard = () => {
    const navigate = useNavigate();
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState({ id: '', nombre: '', estado: 'Activo' });
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

    const cerrarSesion = () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_nombre');
        localStorage.removeItem('admin_foto');
        navigate('/login');
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
                            const respuesta = await apiFetch('http://localhost:8080/api/empleados/enrolar', {
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
                        <AlertTriangle size={20} /> Multas (Inhabilitada)
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

                {/*  MODAL DE EDICIÓN Y DESACTIVACIÓN */}
                {isModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3 className="modal-header">Modificar Datos de Trabajador</h3>
                            <form onSubmit={guardarCambiosEmpleado}>

                                <div className="form-group">
                                    <label className="form-label">Cédula / ID (Solo lectura):</label>
                                    {/* La cédula está deshabilitada porque cambiar la Primary Key en SQL puede romper las relaciones de asistencia */}
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