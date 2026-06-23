import { useState, useEffect } from 'react';
import axios from 'axios';

export const useAsistencias = () => {
    const [data, setData] = useState([]);

    const fetchAsistencias = async () => {
        try {
            // Asumiendo que crearás este endpoint en tu AsistenciaController en Java
            const response = await axios.get('http://localhost:8080/api/asistencias/todas');
            setData(response.data);
        } catch (error) {
            console.error("Error al traer asistencias:", error);
        }
    };

    useEffect(() => { fetchAsistencias(); }, []);
    return { data, refetch: fetchAsistencias };
};