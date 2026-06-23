// src/api.js
export const apiFetch = async (url, options = {}) => {
    const token = localStorage.getItem('admin_token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        alert("Tu sesión ha expirado. Por favor, inicia sesión de nuevo.");
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_nombre');
        window.location.href = '/login';
        return null;
    }

    return response;
};