import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import API from '../api/client';
import { analyticsService } from '../services/analytics.service';
import { toast } from 'react-toastify';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export default function OperatorStatsDashboard() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [statsData, setStatsData] = useState([]);
    const [roles, setRoles] = useState([]);
    const [activeRole, setActiveRole] = useState(null);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            
            // Fetch both stats and all available employee roles in parallel
            const [statsRes, rolesRes] = await Promise.all([
                analyticsService.getOperatorStats(),
                API.get('/employee-roles').catch(() => ({ data: [] }))
            ]);
            
            const stats = statsRes;
            setStatsData(stats);
            
            // Generate list of roles: first all HR roles, then any roles present in stats that might not be in HR roles (like 'Líder de Línea')
            const hrRoles = rolesRes.data.map(r => r.name);
            const statsRoles = [...new Set(stats.map(item => item.role))];
            
            const combinedRoles = [...new Set([...hrRoles, ...statsRoles])].sort();
            setRoles(combinedRoles);
            
            if (combinedRoles.length > 0) {
                setActiveRole(combinedRoles[0]);
            }
        } catch (error) {
            console.error('Error loading operator stats:', error);
            toast.error(t('operatorStats.loadError', 'Error al cargar las estadísticas.'));
        } finally {
            setLoading(false);
        }
    };

    const getChartData = (roleData) => {
        return {
            labels: roleData.map(item => item.name),
            datasets: [
                {
                    label: t('operatorStats.lblProduced', 'Producidas'),
                    data: roleData.map(item => item.total_produced),
                    backgroundColor: 'rgba(34, 197, 94, 0.7)', // green
                    borderColor: 'rgb(34, 197, 94)',
                    borderWidth: 1,
                },
                {
                    label: t('operatorStats.lblDamaged', 'Dañadas / Faltantes'),
                    data: roleData.map(item => item.total_damaged),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)', // red
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 1,
                }
            ],
        };
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
            }
        }
    };

    const activeRoleData = statsData.filter(item => item.role === activeRole);

    return (
        <>
            <div className="content-header mb-3">
                <h1 style={{ fontWeight: 700 }}>
                    <i className="fas fa-chart-bar mr-2 text-primary"></i>{t('operatorStats.pageTitle', 'Dashboard Estadística')}
                </h1>
                <small className="text-muted">{t('operatorStats.pageSubtitle', 'Rendimiento y estadísticas de operadores por rol')}</small>
            </div>

            {loading ? (
                <div className="text-center pt-5">
                    <i className="fas fa-spinner fa-spin fa-2x text-secondary"></i>
                </div>
            ) : roles.length === 0 ? (
                <div className="text-center py-5 text-muted">
                    <i className="fas fa-chart-pie fa-3x mb-3 text-light"></i>
                    <h5>{t('operatorStats.emptyTitle', 'Sin Datos Disponibles')}</h5>
                    <p>{t('operatorStats.emptySubtitle', 'Aún no hay registros de producción suficientes para generar estadísticas.')}</p>
                </div>
            ) : (
                <div className="card shadow-sm border-0" style={{ borderRadius: '12px' }}>
                    <div className="card-header bg-white border-bottom p-0" style={{ borderRadius: '12px 12px 0 0' }}>
                        <ul className="nav nav-tabs border-bottom-0" style={{ padding: '16px 16px 0 16px' }}>
                            {roles.map((role, idx) => (
                                <li className="nav-item" key={idx}>
                                    <button
                                        className={`nav-link ${activeRole === role ? 'active font-weight-bold' : ''}`}
                                        style={{
                                            borderTop: activeRole === role ? '3px solid #4f46e5' : 'none',
                                            color: activeRole === role ? '#4f46e5' : '#6b7280',
                                            cursor: 'pointer',
                                            background: activeRole === role ? '#fff' : 'transparent',
                                            borderBottom: activeRole === role ? 'none' : '1px solid transparent'
                                        }}
                                        onClick={() => setActiveRole(role)}
                                    >
                                        <i className="fas fa-user-tag mr-2"></i>{role}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    
                    <div className="card-body bg-light" style={{ borderRadius: '0 0 12px 12px' }}>
                        {activeRoleData.length === 0 ? (
                            <div className="text-center py-5">
                                <i className="fas fa-inbox fa-3x mb-3 text-muted"></i>
                                <h5 className="text-muted">{t('operatorStats.noDataRole', 'No hay datos de producción para este rol')}</h5>
                            </div>
                        ) : (
                            <div className="row">
                                {/* Gráfico */}
                                <div className="col-12 mb-4">
                                    <div className="card border-0 shadow-sm">
                                        <div className="card-body">
                                            <h5 className="font-weight-bold mb-3" style={{ color: '#0f172a' }}>
                                                {t('operatorStats.chartTitle', 'Comparativa de Producción')} - {activeRole}
                                            </h5>
                                            <div style={{ height: '350px' }}>
                                                <Bar options={chartOptions} data={getChartData(activeRoleData)} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tabla de Datos */}
                                <div className="col-12">
                                    <div className="card border-0 shadow-sm">
                                        <div className="card-body p-0">
                                            <div className="table-responsive">
                                                <table className="table table-hover table-striped mb-0">
                                                    <thead className="thead-light">
                                                        <tr>
                                                            <th>{t('operatorStats.colName', 'Nombre')}</th>
                                                            <th>{t('operatorStats.colRole', 'Descripción de Rol')}</th>
                                                            <th className="text-center">{t('operatorStats.colOrders', 'Órdenes Trabajadas')}</th>
                                                            <th className="text-center text-success">{t('operatorStats.colProduced', 'Unidades Producidas')}</th>
                                                            <th className="text-center text-danger">{t('operatorStats.colDamaged', 'Unidades Dañadas')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {activeRoleData.map((row, idx) => (
                                                            <tr key={idx}>
                                                                <td className="font-weight-bold align-middle">{row.name}</td>
                                                                <td className="align-middle">
                                                                    <span className="badge badge-secondary">{row.role}</span>
                                                                </td>
                                                                <td className="text-center align-middle font-weight-bold">{row.orders_worked}</td>
                                                                <td className="text-center align-middle text-success font-weight-bold">{row.total_produced}</td>
                                                                <td className="text-center align-middle text-danger font-weight-bold">{row.total_damaged}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
