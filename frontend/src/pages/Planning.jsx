import { useEffect, useState } from 'react';
import API from '../api/client';
import { toast } from 'react-toastify';

export default function Planning() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        API.get('/planning')
            .then(res => {
                setStats(res.data);
                setLoading(false);
            })
            .catch(err => {
                toast.error('Error al cargar datos de planificación');
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="text-center pt-5"><i className="fas fa-spinner fa-spin fa-3x text-secondary"></i></div>;
    if (!stats) return <div className="alert alert-danger">Error al cargar planificación.</div>;

    const { dailyPlan, projectedPurchases } = stats;

    return (
        <>
            <div className="content-header mb-4">
                <h1 style={{ fontWeight: 800, color: '#16213e' }}><i className="fas fa-calendar-alt mr-2 text-primary"></i>Plan Maestro</h1>
                <small className="text-muted" style={{ fontSize: '1.1rem' }}>Planificación de producción al día siguiente y proyecciones de compras mensuales.</small>
            </div>

            <div className="row">
                <div className="col-lg-6 mb-4">
                    <div className="card h-100">
                        <div className="card-header pb-0 border-0 pt-3 bg-transparent">
                            <h3 className="card-title font-weight-bold" style={{ color: '#0f172a' }}>
                                <i className="fas fa-hammer mr-2 text-info"></i>Plan de Producción Diario (Top Prioridad)
                            </h3>
                        </div>
                        <div className="card-body">
                            <p className="text-muted small">Basado en órdenes activas en etapas iniciales (Diseño, Corte, Espera) con prioridad Alta o Urgente.</p>
                            <ul className="list-group list-group-flush mt-3">
                                {dailyPlan && dailyPlan.length > 0 ? dailyPlan.map(item => (
                                    <li key={item.product_id} className="list-group-item d-flex justify-content-between align-items-center">
                                        <div>
                                            <strong style={{ fontSize: '1.1rem', color: '#0f3460' }}>{item.product_name}</strong>
                                        </div>
                                        <div className="text-right">
                                            <span className="badge badge-info" style={{ fontSize: '1rem', padding: '8px 12px', borderRadius: '8px' }}>
                                                {item.total_quantity} uds previstas
                                            </span>
                                        </div>
                                    </li>
                                )) : (
                                    <li className="list-group-item text-center p-4 text-muted">La bandeja está libre de requerimientos urgentes iniciales.</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="col-lg-6 mb-4">
                    <div className="card h-100">
                        <div className="card-header pb-0 border-0 pt-3 bg-transparent">
                            <h3 className="card-title font-weight-bold" style={{ color: '#0f172a' }}>
                                <i className="fas fa-shopping-cart mr-2 text-warning"></i>Proyección Mensual de Compras
                            </h3>
                        </div>
                        <div className="card-body">
                            <p className="text-muted small">Requerimientos de materia prima extraídos del BOM de las órdenes actuales activas vs Stock Disponible.</p>
                            <ul className="list-group list-group-flush mt-3">
                                {projectedPurchases && projectedPurchases.length > 0 ? projectedPurchases.map(item => (
                                    <li key={item.material_id} className="list-group-item d-flex justify-content-between align-items-center">
                                        <div>
                                            <strong style={{ fontSize: '1.1rem', color: '#e94560' }}>{item.material_name}</strong>
                                            <br /><small>Req: {parseFloat(item.required_quantity).toFixed(2)} {item.unit_of_measure} | Stock: {parseFloat(item.current_stock).toFixed(2)} {item.unit_of_measure}</small>
                                        </div>
                                        <div className="text-right">
                                            {item.deficit > 0 ? (
                                                <span className="badge badge-danger" style={{ fontSize: '0.9rem', padding: '6px 10px', borderRadius: '8px' }}>
                                                    Comprar: {parseFloat(item.deficit).toFixed(2)} {item.unit_of_measure}
                                                </span>
                                            ) : (
                                                <span className="badge badge-success" style={{ fontSize: '0.9rem', padding: '6px 10px', borderRadius: '8px' }}>
                                                    Stock Suficiente
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                )) : (
                                    <li className="list-group-item text-center p-4 text-muted">No hay cálculos activos de compras para la producción actual.</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
