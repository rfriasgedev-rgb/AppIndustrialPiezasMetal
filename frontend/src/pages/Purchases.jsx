import { useEffect, useState } from 'react';
import API from '../api/client';
import { toast } from 'react-toastify';

const STATUS_LABELS = { PENDING: 'Pendiente', ORDERED: 'Ordenado', PARTIAL: 'Parcial', RECEIVED: 'Recibido', CANCELLED: 'Cancelado' };
const STATUS_COLORS = { PENDING: 'warning', ORDERED: 'info', PARTIAL: 'primary', RECEIVED: 'success', CANCELLED: 'danger' };

export default function Purchases() {
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPurchases = () => {
        API.get('/purchases').then(r => { setPurchases(r.data); setLoading(false); });
    };
    useEffect(() => { fetchPurchases(); }, []);

    const handleReceive = async (id, currentStatus) => {
        if (['RECEIVED', 'CANCELLED'].includes(currentStatus)) return;
        const qty = prompt('¿Cuántas unidades se están recibiendo?');
        if (!qty || isNaN(qty) || parseFloat(qty) <= 0) return;
        try {
            const { data } = await API.put(`/purchases/${id}/receive`, { quantity_received: parseFloat(qty) });
            toast.success(data.message);
            fetchPurchases();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al registrar recepción.');
        }
    };

    return (
        <>
            <div className="content-header mb-3 d-flex align-items-center justify-content-between">
                <div>
                    <h1 style={{ fontWeight: 700 }}><i className="fas fa-shopping-cart mr-2 text-danger"></i>Órdenes de Compra</h1>
                    <small className="text-muted">Control de compras y recepciones de materia prima</small>
                </div>
                <a href="/purchases/new" className="btn btn-danger"><i className="fas fa-plus mr-1"></i>Nueva Compra</a>
            </div>

            {loading ? <div className="text-center pt-5"><i className="fas fa-spinner fa-spin fa-3x text-secondary"></i></div> : (
                <div className="card" style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead style={{ background: '#1a1a2e', color: '#fff' }}>
                                    <tr><th>Proveedor</th><th>Material</th><th>Cant. Ordenada</th><th>Cant. Recibida</th><th>Precio Unit.</th><th>Total</th><th>Fecha Esperada</th><th>Estado</th><th>Acciones</th></tr>
                                </thead>
                                <tbody>
                                    {purchases.length === 0 ? (
                                        <tr><td colSpan="9" className="text-center py-4 text-muted">No hay órdenes de compra registradas.</td></tr>
                                    ) : purchases.map(p => (
                                        <tr key={p.id}>
                                            <td><strong>{p.supplier_name}</strong></td>
                                            <td>{p.item_name}</td>
                                            <td>{parseFloat(p.quantity_ordered).toFixed(2)}</td>
                                            <td>{parseFloat(p.quantity_received).toFixed(2)}</td>
                                            <td>${parseFloat(p.unit_price).toFixed(4)}</td>
                                            <td><strong>${parseFloat(p.total_amount || 0).toFixed(2)}</strong></td>
                                            <td>{p.expected_date || '—'}</td>
                                            <td>
                                                <span className={`badge badge-${STATUS_COLORS[p.status]}`} style={{ padding: '5px 10px', borderRadius: '6px' }}>
                                                    {STATUS_LABELS[p.status] || p.status}
                                                </span>
                                            </td>
                                            <td>
                                                {!['RECEIVED', 'CANCELLED'].includes(p.status) && (
                                                    <button className="btn btn-sm btn-outline-success" onClick={() => handleReceive(p.id, p.status)} title="Registrar recepción">
                                                        <i className="fas fa-truck-loading"></i>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
