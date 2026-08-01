import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Mail, Key } from 'lucide-react';
import './Login.css'; // Reutilizamos los estilos del login

const RestablecerPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Extraemos automáticamente los datos de la URL
    const tokenUrl = searchParams.get('token') || '';
    const correoUrl = searchParams.get('correo') || '';

    const [nuevaPassword, setNuevaPassword] = useState('');
    const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
    const [procesando, setProcesando] = useState(false);

    useEffect(() => {
        if (!tokenUrl || !correoUrl) {
            setMensaje({ texto: 'Enlace inválido. Faltan parámetros de seguridad.', tipo: 'error' });
        }
    }, [tokenUrl, correoUrl]);

    const manejarSubmit = async (e) => {
        e.preventDefault();
        setProcesando(true);
        setMensaje({ texto: '', tipo: '' });

        try {
            const respuesta = await fetch('http://localhost:8080/api/auth/restablecer-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo: correoUrl, token: tokenUrl, nuevaPassword: nuevaPassword })
            });

            if (respuesta.ok) {
                setMensaje({ texto: 'Contraseña actualizada exitosamente. Redirigiendo...', tipo: 'exito' });
                setTimeout(() => navigate('/login'), 3000);
            } else {
                const errorTexto = await respuesta.text();
                setMensaje({ texto: errorTexto, tipo: 'error' });
            }
        } catch (error) {
            setMensaje({ texto: 'Error de conexión con el servidor.', tipo: 'error' });
        } finally {
            setProcesando(false);
        }
    };

    return (
        <div className="login-page-bg" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="login-form-side" style={{ backgroundColor: 'white', padding: '40px', borderRadius: '10px', maxWidth: '450px', width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <h2 className="login-title">Crear Nueva Contraseña</h2>
                <p className="login-subtitle">Ingresa tu nueva credencial de acceso.</p>

                {mensaje.texto && (
                    <div className={mensaje.tipo === 'error' ? "alert-error" : "alert-success"} style={{ backgroundColor: mensaje.tipo === 'exito' ? '#dcfce7' : '#fee2e2', color: mensaje.tipo === 'exito' ? '#166534' : '#991b1b', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
                        {mensaje.texto}
                    </div>
                )}

                <form onSubmit={manejarSubmit}>
                    {/* Campos Bloqueados de Solo Lectura */}
                    <div className="form-group" style={{ opacity: 0.7 }}>
                        <Mail className="input-icon-left" size={18} />
                        <input type="text" className="form-input" value={correoUrl} disabled />
                    </div>
                    <div className="form-group" style={{ opacity: 0.7 }}>
                        <Key className="input-icon-left" size={18} />
                        <input type="text" className="form-input" value={tokenUrl ? tokenUrl.substring(0, 15) + "..." : ""} disabled title="Token de seguridad oculto" />
                    </div>

                    {/* Campo para nueva contraseña */}
                    <div className="form-group">
                        <Lock className="input-icon-left" size={18} />
                        <input type="password" className="form-input" placeholder="Nueva Contraseña" value={nuevaPassword} onChange={(e) => setNuevaPassword(e.target.value)} required minLength="6" disabled={!tokenUrl || !correoUrl} />
                    </div>

                    <button type="submit" className="btn-submit" disabled={procesando || !tokenUrl || !correoUrl}>
                        {procesando ? 'ACTUALIZANDO...' : 'GUARDAR CONTRASEÑA'}
                    </button>

                    <button type="button" onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', width: '100%', marginTop: '15px' }}>
                        Volver al Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RestablecerPassword;