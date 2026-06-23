import React, { useState } from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import './Login.css';
import imagenLogin from '../assets/fondo_login.jpg';

const Login = () => {
    const navigate = useNavigate();
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [errorAcceso, setErrorAcceso] = useState('');
    const [procesando, setProcesando] = useState(false);

    // REEMPLAZA ESTO CON TU ID REAL
    const GOOGLE_CLIENT_ID = "626481499479-gi7fsp4so1vqop36cs9sppjg4q3clhnm.apps.googleusercontent.com";

    const formularioLleno = correo.trim() !== '' && password.trim() !== '';

    // MÉTODO 1: Login Tradicional ESPE
    const manejarLoginPassword = async (e) => {
        e.preventDefault();
        if (!formularioLleno) return;

        setErrorAcceso('');
        setProcesando(true);

        try {
            const respuesta = await fetch('http://localhost:8080/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, password })
            });

            if (respuesta.ok) {
                const datosSesion = await respuesta.json();
                localStorage.setItem('admin_token', datosSesion.token);
                localStorage.setItem('admin_nombre', datosSesion.nombre);
                navigate('/admin');
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

    // MÉTODO 2: Login Google OAuth
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
                localStorage.setItem('admin_foto', datosSesion.foto);
                navigate('/admin');
            } else {
                const mensajeError = await respuestaBackend.text();
                setErrorAcceso(mensajeError);
            }
        } catch (error) {
            setErrorAcceso("Error en la verificación del token de Google.");
        }
    };

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <div className="login-page-bg">
                <div className="login-split-card">


                    <div style={{ backgroundImage: `url(${imagenLogin})` }} className="login-image-side"></div>

                    {/* LADO DERECHO: Formulario */}
                    <div className="login-form-side">
                        <h2 className="login-title">Welcome!</h2>
                        <p className="login-subtitle">Sign in to your Account - AnalizerReview</p>

                        {errorAcceso && (
                            <div className="alert-error">
                                {errorAcceso}
                            </div>
                        )}

                        <form onSubmit={manejarLoginPassword}>
                            {/* Campo Correo */}
                            <div className="form-group">
                                <Mail className="input-icon-left" size={18} />
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="Email Address"
                                    value={correo}
                                    onChange={(e) => setCorreo(e.target.value)}
                                />
                            </div>

                            {/* Campo Contraseña */}
                            <div className="form-group">
                                <Lock className="input-icon-left" size={18} />
                                <input
                                    type={mostrarPassword ? "text" : "password"}
                                    className="form-input"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setMostrarPassword(!mostrarPassword)}
                                    title={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                >
                                    {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {/* Olvidé mi contraseña */}
                            <div className="forgot-password-container">
                                <button
                                    type="button"
                                    className="forgot-password"
                                    onClick={() => alert("Contacte a soporte técnico (ESPE) para restablecer credenciales.")}
                                >
                                    Forgot Password?
                                </button>
                            </div>

                            {/* Botón Ingresar Único */}
                            <button
                                type="submit"
                                className="btn-submit"
                                disabled={procesando}
                            >
                                {procesando ? 'SIGNING IN...' : 'SIGN IN'}
                            </button>
                        </form>

                        {/* Divisor */}
                        <div className="divider-container">
                            <span>OR LOGIN WITH</span>
                        </div>

                        {/* Botón Google - Usamos shape="pill" para mantener el diseño circular/redondeado */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <GoogleLogin
                                onSuccess={manejarExitoGoogle}
                                onError={() => setErrorAcceso("La autenticación de Google falló.")}
                                theme="outline"
                                shape="pill"
                                text="signin_with"
                            />
                        </div>

                    </div>
                </div>
            </div>
        </GoogleOAuthProvider>
    );
};

export default Login;