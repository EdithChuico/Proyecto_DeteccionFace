import React, { useState } from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, QrCode, KeyRound, ArrowLeft } from 'lucide-react';
import './Login.css';
import imagenLogin from '../assets/fondo_login.jpg';

const Login = () => {
    const navigate = useNavigate();

    // Estados Fase 1: Credenciales
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [errorAcceso, setErrorAcceso] = useState('');
    const [procesando, setProcesando] = useState(false);

    // Estados Fase 2 y 3: Seguridad MFA
    const [fase, setFase] = useState(1); // 1: Credenciales, 2: Elegir Método, 3: Ingresar Código
    const [mfaConfigurado, setMfaConfigurado] = useState(false);
    const [codigoMfa, setCodigoMfa] = useState('');
    const [qrImage, setQrImage] = useState(null);
    const [secretoManual, setSecretoManual] = useState('');
    const [mensajeMfa, setMensajeMfa] = useState('');

    const GOOGLE_CLIENT_ID = "626481499479-gi7fsp4so1vqop36cs9sppjg4q3clhnm.apps.googleusercontent.com";

    // ==========================================
    // FASE 1: VALIDAR CONTRASEÑA
    // ==========================================
    const manejarLoginPassword = async (e) => {
        e.preventDefault();
        if (!correo.trim() || !password.trim()) return;

        setErrorAcceso('');
        setProcesando(true);

        try {
            const respuesta = await fetch('http://localhost:8080/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, password })
            });
            if (!correo.trim() || !password.trim() || !esCorreoValido) {
                setErrorAcceso("Por favor, ingresa un correo válido y tu contraseña.");
                return;
            }
            if (respuesta.ok) {
                const datos = await respuesta.json();
                if (datos.requiereMfa) {
                    // La contraseña es correcta, pasamos a pedir el código
                    setMfaConfigurado(datos.mfaConfigurado);
                    setFase(2);
                }
            } else {
                const textoError = await respuesta.text();
                setErrorAcceso(textoError);
            }
        } catch (error) {
            setErrorAcceso("Fallo de red al conectar con el servidor.");
        } finally {
            setProcesando(false);
        }
    };

    // ==========================================
    // FASE 2: ELEGIR MÉTODO (CORREO O APP)
    // ==========================================
    const solicitarOtpCorreo = async () => {
        setProcesando(true);
        setErrorAcceso('');
        try {
            const res = await fetch('http://localhost:8080/api/auth/enviar-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo })
            });
            if (res.ok) {
                setMensajeMfa("Hemos enviado un código de 6 dígitos a tu correo.");
                setQrImage(null); // Ocultar QR por si acaso
                setFase(3);
            } else {
                setErrorAcceso("Error enviando el correo.");
            }
        } catch (e) {
            setErrorAcceso("Error de conexión.");
        } finally {
            setProcesando(false);
        }
    };

    const usarAppAutenticadora = async () => {
        setProcesando(true);
        setErrorAcceso('');
        try {
            if (mfaConfigurado) {
                // Si ya lo tiene, solo le pedimos el código
                setMensajeMfa("Abre Microsoft/Google Authenticator e ingresa el código.");
                setQrImage(null);
                setFase(3);
            } else {
                // Si es su primera vez, le generamos el QR
                const res = await fetch('http://localhost:8080/api/auth/generar-qr', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo })
                });
                if (res.ok) {
                    const datos = await res.json();
                    setQrImage(datos.qrImage);
                    setSecretoManual(datos.secretoManual);
                    setMensajeMfa("Escanea este código QR con tu App Autenticadora.");
                    setFase(3);
                } else {
                    setErrorAcceso("Error generando el QR.");
                }
            }
        } catch (e) {
            setErrorAcceso("Error de red.");
        } finally {
            setProcesando(false);
        }
    };

    // ==========================================
    // FASE 3: VERIFICAR CÓDIGO Y ENTRAR
    // ==========================================
    const verificarCodigoFinal = async (e) => {
        e.preventDefault();
        setProcesando(true);
        setErrorAcceso('');

        try {
            const res = await fetch('http://localhost:8080/api/auth/verificar-codigo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, codigo: codigoMfa })
            });

            if (res.ok) {
                const datosSesion = await res.json();
                localStorage.setItem('admin_token', datosSesion.token);
                localStorage.setItem('admin_nombre', datosSesion.nombre);
                navigate('/admin');
            } else {
                setErrorAcceso("Código incorrecto o expirado.");
            }
        } catch (e) {
            setErrorAcceso("Error de conexión al verificar el código.");
        } finally {
            setProcesando(false);
        }
    };

    // ==========================================
    // LOGIN GOOGLE (Se mantiene igual)
    // ==========================================
    const manejarExitoGoogle = async (respuestaCredenciales) => {
        setErrorAcceso('');
        try {
            const respuestaBackend = await fetch('http://localhost:8080/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: respuestaCredenciales.credential })
            });

            if (respuestaBackend.ok) {
                const datosSesion = await respuestaBackend.json();
                localStorage.setItem('admin_token', datosSesion.token);
                localStorage.setItem('admin_nombre', datosSesion.nombre);
                navigate('/admin');
            } else {
                const mensajeError = await respuestaBackend.text();
                setErrorAcceso(mensajeError);
            }
        } catch (error) {
            setErrorAcceso("Error en la verificación del token de Google.");
        }
    };
    const [enviandoRecuperacion, setEnviandoRecuperacion] = useState(false);
    const esCorreoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <div className="login-page-bg">
                <div className="login-split-card">

                    <div style={{ backgroundImage: `url(${imagenLogin})` }} className="login-image-side"></div>

                    <div className="login-form-side">

                        {/* BOTÓN VOLVER (Solo en Fases 2 y 3) */}
                        {fase > 1 && (
                            <button className="btn-back" onClick={() => setFase(fase - 1)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '20px' }}>
                                <ArrowLeft size={16} /> Volver
                            </button>
                        )}

                        <h2 className="login-title">
                            {fase === 1 ? 'Bienvenido!' : fase === 2 ? 'Verificación de Seguridad' : 'Ingresa tu Código'}
                        </h2>
                        <p className="login-subtitle">
                            {fase === 1 ? 'Inicie Sesión con su Cuenta - Smart Assistance' : 'Protegiendo tu acceso corporativo.'}
                        </p>

                        {errorAcceso && <div className="alert-error">{errorAcceso}</div>}

                        {/* ==================================================== */}
                        {/* INTERFAZ FASE 1: CREDENCIALES */}
                        {/* ==================================================== */}
                        {fase === 1 && (
                            <>
                                <form onSubmit={manejarLoginPassword}>

                                    {/* Campo Correo (Diseño Corregido) */}
                                    <div style={{ marginBottom: '15px' }}>
                                        <div className="form-group" style={{ marginBottom: '0' }}>
                                            <Mail className="input-icon-left" size={18} />
                                            <input
                                                type="email"
                                                className="form-input"
                                                placeholder="Correo Electrónico"
                                                value={correo}
                                                onChange={(e) => setCorreo(e.target.value)}
                                                required
                                                style={{
                                                    borderColor: correo && !esCorreoValido ? '#ef4444' : '',
                                                    boxShadow: correo && !esCorreoValido ? '0 0 0 1px #ef4444' : 'none',
                                                    outline: 'none'
                                                }}
                                            />
                                        </div>
                                        {/* Validación chiquita por fuera para no dañar el ícono */}
                                        {correo && !esCorreoValido && (
                                            <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px', textAlign: 'left', paddingLeft: '15px', fontWeight: '500' }}>
                                                Formato inválido. Ingresa un correo real (ej. usuario@espe.edu.ec)
                                            </div>
                                        )}
                                    </div>

                                    {/* Campo Contraseña */}
                                    <div className="form-group">
                                        <Lock className="input-icon-left" size={18} />
                                        <input type={mostrarPassword ? "text" : "password"} className="form-input" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
                                        <button type="button" className="password-toggle" onClick={() => setMostrarPassword(!mostrarPassword)}>
                                            {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>

                                    {/* Botón Olvidé mi Contraseña */}
                                    <div className="forgot-password-container">
                                        <button
                                            type="button"
                                            className="forgot-password"
                                            disabled={enviandoRecuperacion}
                                            onClick={async () => {
                                                if (!correo.trim() || !esCorreoValido) {
                                                    setErrorAcceso("Escribe un correo válido en el campo superior primero.");
                                                    return;
                                                }
                                                setEnviandoRecuperacion(true);
                                                setErrorAcceso('');
                                                try {
                                                    await fetch('http://localhost:8080/api/auth/olvide-password', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ correo })
                                                    });
                                                    setErrorAcceso("Si el correo existe, se envió un enlace a tu bandeja.");
                                                } catch (e) {
                                                    setErrorAcceso("Error de red solicitando recuperación.");
                                                } finally {
                                                    setEnviandoRecuperacion(false);
                                                }
                                            }}
                                        >
                                            {enviandoRecuperacion ? "Enviando enlace..." : "¿Olvidó su Contraseña?"}
                                        </button>
                                    </div>

                                    {/* Botón Ingresar Único */}
                                    <button type="submit" className="btn-submit" disabled={procesando}>
                                        {procesando ? 'VERIFICANDO...' : 'INICIAR SESIÓN'}
                                    </button>
                                </form>

                                {/* Divisor y Botón Google */}
                                <div className="divider-container"><span>O INICIAR CON:</span></div>
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <GoogleLogin onSuccess={manejarExitoGoogle} onError={() => setErrorAcceso("Falló Google.")} theme="outline" shape="pill" text="signin_with" />
                                </div>
                            </>
                        )}

                        {/* ==================================================== */}
                        {/* INTERFAZ FASE 2: ELEGIR MÉTODO MFA */}
                        {/* ==================================================== */}
                        {fase === 2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                                <button onClick={solicitarOtpCorreo} disabled={procesando} className="btn-submit" style={{ backgroundColor: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                    <Mail size={20} /> Enviar código a mi Correo
                                </button>

                                <button onClick={usarAppAutenticadora} disabled={procesando} className="btn-submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                    <QrCode size={20} /> Usar App Autenticadora
                                </button>
                            </div>
                        )}

                        {/* ==================================================== */}
                        {/* INTERFAZ FASE 3: INGRESAR CÓDIGO (TOTP o Correo) */}
                        {/* ==================================================== */}
                        {fase === 3 && (
                            <form onSubmit={verificarCodigoFinal} style={{ marginTop: '20px' }}>
                                <div style={{ backgroundColor: '#eff6ff', padding: '15px', borderRadius: '8px', marginBottom: '20px', color: '#1e3a8a', fontSize: '14px', textAlign: 'center' }}>
                                    {mensajeMfa}
                                </div>

                                {/* Si se generó el QR, lo mostramos aquí */}
                                {qrImage && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
                                        <img src={qrImage} alt="Código QR Authenticator" style={{ width: '180px', height: '180px', borderRadius: '10px', border: '2px solid #e2e8f0' }} />
                                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>Clave manual: <b>{secretoManual}</b></p>
                                    </div>
                                )}

                                <div className="form-group">
                                    <KeyRound className="input-icon-left" size={18} color="#2563eb" />
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Código de 6 dígitos"
                                        maxLength="6"
                                        value={codigoMfa}
                                        onChange={(e) => setCodigoMfa(e.target.value.replace(/\D/g, ''))} // Solo permite números
                                        required
                                        style={{ fontSize: '18px', letterSpacing: '4px', textAlign: 'center', paddingLeft: '0' }}
                                    />
                                </div>

                                <button type="submit" className="btn-submit" disabled={procesando || codigoMfa.length !== 6}>
                                    {procesando ? 'VERIFICANDO...' : 'CONFIRMAR Y ENTRAR'}
                                </button>
                            </form>
                        )}

                    </div>
                </div>
            </div>
        </GoogleOAuthProvider>
    );
};

export default Login;