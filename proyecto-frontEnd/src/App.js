import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import EmpleadoView from './pages/EmpleadoView';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login'; // Asegúrate de que esta ruta coincida con donde guardaste Login.jsx

// Protege las rutas comprobando el LocalStorage
const RutaProtegidaAdmin = ({ children }) => {
  // Ahora buscamos el token real
  const token = localStorage.getItem('admin_token');

  // Si no hay token, lo mandamos al login
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <div className="app-container" style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
        <Routes>
          {/* Ruta por defecto redirige al empleado (Acceso Público) */}
          <Route path="/" element={<Navigate to="/empleado" />} />

          {/* Vista del Empleado (Marcaje) - Acceso Público */}
          <Route path="/empleado" element={<EmpleadoView />} />

          {/* Vista de Login de Google - Acceso Público */}
          <Route path="/login" element={<Login />} />

          {/* Vista del Administrador (Dashboard y CRUD)*/}
          <Route
            path="/admin/*"
            element={
              <RutaProtegidaAdmin>
                <AdminDashboard />
              </RutaProtegidaAdmin>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;