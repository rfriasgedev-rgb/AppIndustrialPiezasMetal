import { useEffect, useState } from 'react';
import API from '../api/client';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const NEXT_AVAILABLE_STAGES = {
    DESIGN: ['CUTTING'],
    CUTTING: ['BENDING'],
    BENDING: ['ASSEMBLY', 'WELDING', 'CLEANING'],
    ASSEMBLY: ['WELDING', 'CLEANING'],
    WELDING: ['CLEANING'],
    CLEANING: ['READY'],
};

// ── Modal de confirmación de avance de etapa ──────────────────────────────────
function AdvanceModal({ item, nextStage, currentStage, stageName, defaultQty, onConfirm, onCancel, t }) {
    const [notes, setNotes] = useState('');
    const [qty, setQty] = useState(defaultQty ?? item.quantity);
    const [loading, setLoading] = useState(false);

    // Solo editable cuando la pieza SALE de CUTTING (cortador define cuántas pasan)
    const qtyEditable = currentStage === 'CUTTING';

    const handleConfirm = async () => {
        setLoading(true);
        await onConfirm(notes, Number(qty));
        setLoading(false);
    };

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
        >
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

                    {/* Campo: Cantidad a pasar */}
                    <div className="form-group mb-3">
                        <label className="font-weight-bold mb-1" style={{ fontSize: 14 }}>
                            <i className="fas fa-layer-group mr-1 text-primary"></i>
                            {t('workQueue.qtyToPass', 'Cantidad a pasar')}
                            {qtyEditable && <span className="badge badge-warning ml-2" style={{ fontSize: 11 }}>Editable</span>}
                        </label>
                        <div className="d-flex align-items-center gap-2" style={{ gap: '10px' }}>
                            {/* Cantidad a pasar (editable o bloqueada según etapa) */}
                            <div className="input-group input-group-sm" style={{ maxWidth: 160 }}>
                                <input
                                    type="number"
                                    className="form-control"
                                    min={1}
                                    max={item.quantity}
                                    value={qty}
                                    readOnly={!qtyEditable}
                                    onChange={e => qtyEditable && setQty(e.target.value)}
                                    style={{
                                        background: qtyEditable ? '#fff' : '#f8f9fa',
                                        fontWeight: 700,
                                        color: qtyEditable ? '#0f172a' : '#6b7280',
                                        cursor: qtyEditable ? 'text' : 'default',
                                    }}
                                />
                                <div className="input-group-append">
                                    <span className="input-group-text">{t('workQueue.units', 'pcs')}</span>
                                </div>
                            </div>

                            {/* Separador visual */}
                            <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 13, whiteSpace: 'nowrap' }}>/ sol.:</span>

                            {/* Cantidad solicitada (siempre solo lectura) */}
                            <div className="input-group input-group-sm" style={{ maxWidth: 160 }}>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={item.quantity}
                                    readOnly
                                    title={t('workQueue.qtyRequested', 'Cantidad solicitada en la orden')}
                                    style={{
                                        background: '#f1f5f9',
                                        fontWeight: 600,
                                        color: '#475569',
                                        cursor: 'default',
                                        borderStyle: 'dashed',
                                    }}
                                />
                                <div className="input-group-append">
                                    <span
                                        className="input-group-text"
                                        title={t('workQueue.qtyRequested', 'Cantidad solicitada')}
                                        style={{ background: '#e2e8f0', color: '#64748b', fontSize: 11 }}
                                    >
                                        {t('workQueue.qtyRequestedShort', 'sol.')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {!qtyEditable && (
                            <small className="text-muted">
                                <i className="fas fa-lock mr-1"></i>
                                {t('workQueue.qtyFromPrev', 'Cantidad heredada de la etapa anterior')}
                            </small>
                        )}
                        {qtyEditable && (
                            <small className="text-muted">
                                <i className="fas fa-info-circle mr-1"></i>
                                {t('workQueue.qtyEditHint', 'Ajusta si alguna pieza fue rechazada en corte')}
                            </small>
                        )}
                    </div>


                    <label className="font-weight-bold mb-1" style={{ fontSize: 14 }}>
                        {t('workQueue.notesLabel', 'Notas de la etapa')} <span className="text-muted font-weight-normal">(opcional)</span>
                    </label>
                    <textarea
                        className="form-control"
                        rows={3}
                        autoFocus
                        placeholder={t('workQueue.notesPlaceholder', 'Ej: Corte completado sin incidencias...')}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleConfirm(); }}
                        style={{ resize: 'vertical' }}
                    />
                    <small className="text-muted">Ctrl+Enter para confirmar rápido.</small>
                </div>
                <div className="card-footer d-flex justify-content-end gap-2" style={{ background: '#f8fafc', borderRadius: '0 0 12px 12px' }}>
                    <button className="btn btn-outline-secondary" onClick={onCancel} disabled={loading}>
                        <i className="fas fa-ban mr-1"></i> {t('workQueue.cancelBtn', 'Cancelar')}
                    </button>
                    <button className="btn btn-success" onClick={handleConfirm} disabled={loading}>
                        {loading
                            ? <><i className="fas fa-spinner fa-spin mr-1"></i> {t('workQueue.saving', 'Guardando...')}</>
                            : <><i className="fas fa-check mr-1"></i> {t('workQueue.confirmAdvance', 'Confirmar Avance')}</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function WorkQueue() {
    const { t } = useTranslation();
    const { user, hasRole } = useAuth();
    const [selectedStage, setSelectedStage] = useState('DESIGN');
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(false);
    const [productionLines, setProductionLines] = useState([]);
    const [selectedLines, setSelectedLines] = useState({});

    // Estado del modal
    const [modal, setModal] = useState(null); // { item, nextStage }

    const STAGES = {
        DESIGN: t('workQueue.stageDesign'),
        CUTTING: t('workQueue.stageCutting'),
        BENDING: t('workQueue.stageBending'),
        ASSEMBLY: t('workQueue.stageAssembly'),
        WELDING: t('workQueue.stageWelding'),
        CLEANING: t('workQueue.stageCleaning'),
    };

    useEffect(() => {
        loadQueue(selectedStage);
        loadProductionLines();
    }, [selectedStage]);

    const loadProductionLines = async () => {
        try {
            const res = await API.get('/production-lines');
            setProductionLines(res.data);
        } catch (error) {
            console.error(t('workQueue.errorLines'), error);
        }
    };

    const loadQueue = async (stage) => {
        setLoading(true);
        try {
            const res = await API.get(`/production/queue/${stage}`);
            setQueue(res.data);
        } catch (error) {
            toast.error(t('workQueue.errorQueue'));
        } finally {
            setLoading(false);
        }
    };

    // Abre el modal de confirmación
    const handleAdvanceClick = (item, nextStage) => {
        if (nextStage === 'READY') {
            const lineId = selectedLines[item.id];
            if (!lineId) {
                toast.warning(t('workQueue.warningLine'));
                return;
            }
        }
        // defaultQty: usa last_quantity_passed del log anterior, o la cantidad de la orden si no hay log
        const defaultQty = item.last_quantity_passed ?? item.quantity;
        setModal({ item, nextStage, currentStage: selectedStage, defaultQty });
    };

    // Se llama cuando el usuario confirma en el modal
    const handleAdvanceConfirm = async (notes, quantity_passed) => {
        const { item, nextStage } = modal;
        try {
            const payload = { to_status: nextStage, notes, quantity_passed };
            if (nextStage === 'READY') {
                payload.production_line_id = selectedLines[item.id];
            }
            await API.put(`/production/${item.id}/advance`, payload);
            toast.success(t('workQueue.advanceSuccess'));
            setModal(null);
            loadQueue(selectedStage);
        } catch (err) {
            toast.error(err.response?.data?.error || t('workQueue.advanceError'));
        }
    };

    const handlePrintRequisition = async (item) => {
        try {
            const genRes = await API.post(`/requisitions/generate/${item.order_id}`);
            const requisitionId = genRes.data.requisitionId;
            if (requisitionId) {
                const url = `${API.defaults.baseURL}/requisitions/${requisitionId}/pdf`;
                window.open(url, '_blank');
                toast.info(t('workQueue.genPdf'));
            }
        } catch (err) {
            toast.error(err.response?.data?.error || t('workQueue.genPdfError'));
        }
    };

    return (
        <>
            {/* Modal de avance de etapa */}
            {modal && (
                <AdvanceModal
                    item={modal.item}
                    nextStage={modal.nextStage}
                    currentStage={modal.currentStage}
                    defaultQty={modal.defaultQty}
                    stageName={STAGES[modal.nextStage] || modal.nextStage}
                    onConfirm={handleAdvanceConfirm}
                    onCancel={() => setModal(null)}
                    t={t}
                />
            )}

            <div className="content-header mb-3">
                <h1 style={{ fontWeight: 700 }}>
                    <i className="fas fa-clipboard-check mr-2 text-success"></i>{t('workQueue.pageTitle')}
                </h1>
                <small className="text-muted">{t('workQueue.pageSubtitle')}</small>
            </div>

            <div className="card mb-3">
                <div className="card-body py-2 d-flex gap-2 flex-wrap" style={{ overflowX: 'auto' }}>
                    {Object.entries(STAGES).map(([k, v]) => (
                        <button
                            key={k}
                            className={`btn btn-sm mr-1 mb-1 ${selectedStage === k ? 'btn-success font-weight-bold' : 'btn-outline-secondary'}`}
                            onClick={() => setSelectedStage(k)}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="text-center pt-5">
                    <i className="fas fa-spinner fa-spin fa-2x text-secondary"></i>
                </div>
            ) : (
                <div className="row">
                    {queue.length === 0 ? (
                        <div className="col-12 text-center py-5 text-muted">
                            <i className="fas fa-mug-hot fa-3x mb-3 text-light"></i>
                            <h5>{t('workQueue.emptyTitle', { stage: STAGES[selectedStage] })}</h5>
                            <p>{t('workQueue.emptySubtitle')}</p>
                        </div>
                    ) : (
                        queue.map(item => (
                            <div className="col-md-4 mb-4" key={item.id}>
                                <div className="card h-100" style={{ borderLeft: '4px solid #4f46e5' }}>
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between">
                                            <h5 className="font-weight-bold" style={{ color: '#0f172a' }}>{item.product_name}</h5>
                                            <div className="text-right">
                                                <div className="mb-1">
                                                    <span className="badge badge-light border" title={t('workQueue.qtyRequested', 'Cantidad solicitada en la orden')}>
                                                        <span className="text-muted mr-1">{t('workQueue.lblRequested', 'Solicitada:')}</span>
                                                        {item.quantity} {t('workQueue.units')}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="badge badge-info border" title={t('workQueue.receivedQtyTitle', 'Unidades recibidas en esta etapa')}>
                                                        <span className="text-white mr-1">{t('workQueue.lblReceived', 'Recibida:')}</span>
                                                        {item.last_quantity_passed ?? item.quantity} {t('workQueue.units')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-muted mb-2">
                                            <i className="fas fa-hashtag mr-1"></i>{t('workQueue.op')} {item.order_number}
                                        </p>
                                        <p className="mb-2 text-sm">
                                            <i className="fas fa-building mr-1"></i>{t('workQueue.client')} {item.client_name}
                                        </p>
                                        {item.notes && (
                                            <p className="mb-2 text-sm bg-light p-2 rounded">
                                                <i className="fas fa-comment-dots mr-1"></i>{item.notes}
                                            </p>
                                        )}

                                        <hr />

                                        <p className="mb-2 font-weight-bold text-sm">{t('workQueue.advanceTo')}</p>
                                        <div className="d-flex flex-wrap gap-2 align-items-center">
                                            {selectedStage === 'CUTTING' && (
                                                <button
                                                    className="btn btn-sm btn-info mr-2 mb-2"
                                                    onClick={() => handlePrintRequisition(item)}
                                                    title={t('workQueue.btnPrintReqTitle')}
                                                >
                                                    <i className="fas fa-print mr-1"></i> {t('workQueue.btnPrintReq')}
                                                </button>
                                            )}
                                            {(NEXT_AVAILABLE_STAGES[selectedStage] || []).map(next => (
                                                <div key={next} className="d-flex align-items-center mb-2">
                                                    {next === 'READY' && selectedStage === 'CLEANING' && (
                                                        <select
                                                            className="form-control form-control-sm mr-2"
                                                            style={{ width: '200px', display: 'inline-block' }}
                                                            value={selectedLines[item.id] || ''}
                                                            onChange={(e) => setSelectedLines({ ...selectedLines, [item.id]: e.target.value })}
                                                        >
                                                            <option value="">{t('workQueue.selectLine')}</option>
                                                            {productionLines.map(pl => (
                                                                <option key={pl.id} value={pl.id}>{pl.name}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    <button
                                                        className="btn btn-sm btn-outline-success mr-2"
                                                        onClick={() => handleAdvanceClick(item, next)}
                                                    >
                                                        {next === 'READY'
                                                            ? t('workQueue.finishProduction')
                                                            : t('workQueue.moveTo', { stage: STAGES[next] })
                                                        } <i className="fas fa-arrow-right ml-1"></i>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </>
    );
}
