import { useEffect, useState } from 'react';
import API from '../api/client';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const STATUS_COLORS = { PENDING: 'warning', ORDERED: 'info', PARTIAL: 'primary', RECEIVED: 'success', CANCELLED: 'danger' };

export default function Purchases() {
    const { t } = useTranslation();
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);

    const STATUS_LABELS = { 
        PENDING: t('purchases.statusPending'), 
        ORDERED: t('purchases.statusOrdered'), 
        PARTIAL: t('purchases.statusPartial'), 
        RECEIVED: t('purchases.statusReceived'), 
        CANCELLED: t('purchases.statusCancelled') 
    };

    const fetchPurchases = () => {
        API.get('/purchases').then(r => { setPurchases(r.data); setLoading(false); });
    };
    useEffect(() => { fetchPurchases(); }, []);

    const handleReceive = async (id, currentStatus) => {
        if (['RECEIVED', 'CANCELLED'].includes(currentStatus)) return;
        const qty = prompt(t('purchases.promptQty'));
        if (!qty || isNaN(qty) || parseFloat(qty) <= 0) return;
        try {
            const { data } = await API.put(`/purchases/${id}/receive`, { quantity_received: parseFloat(qty) });
            toast.success(data.message);
            fetchPurchases();
        } catch (err) {
            toast.error(err.response?.data?.error || t('purchases.receiveError'));
        }
    };

    return (
        <>
            <div className="content-header mb-3 d-flex align-items-center justify-content-between">
                <div>
                    <h1 style={{ fontWeight: 700 }}><i className="fas fa-shopping-cart mr-2 text-danger"></i>{t('purchases.pageTitle')}</h1>
                    <small className="text-muted">{t('purchases.pageSubtitle')}</small>
                </div>
                <a href="/purchases/new" className="btn btn-danger"><i className="fas fa-plus mr-1"></i>{t('purchases.btnNew')}</a>
            </div>

            {loading ? <div className="text-center pt-5"><i className="fas fa-spinner fa-spin fa-3x text-secondary"></i></div> : (
                <div className="card" style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead style={{ background: '#1a1a2e', color: '#fff' }}>
                                    <tr><th>{t('purchases.colSupplier')}</th><th>{t('purchases.colMaterial')}</th><th>{t('purchases.colQtyOrdered')}</th><th>{t('purchases.colQtyReceived')}</th><th>{t('purchases.colPrice')}</th><th>{t('purchases.colTotal')}</th><th>{t('purchases.colExpectedDate')}</th><th>{t('purchases.colStatus')}</th><th>{t('purchases.colActions')}</th></tr>
                                </thead>
                                <tbody>
                                    {purchases.length === 0 ? (
                                        <tr><td colSpan="9" className="text-center py-4 text-muted">{t('purchases.noRecords')}</td></tr>
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
                                                    <button className="btn btn-sm btn-outline-success" onClick={() => handleReceive(p.id, p.status)} title={t('purchases.btnReceive')}>
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
