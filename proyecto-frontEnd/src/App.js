import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import EmpleadoView from './pages/EmpleadoView';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';

const RutaProtegidaAdmin = ({ children }) => {
  const token = localStorage.getItem('admin_token');

  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <div className="app-container" style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
        <Routes>

          <Route path="/" element={<Navigate to="/empleado" />} />

          <Route path="/empleado" element={<EmpleadoView />} />

          <Route path="/login" element={<Login />} />

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