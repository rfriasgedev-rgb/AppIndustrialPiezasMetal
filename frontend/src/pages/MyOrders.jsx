import { useEffect, useState, useCallback } from 'react';
import API from '../api/client';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

// ── Reutilizamos la misma lógica de etapas que WorkQueue ─────────────────────
const NEXT_AVAILABLE_STAGES = {
    DESIGN: ['CUTTING'],
    CUTTING: ['BENDING'],
    BENDING: ['ASSEMBLY', 'WELDING', 'CLEANING'],
    ASSEMBLY: ['WELDING', 'CLEANING'],
    WELDING: ['CLEANING'],
    CLEANING: ['READY'],
};

const PRIORITY_COLORS = {
    URGENT: '#ef4444', HIGH: '#f97316', NORMAL: '#3b82f6', LOW: '#6b7280',
};

const PRIORITY_LABELS = {
    URGENT: 'Urgente', HIGH: 'Alta', NORMAL: 'Normal', LOW: 'Baja',
};

// ── Modal de confirmación de avance (igual al de WorkQueue) ──────────────────
function AdvanceModal({ item, nextStage, currentStage, stageName, defaultQty, onConfirm, onCancel, t }) {
    const [notes, setNotes] = useState('');
    const [qty, setQty] = useState(defaultQty ?? item.quantity);
    const [loading, setLoading] = useState(false);
    const qtyEditable = currentStage === 'CUTTING';

    const handleConfirm = async () => {
        setLoading(true);
        await onConfirm(notes, Number(qty));
        setLoading(false);
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
            <div className="card shadow-lg" style={{ width: '100%', maxWidth: 480, borderRadius: 12 }}>
                <div className="card-header d-flex justify-content-between align-items-center"
                    style={{ background: '#4f46e5', color: '#fff', borderRadius: '12px 12px 0 0' }}>
                    <span style={{ fontWeight: 700 }}>
                        <i className="fas fa-arrow-right mr-2"></i>
                        {t('workQueue.advanceTo')} <strong>{stageName}</strong>
                    </span>
                    <button className="btn btn-sm" style={{ color: '#fff' }} onClick={onCancel}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div className="card-body">
                    <p className="mb-1 text-muted" style={{ fontSize: 13 }}>
                        <i className="fas fa-box mr-1"></i> <strong>{item.product_name}</strong> — {t('workQueue.op')} {item.order_number}
                    </p>
                    <hr />
                    <div className="form-group mb-3">
                        <label className="font-weight-bold mb-1" style={{ fontSize: 14 }}>
                            <i className="fas fa-layer-group mr-1 text-primary"></i>
                            {t('workQueue.qtyToPass', 'Cantidad a pasar')}
                            {qtyEditable && <span className="badge badge-warning ml-2" style={{ fontSize: 11 }}>Editable</span>}
                        </label>
                        <div className="d-flex align-items-center" style={{ gap: '10px' }}>
                            <div className="input-group input-group-sm" style={{ maxWidth: 160 }}>
                                <input type="number" className="form-control" min={1} max={item.quantity} value={qty}
                                    readOnly={!qtyEditable} onChange={e => qtyEditable && setQty(e.target.value)}
                                    style={{ background: qtyEditable ? '#fff' : '#f8f9fa', fontWeight: 700 }} />
                                <div className="input-group-append"><span className="input-group-text">{t('workQueue.units', 'pcs')}</span></div>
                            </div>
                            <span style={{ color: '#94a3b8', fontSize: 13 }}>/ sol.:</span>
                            <div className="input-group input-group-sm" style={{ maxWidth: 160 }}>
                                <input type="number" className="form-control" value={item.quantity} readOnly
                                    style={{ background: '#f1f5f9', fontWeight: 600, color: '#475569', borderStyle: 'dashed' }} />
                                <div className="input-group-append"><span className="input-group-text" style={{ background: '#e2e8f0', fontSize: 11 }}>sol.</span></div>
                            </div>
                        </div>
                        {qtyEditable && <small className="text-muted"><i className="fas fa-info-circle mr-1"></i>{t('workQueue.qtyEditHint')}</small>}
                        {!qtyEditable && <small className="text-muted"><i className="fas fa-lock mr-1"></i>{t('workQueue.qtyFromPrev')}</small>}
                    </div>
                    <label className="font-weight-bold mb-1" style={{ fontSize: 14 }}>
                        {t('workQueue.notesLabel')} <span className="text-muted font-weight-normal">(opcional)</span>
                    </label>
                    <textarea className="form-control" rows={3} autoFocus
                        placeholder={t('workQueue.notesPlaceholder')} value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleConfirm(); }}
                        style={{ resize: 'vertical' }} />
                    <small className="text-muted">Ctrl+Enter para confirmar rápido.</small>
                </div>
                <div className="card-footer d-flex justify-content-end" style={{ gap: 8, background: '#f8fafc', borderRadius: '0 0 12px 12px' }}>
                    <button className="btn btn-outline-secondary" onClick={onCancel} disabled={loading}>
                        <i className="fas fa-ban mr-1"></i> {t('workQueue.cancelBtn')}
                    </button>
                    <button className="btn btn-success" onClick={handleConfirm} disabled={loading}>
                        {loading ? <><i className="fas fa-spinner fa-spin mr-1"></i>{t('workQueue.saving')}</>
                            : <><i className="fas fa-check mr-1"></i>{t('workQueue.confirmAdvance')}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getFirstDay() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function getLastDay() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function MyOrders() {
    const { t } = useTranslation();
    const { user } = useAuth();

    // Disponibles
    const [available, setAvailable] = useState([]);
    const [myStage, setMyStage] = useState(null);
    const [loadingAvail, setLoadingAvail] = useState(false);
    const [modal, setModal] = useState(null);
    const [productionLines, setProductionLines] = useState([]);
    const [selectedLines, setSelectedLines] = useState({});

    // Historial
    const [history, setHistory] = useState([]);
    const [loadingHist, setLoadingHist] = useState(false);
    const [dateFrom, setDateFrom] = useState(getFirstDay());
    const [dateTo, setDateTo] = useState(getLastDay());
    const [statusFilter, setStatusFilter] = useState('ALL');

    const STAGES_LABELS = {
        DESIGN: t('workQueue.stageDesign'), CUTTING: t('workQueue.stageCutting'),
        BENDING: t('workQueue.stageBending'), ASSEMBLY: t('workQueue.stageAssembly'),
        WELDING: t('workQueue.stageWelding'), CLEANING: t('workQueue.stageCleaning'), READY: 'Listo',
    };

    const loadAvailable = useCallback(async () => {
        setLoadingAvail(true);
        try {
            const res = await API.get('/production/my-orders/available');
            setMyStage(res.data.stage);
            setAvailable(res.data.items);
        } catch { toast.error(t('myOrders.errorAvail')); }
        finally { setLoadingAvail(false); }
    }, [t]);

    const loadHistory = useCallback(async () => {
        setLoadingHist(true);
        try {
            const res = await API.get('/production/my-orders/history', {
                params: { date_from: dateFrom, date_to: dateTo, status: statusFilter }
            });
            setHistory(res.data.items);
        } catch { toast.error(t('myOrders.errorHistory')); }
        finally { setLoadingHist(false); }
    }, [dateFrom, dateTo, statusFilter, t]);

    const loadProductionLines = async () => {
        try {
            const res = await API.get('/production-lines');
            setProductionLines(res.data);
        } catch { /* silencioso */ }
    };

    useEffect(() => { loadAvailable(); loadProductionLines(); }, []);
    useEffect(() => { loadHistory(); }, [loadHistory]);

    // Reclamar una orden
    const handleClaim = async (item) => {
        try {
            const res = await API.post(`/production/my-orders/claim/${item.id}`);
            toast.success(t('myOrders.claimSuccess'));
            const claimedItem = res.data.item;
            const defaultQty = claimedItem.last_quantity_passed ?? claimedItem.quantity;
            setModal({ item: claimedItem, currentStage: claimedItem.stage, defaultQty });
            loadAvailable();
        } catch (err) {
            toast.error(err.response?.data?.error || t('myOrders.claimError'));
            loadAvailable(); // refrescar por si ya fue tomada
        }
    };

    const handleAdvanceConfirm = async (notes, quantity_passed) => {
        const { item } = modal;
        const nextStages = NEXT_AVAILABLE_STAGES[item.stage] || [];
        const nextStage = nextStages[0];
        if (!nextStage) { toast.warning('No hay etapa siguiente.'); return; }

        if (nextStage === 'READY') {
            const lineId = selectedLines[item.id];
            if (!lineId) { toast.warning(t('workQueue.warningLine')); return; }
        }

        try {
            const payload = { to_status: nextStage, notes, quantity_passed };
            if (nextStage === 'READY') payload.production_line_id = selectedLines[item.id];
            await API.put(`/production/${item.id}/advance`, payload);
            toast.success(t('workQueue.advanceSuccess'));
            setModal(null);
            loadHistory();
        } catch (err) {
            toast.error(err.response?.data?.error || t('workQueue.advanceError'));
        }
    };

    const getStageColor = (stage) => {
        const map = { CUTTING: '#f97316', BENDING: '#8b5cf6', ASSEMBLY: '#3b82f6', WELDING: '#ef4444', CLEANING: '#10b981', DESIGN: '#6366f1', READY: '#22c55e' };
        return map[stage] || '#6b7280';
    };

    const historyStatusLabel = (item) => {
        if (!myStage) return item.stage;
        if (item.stage === myStage) return <span className="badge badge-warning">Pendiente</span>;
        return <span className="badge badge-success">Completada</span>;
    };

    return (
        <>
            {/* Modal de avance */}
            {modal && (
                <AdvanceModal
                    item={modal.item}
                    nextStage={(NEXT_AVAILABLE_STAGES[modal.currentStage] || [])[0]}
                    currentStage={modal.currentStage}
                    defaultQty={modal.defaultQty}
                    stageName={STAGES_LABELS[(NEXT_AVAILABLE_STAGES[modal.currentStage] || [])[0]] || ''}
                    onConfirm={handleAdvanceConfirm}
                    onCancel={() => setModal(null)}
                    t={t}
                />
            )}

            {/* ── Encabezado ─────────────────────────────────────────── */}
            <div className="content-header mb-3">
                <h1 style={{ fontWeight: 700 }}>
                    <i className="fas fa-tasks mr-2 text-primary"></i>{t('myOrders.pageTitle')}
                </h1>
                <small className="text-muted">{t('myOrders.pageSubtitle')}</small>
                {myStage && (
                    <span className="badge ml-3 px-3 py-2" style={{ background: getStageColor(myStage), color: '#fff', fontSize: 13, borderRadius: 8 }}>
                        <i className="fas fa-user-hard-hat mr-1"></i>
                        {t('myOrders.yourStage')}: <strong>{STAGES_LABELS[myStage] || myStage}</strong>
                    </span>
                )}
            </div>

            {/* ── SECCIÓN 1: Órdenes Disponibles ────────────────────── */}
            <div className="card mb-4" style={{ borderTop: '4px solid #4f46e5' }}>
                <div className="card-header d-flex justify-content-between align-items-center" style={{ background: '#f8fafc' }}>
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 16 }}>
                        <i className="fas fa-inbox mr-2 text-primary"></i>{t('myOrders.availableTitle')}
                        <span className="badge badge-primary ml-2">{available.length}</span>
                    </span>
                    <button className="btn btn-sm btn-outline-primary" onClick={loadAvailable} disabled={loadingAvail}>
                        <i className={`fas fa-sync-alt ${loadingAvail ? 'fa-spin' : ''} mr-1`}></i>{t('myOrders.refresh')}
                    </button>
                </div>
                <div className="card-body">
                    {!myStage ? (
                        <div className="text-center py-4 text-muted">
                            <i className="fas fa-user-slash fa-3x mb-3" style={{ color: '#cbd5e1' }}></i>
                            <h5>{t('myOrders.noStageTitle')}</h5>
                            <p className="mb-0">{t('myOrders.noStageSubtitle')}</p>
                        </div>
                    ) : loadingAvail ? (
                        <div className="text-center py-4"><i className="fas fa-spinner fa-spin fa-2x text-secondary"></i></div>
                    ) : available.length === 0 ? (
                        <div className="text-center py-4 text-muted">
                            <i className="fas fa-coffee fa-3x mb-3" style={{ color: '#e2e8f0' }}></i>
                            <h5>{t('myOrders.noAvailTitle')}</h5>
                            <p className="mb-0">{t('myOrders.noAvailSubtitle')}</p>
                        </div>
                    ) : (
                        <div className="row">
                            {available.map(item => (
                                <div className="col-lg-4 col-md-6 mb-3" key={item.id}>
                                    <div className="card h-100 shadow-sm" style={{ borderLeft: `4px solid ${PRIORITY_COLORS[item.priority] || '#6b7280'}`, transition: 'transform .15s', cursor: 'pointer' }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                        <div className="card-body">
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <h6 className="font-weight-bold mb-0" style={{ color: '#0f172a', fontSize: 15 }}>{item.product_name}</h6>
                                                <span className="badge" style={{ background: PRIORITY_COLORS[item.priority], color: '#fff', fontSize: 10 }}>
                                                    {PRIORITY_LABELS[item.priority] || item.priority}
                                                </span>
                                            </div>
                                            <p className="text-muted mb-1" style={{ fontSize: 12 }}>
                                                <i className="fas fa-hashtag mr-1"></i>OP: <strong>{item.order_number}</strong>
                                            </p>
                                            <p className="text-muted mb-1" style={{ fontSize: 12 }}>
                                                <i className="fas fa-building mr-1"></i>{item.client_name}
                                            </p>
                                            <div className="d-flex align-items-center mb-2" style={{ gap: 8 }}>
                                                <span className="badge badge-light border">
                                                    <i className="fas fa-layer-group mr-1 text-primary"></i>
                                                    {item.last_quantity_passed ?? item.quantity} {t('workQueue.units')}
                                                </span>
                                                {item.estimated_delivery && (
                                                    <span className="badge badge-light border" style={{ fontSize: 10 }}>
                                                        <i className="fas fa-calendar mr-1"></i>
                                                        {new Date(item.estimated_delivery).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Selector de línea si es CLEANING → READY */}
                                            {myStage === 'CLEANING' && (
                                                <select className="form-control form-control-sm mb-2"
                                                    value={selectedLines[item.id] || ''}
                                                    onChange={(e) => setSelectedLines({ ...selectedLines, [item.id]: e.target.value })}>
                                                    <option value="">{t('workQueue.selectLine')}</option>
                                                    {productionLines.map(pl => (
                                                        <option key={pl.id} value={pl.id}>{pl.name}</option>
                                                    ))}
                                                </select>
                                            )}

                                            <button className="btn btn-sm btn-primary btn-block mt-2"
                                                onClick={() => handleClaim(item)}>
                                                <i className="fas fa-hand-pointer mr-1"></i>{t('myOrders.claimBtn')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── SECCIÓN 2: Historial de Mis Órdenes ───────────────── */}
            <div className="card" style={{ borderTop: '4px solid #10b981' }}>
                <div className="card-header" style={{ background: '#f8fafc' }}>
                    <div className="d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 8 }}>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 16 }}>
                            <i className="fas fa-history mr-2 text-success"></i>{t('myOrders.historyTitle')}
                        </span>
                        <div className="d-flex align-items-center flex-wrap" style={{ gap: 8 }}>
                            {/* Filtro desde */}
                            <div className="d-flex align-items-center" style={{ gap: 4 }}>
                                <label className="mb-0 text-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{t('myOrders.dateFrom')}:</label>
                                <input type="date" className="form-control form-control-sm" style={{ width: 140 }}
                                    value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                            </div>
                            {/* Filtro hasta */}
                            <div className="d-flex align-items-center" style={{ gap: 4 }}>
                                <label className="mb-0 text-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{t('myOrders.dateTo')}:</label>
                                <input type="date" className="form-control form-control-sm" style={{ width: 140 }}
                                    value={dateTo} onChange={e => setDateTo(e.target.value)} />
                            </div>
                            {/* Filtro estado */}
                            <select className="form-control form-control-sm" style={{ width: 150 }}
                                value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                <option value="ALL">{t('myOrders.statusAll')}</option>
                                <option value="PENDING">{t('myOrders.statusPending')}</option>
                                <option value="COMPLETED">{t('myOrders.statusCompleted')}</option>
                            </select>
                            <button className="btn btn-sm btn-success" onClick={loadHistory} disabled={loadingHist}>
                                <i className={`fas fa-search ${loadingHist ? 'fa-spin' : ''} mr-1`}></i>{t('myOrders.search')}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="card-body p-0">
                    {loadingHist ? (
                        <div className="text-center py-4"><i className="fas fa-spinner fa-spin fa-2x text-secondary"></i></div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <i className="fas fa-clipboard fa-3x mb-3" style={{ color: '#e2e8f0' }}></i>
                            <h5>{t('myOrders.noHistoryTitle')}</h5>
                            <p>{t('myOrders.noHistorySubtitle')}</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead style={{ background: '#f1f5f9' }}>
                                    <tr>
                                        <th style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{t('myOrders.colProduct')}</th>
                                        <th style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{t('myOrders.colOrder')}</th>
                                        <th style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{t('myOrders.colClient')}</th>
                                        <th style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{t('myOrders.colQty')}</th>
                                        <th style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{t('myOrders.colCurrentStage')}</th>
                                        <th style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{t('myOrders.colAssignedAt')}</th>
                                        <th style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{t('myOrders.colStatus')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map(item => (
                                        <tr key={item.id}>
                                            <td>
                                                <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.product_name}</span>
                                                {item.part_number && <br />}
                                                {item.part_number && <small className="text-muted">{item.part_number}</small>}
                                            </td>
                                            <td><span className="badge badge-light border">{item.order_number}</span></td>
                                            <td style={{ fontSize: 13 }}>{item.client_name}</td>
                                            <td>
                                                <span className="badge badge-info">{item.last_quantity_passed ?? item.quantity} {t('workQueue.units')}</span>
                                            </td>
                                            <td>
                                                <span className="badge px-2" style={{ background: getStageColor(item.stage), color: '#fff', fontSize: 11 }}>
                                                    {STAGES_LABELS[item.stage] || item.stage}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 12, color: '#64748b' }}>
                                                {item.assigned_at ? new Date(item.assigned_at).toLocaleString() : '—'}
                                            </td>
                                            <td>{historyStatusLabel(item)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
