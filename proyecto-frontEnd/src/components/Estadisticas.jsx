import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { apiFetch } from '../api';
import './Estadisticas.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Estadisticas = () => {
    // Estados para guardar los datos de la BDD
    const [asistencias, setAsistencias] = useState([]);
    const [totalEmpleados, setTotalEmpleados] = useState(0);
    const [totalAdmins, setTotalAdmins] = useState(0);


    useEffect(() => {
        const obtenerTotalAdmins = async () => {
            try {
                const respuesta = await apiFetch('http://localhost:8080/api/auth/admins/count');
                if (respuesta.ok) {
                    const total = await respuesta.json();
                    setTotalAdmins(total);
                }
            } catch (error) {
                console.error("Fallo de red al obtener el total de administradores", error);
            }
        };
        obtenerTotalAdmins();
    }, []);

    useEffect(() => {
        const traerDatos = async () => {
            try {
                const resAsist = await apiFetch('http://localhost:8080/api/asistencias/todas');
                const dataAsist = await resAsist.json();
                setAsistencias(dataAsist);

                const resEmp = await apiFetch('http://localhost:8080/api/empleados/todos');
                const dataEmp = await resEmp.json();
                setTotalEmpleados(dataEmp.length);
            } catch (error) {
                console.error("Error cargando BDD:", error);
            }
        };
        traerDatos();
    }, []);

    // ==========================================
    // LÓGICA 1: GRÁFICO DE DONA (GENERAL)
    // ==========================================
    const totalPuntuales = asistencias.filter(a => a.estado === 'Puntual' || a.estado === 'A Tiempo').length;
    const totalTardes = asistencias.filter(a => a.estado === 'Tarde' || a.estado === 'Atraso').length;

    const dataDona = {
        labels: ['Puntual', 'Tarde'],
        datasets: [{
            // Si no hay datos, mostramos un anillo gris de placeholder para que no desaparezca
            data: (totalPuntuales === 0 && totalTardes === 0) ? [1] : [totalPuntuales, totalTardes],
            backgroundColor: (totalPuntuales === 0 && totalTardes === 0) ? ['#e2e8f0'] : ['#3b82f6', '#06b6d4'],
            borderWidth: 2,
        }]
    };

    // ==========================================
    // LÓGICA 2: ÚLTIMOS 4 MESES (BARRAS)
    // ==========================================
    const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const hoy = new Date();

    // Calculamos los nombres de los últimos 4 meses dinámicamente
    const ultimos4Meses = [];
    for (let i = 3; i >= 0; i--) {
        let d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        ultimos4Meses.push({ mes: d.getMonth(), año: d.getFullYear(), nombre: mesesNombres[d.getMonth()] });
    }

    // Contamos las asistencias por mes
    const dataBarrasPuntual = [0, 0, 0, 0];
    const dataBarrasTarde = [0, 0, 0, 0];

    asistencias.forEach(asistencia => {
        const fecha = new Date(asistencia.fechaHora);
        const mesAsistencia = fecha.getMonth();
        const añoAsistencia = fecha.getFullYear();

        ultimos4Meses.forEach((mesObj, index) => {
            if (mesObj.mes === mesAsistencia && mesObj.año === añoAsistencia) {
                if (asistencia.estado === 'Puntual' || asistencia.estado === 'A Tiempo') dataBarrasPuntual[index]++;
                if (asistencia.estado === 'Tarde' || asistencia.estado === 'Atraso') dataBarrasTarde[index]++;
            }
        });
    });

    const dataBarras = {
        labels: ultimos4Meses.map(m => m.nombre), // Ej: ['Marzo', 'Abril', 'Mayo', 'Junio']
        datasets: [
            { label: 'Tarde', data: dataBarrasTarde, backgroundColor: '#cbd5e1' },
            { label: 'Puntual', data: dataBarrasPuntual, backgroundColor: '#3b82f6' }
        ]
    };

    // Configuraciones de visualización
    const optionsDona = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, cutout: '65%' };
    const optionsBarras = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } } } };

    return (
        <div className="dashboard-wrapper">
            {/* KPIs DINÁMICOS */}
            <div className="kpi-grid">
                <div className="kpi-card kpi-bg-blue">
                    <div className="kpi-body">
                        <p className="kpi-number">{totalAdmins}</p>
                        <p className="kpi-label">Administradores</p>
                    </div>
                </div>

                <div className="kpi-card kpi-bg-teal">
                    <div className="kpi-body">
                        <p className="kpi-number">{totalEmpleados}</p>
                        <p className="kpi-label">Empleados</p>
                    </div>
                </div>

                <div className="kpi-card kpi-bg-navy">
                    <div className="kpi-body">
                        <p className="kpi-number">{asistencias.length}</p>
                        <p className="kpi-label">Asistencias Totales</p>
                    </div>
                </div>
            </div>

            {/* GRÁFICOS DINÁMICOS */}
            <div className="charts-grid">
                <div className="chart-panel">
                    <div className="chart-header">
                        <h3 className="chart-title">Asistencia general</h3>
                    </div>
                    <div className="chart-body">
                        <Doughnut data={dataDona} options={optionsDona} />
                    </div>
                </div>

                <div className="chart-panel">
                    <div className="chart-header">
                        <h3 className="chart-title">Asistencia Mensual (Últ. 4 Meses)</h3>
                    </div>
                    <div className="chart-body">
                        <Bar data={dataBarras} options={optionsBarras} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Estadisticas;