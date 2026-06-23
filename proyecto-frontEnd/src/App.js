import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import EmpleadoView from './pages/EmpleadoView';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container" style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
        <Routes>
          {/* Ruta por defecto redirige al empleado */}
          <Route path="/" element={<Navigate to="/empleado" />} />

          {/* Vista del Empleado (Marcaje) */}
          <Route path="/empleado" element={<EmpleadoView />} />

          {/* Vista del Administrador (Dashboard y CRUD) */}
          <Route path="/admin/*" element={<AdminDashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;