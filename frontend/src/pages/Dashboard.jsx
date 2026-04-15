import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import API from '../api/client';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const STATUS_COLORS = {
    DRAFT: '#6c757d', PENDING_MATERIAL: '#fd7e14', CUTTING: '#007bff',
    BENDING: '#17a2b8', ASSEMBLY: '#6f42c1', WELDING: '#fd7e14', CLEANING: '#20c997',
    PAINTING: '#e94560', QUALITY_CHECK: '#ffc107', READY_FOR_DELIVERY: '#28a745',
    DELIVERED: '#155724', CANCELLED: '#dc3545', DESIGN: '#6610f2', READY: '#28a745'
};

const StatCard = ({ icon, value, label, color }) => (
    <div className="col-lg-3 col-sm-6 mb-4 d-flex align-items-stretch">
        <div className="card w-100 stat-card-hover" style={{ borderLeft: `4px solid ${color}` }}>
            <div className="card-body d-flex align-items-center p-3">
                <div className="mr-3 rounded p-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: '#f8fafc', color: color, width: '60px', height: '60px' }}>
                    <i className={`${icon} fa-2x`}></i>
                </div>
                <div>
                    <h3 className="mb-0 font-weight-bold" style={{ fontSize: '1.8rem', color: '#0f172a', letterSpacing: '-0.5px' }}>{value}</h3>
                    <p className="mb-0 text-muted font-weight-medium" style={{ fontSize: '0.9rem' }}>{label}</p>
                </div>
            </div>
        </div>
    </div>
);

export default function Dashboard() {
    const { t } = useTranslation();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        API.get('/dashboard/stats').then(r => { setStats(r.data); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-center pt-5"><i className="fas fa-spinner fa-spin fa-3x text-secondary"></i></div>;
    if (!stats) return <div className="alert alert-danger">{t('dashboard.errorData')}</div>;

    const { orders, ordersByStatus, itemsByStage, inventoryAlerts, inventoryTotalItems, inventoryTotalValue, criticalMaterials, totalClients, recentOrders } = stats;

    // Configuración del Doughnut Chart
    const doughnutData = {
        labels: ordersByStatus.map(s => t(`dashboard.statuses.${s.status}`, s.status)),
        datasets: [{
            data: ordersByStatus.map(s => s.count),
            backgroundColor: ordersByStatus.map(s => STATUS_COLORS[s.status] || '#999'),
            borderWidth: 2,
            borderColor: '#f4f6f9',
            hoverOffset: 4
        }],
    };

    // Configuración del Bar Chart
    const barData = {
        labels: criticalMaterials?.map(m => m.name.substring(0, 15) + '...'),
        datasets: [
            {
                label: t('dashboard.stockCurrent'),
                data: criticalMaterials?.map(m => parseFloat(m.quantity_available)),
                backgroundColor: '#e94560',
                borderRadius: 4,
            },
            {
                label: t('dashboard.minPoint'),
                data: criticalMaterials?.map(m => parseFloat(m.reorder_point)),
                backgroundColor: '#16213e',
                borderRadius: 4,
            }
        ],
    };

    return (
        <>
            <style>
                {`
                .stat-card-hover:hover { transform: translateY(-8px); box-shadow: 0 12px 30px rgba(0,0,0,0.2) !important; }
                .list-group-item-hover:hover { background-color: #f8f9fa; transform: translateX(5px); transition: all 0.2s; }
                `}
            </style>

            <div className="content-header mb-4">
                <h1 style={{ fontWeight: 800, color: '#16213e' }}><i className="fas fa-tachometer-alt mr-2 text-danger"></i>{t('dashboard.title')}</h1>
                <small className="text-muted" style={{ fontSize: '1.1rem' }}>{t('dashboard.subtitle')}</small>
            </div>

            {/* Fila 1: KPIs de Producción y Ventas */}
            <div className="row">
                <StatCard icon="fas fa-industry" value={orders.total} label={t('dashboard.createdOrders')} color="#0f3460" />
                <StatCard icon="fas fa-cog fa-spin" value={orders.active} label={t('dashboard.activeOrders')} color="#e94560" />
                <StatCard icon="fas fa-check-circle" value={orders.delivered} label={t('dashboard.deliveredOrders')} color="#28a745" />
                <StatCard icon="fas fa-users" value={totalClients} label={t('dashboard.clientBase')} color="#17a2b8" />
            </div>

            {/* Fila 2: KPIs de Inventario */}
            <div className="row">
                <StatCard icon="fas fa-box-open" value={inventoryTotalItems} label={t('dashboard.activeMaterials')} color="#6f42c1" />
                <StatCard icon="fas fa-exclamation-triangle" value={inventoryAlerts} label={t('dashboard.stockAlerts')} color="#fd7e14" />
                <StatCard icon="fas fa-dollar-sign" value={`$${parseFloat(inventoryTotalValue).toFixed(2)}`} label={t('dashboard.inventoryValue')} color="#20c997" />
                <StatCard icon="fas fa-times-circle" value={orders.cancelled || 0} label={t('dashboard.cancelledOrders')} color="#dc3545" />
            </div>

            <div className="row mt-3">
                {/* Gráfico de Barras: Top Materiales Críticos */}
                <div className="col-lg-6 mb-4">
                    <div className="card h-100">
                        <div className="card-header pb-0 border-0 pt-3 bg-transparent">
                            <h3 className="card-title font-weight-bold" style={{ color: '#0f172a' }}>
                                <i className="fas fa-chart-bar mr-2 text-danger"></i>{t('dashboard.criticalStockTitle')}
                            </h3>
                        </div>
                        <div className="card-body">
                            {criticalMaterials && criticalMaterials.length > 0 ? (
                                <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} height={250} />
                            ) : (
                                <div className="d-flex h-100 align-items-center justify-content-center text-muted">
                                    <span><i className="fas fa-check-circle mr-2 text-success"></i>{t('dashboard.optimalStock')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* NUEVO: Pipeline de Producción (Items) */}
                <div className="col-lg-12 mb-4">
                    <div className="card h-100">
                        <div className="card-header pb-0 border-0 pt-3 bg-transparent">
                            <h3 className="card-title font-weight-bold" style={{ color: '#0f172a' }}>
                                <i className="fas fa-project-diagram mr-2 text-primary"></i>{t('dashboard.pipelineTitle')}
                            </h3>
                        </div>
                        <div className="card-body">
                            <div className="d-flex justify-content-between text-center" style={{ overflowX: 'auto', paddingBottom: '10px' }}>
                                {['DESIGN', 'CUTTING', 'BENDING', 'ASSEMBLY', 'WELDING', 'CLEANING'].map((st, idx, arr) => {
                                    const qty = itemsByStage?.find(i => i.stage === st)?.count || 0;
                                    const color = STATUS_COLORS[st];
                                    return (
                                        <div key={st} className="d-flex align-items-center mb-2 mx-1">
                                            <div style={{ minWidth: '85px' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: qty > 0 ? color : '#ccc' }}>
                                                    {qty}
                                                </div>
                                                <small style={{ display: 'block', lineHeight: '1.1', color: '#666', fontWeight: 600, marginTop: '4px' }}>
                                                    {t(`dashboard.statuses.${st}`, st)}
                                                </small>
                                            </div>
                                            {idx < arr.length - 1 && (
                                                <div className="mx-2 text-muted" style={{ fontSize: '1.2rem', opacity: 0.5 }}>
                                                    <i className="fas fa-chevron-right"></i>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Doughnut: Órdenes por estado */}
                <div className="col-lg-6 mb-4">
                    <div className="card h-100">
                        <div className="card-header pb-0 border-0 pt-3 bg-transparent">
                            <h3 className="card-title font-weight-bold" style={{ color: '#0f172a' }}>
                                <i className="fas fa-chart-pie mr-2 text-primary"></i>{t('dashboard.distributionTitle')}
                            </h3>
                        </div>
                        <div className="card-body">
                            <div style={{ height: '250px', position: 'relative' }}>
                                <Doughnut data={doughnutData} options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 10 } } },
                                    cutout: '65%'
                                }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                {/* Órdenes Recientes Mejoradas */}
                <div className="col-lg-12">
                    <div className="card">
                        <div className="card-header border-0 pt-3 bg-transparent">
                            <h3 className="card-title font-weight-bold" style={{ color: '#0f172a' }}><i className="fas fa-stream mr-2 text-danger"></i>{t('dashboard.recentOrdersTitle')}</h3>
                        </div>
                        <div className="card-body p-0">
                            <ul className="list-group list-group-flush">
                                {recentOrders.map(o => {
                                    const dateStr = new Date(o.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                                    return (
                                        <li key={o.order_number} className="list-group-item list-group-item-hover d-flex justify-content-between align-items-center" style={{ borderLeft: `5px solid ${STATUS_COLORS[o.status] || '#999'}` }}>
                                            <div className="d-flex align-items-center">
                                                <div className="mr-3 text-center" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f4f6f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#16213e' }}>
                                                    <i className="fas fa-receipt"></i>
                                                </div>
                                                <div>
                                                    <strong style={{ fontSize: '1.1rem', color: '#e94560' }}>{o.order_number}</strong>
                                                    <br /><span className="text-secondary"><i className="fas fa-building mr-1"></i>{o.client_name}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="badge" style={{ background: STATUS_COLORS[o.status] || '#999', color: '#fff', fontSize: '0.85rem', padding: '6px 12px', borderRadius: '20px' }}>
                                                    {t(`dashboard.statuses.${o.status}`, o.status)}
                                                </div>
                                                <div className="text-muted mt-1" style={{ fontSize: '0.8rem' }}><i className="far fa-clock mr-1"></i>{dateStr}</div>
                                            </div>
                                        </li>
                                    );
                                })}
                                {recentOrders.length === 0 && (
                                    <li className="list-group-item text-center p-4 text-muted">{t('dashboard.noRecentOrders')}</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
