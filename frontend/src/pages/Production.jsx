import { useEffect, useState, useRef, useCallback } from 'react';
import API from '../api/client';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import ModalClientSearch from '../components/ModalClientSearch';
import ModalProductSearch from '../components/ModalProductSearch';
import ProductionHistoryModal from '../components/ProductionHistoryModal';

export default function Production() {
    const { t } = useTranslation();

    const STATUS_LABELS = {
        DRAFT: t('production.statusDraft', 'Borrador'),
        PENDING_MATERIAL: t('production.statusPendingMaterial', 'Esperando Material'),
        CUTTING: t('production.statusCutting', 'Corte'),
        BENDING: t('production.statusBending', 'Doblado'),
        ASSEMBLY: t('production.statusAssembly', 'Ensamblaje'),
        CLEANING: t('production.statusCleaning', 'Línea de Producción'),
        READY_FOR_DELIVERY: t('production.statusReadyForDelivery', 'Listo p/Entrega'),
        DELIVERED: t('production.statusDelivered', 'Entregado'),
        CANCELLED: t('production.statusCancelled', 'Cancelado')
    };
const STATUS_COLORS = {
    DRAFT: 'secondary', PENDING_MATERIAL: 'warning', CUTTING: 'primary',
    BENDING: 'info', ASSEMBLY: 'purple', CLEANING: 'success', 
    READY_FOR_DELIVERY: 'dark', DELIVERED: 'dark', CANCELLED: 'danger',
};
const PRIORITY_BADGES = { LOW: 'secondary', NORMAL: 'info', HIGH: 'warning', URGENT: 'danger' };
const NEXT_STATUS = {
    DRAFT: 'PENDING_MATERIAL', PENDING_MATERIAL: 'CUTTING', CUTTING: 'BENDING',
    BENDING: 'CLEANING', ASSEMBLY: 'CLEANING', CLEANING: 'READY_FOR_DELIVERY',
    READY_FOR_DELIVERY: 'DELIVERED',
};

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStage, setFilterStage] = useState(''); // '' = All
    const { hasRole } = useAuth();

    // Búsqueda
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const debounceRef = useRef(null);

    // Novedades para el Modal
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Modal de Historial de Producción
    const [historyModal, setHistoryModal] = useState(null); // { id, order_number }

    // Search Modals State
    const [showClientModal, setShowClientModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);

    // Almacena objetos para pintar nombre en UI pero mandar IDs al Backend
    const [selectedClient, setSelectedClient] = useState(null);

    const [form, setForm] = useState({
        id: null, client_id: '', priority: 'NORMAL', estimated_delivery: '', notes: '',
        items: [] // { product_id, name, part_number, requires_assembly, quantity, notes }
    });

    const loadData = useCallback(async (overrideSearch, overrideDateFrom, overrideDateTo) => {
        try {
            const q = new URLSearchParams();
            if (filterStage) q.set('stage', filterStage);
            const s = overrideSearch    !== undefined ? overrideSearch    : search;
            const df = overrideDateFrom !== undefined ? overrideDateFrom  : dateFrom;
            const dt = overrideDateTo   !== undefined ? overrideDateTo    : dateTo;
            if (s)  q.set('search',    s);
            if (df) q.set('date_from', df);
            if (dt) q.set('date_to',   dt);
            const oRes = await API.get(`/production${q.toString() ? '?' + q.toString() : ''}`);
            setOrders(oRes.data);
            setLoading(false);
        } catch (error) {
            toast.error(t('production.fetchError'));
            setLoading(false);
        }
    }, [filterStage, search, dateFrom, dateTo]);

    useEffect(() => { setLoading(true); loadData(); }, [filterStage]);

    // Auto-search con debounce 400ms al escribir en el campo de texto
    const handleSearchChange = (val) => {
        setSearch(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => loadData(val, dateFrom, dateTo), 400);
    };

    const handleDateFromChange = (val) => {
        setDateFrom(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => loadData(search, val, dateTo), 400);
    };

    const handleDateToChange = (val) => {
        setDateTo(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => loadData(search, dateFrom, val), 400);
    };

    const handleSearchBtn = () => {
        clearTimeout(debounceRef.current);
        setLoading(true);
        loadData(search, dateFrom, dateTo);
    };

    const handleClearSearch = () => {
        setSearch(''); setDateFrom(''); setDateTo('');
        clearTimeout(debounceRef.current);
        setLoading(true);
        loadData('', '', '');
    };

    const openCreateModal = () => {
        setIsEditing(false);
        setSelectedClient(null);
        setForm({
            id: null, client_id: '', priority: 'NORMAL', estimated_delivery: '', notes: '',
            items: []
        });
        setShowModal(true);
    };

    const openEditModal = (order) => {
        setIsEditing(true);
        API.get(`/production/${order.id}`).then(res => {
            const data = res.data;
            setSelectedClient({ id: data.client_id, company_name: data.client_name });

            // Map the items
            const mappedItems = (data.items || []).map(i => ({
                id: i.id, // Detail ID for future use if we want to edit specific items
                product_id: i.product_id,
                name: i.product_name,
                part_number: i.part_number,
                requires_assembly: i.requires_assembly,
                quantity: i.quantity,
                notes: i.notes || ''
            }));

            setForm({
                id: data.id,
                client_id: data.client_id,
                priority: data.priority,
                estimated_delivery: data.estimated_delivery ? data.estimated_delivery.split('T')[0] : '',
                notes: data.notes || '',
                items: mappedItems
            });
            setShowModal(true);
        }).catch(err => {
            toast.error(t('production.loadDetailError'));
        });
    };

    const handleClientSelect = (client) => {
        setSelectedClient(client);
        setForm(prev => ({ ...prev, client_id: client.id }));
        setShowClientModal(false);
    };

    const handleProductSelect = (product) => {
        // Evitar duplicados
        if (form.items.find(i => i.product_id === product.id)) {
            toast.warning(t('production.productDuplicate'));
            setShowProductModal(false);
            return;
        }

        const newItem = {
            product_id: product.id,
            name: product.name,
            part_number: product.part_number,
            requires_assembly: product.requires_assembly,
            quantity: 1, // Por defecto al añadir
            notes: ''
        };

        setForm(prev => ({ ...prev, items: [...prev.items, newItem] }));
        setShowProductModal(false);
    };

    const updateItemQuantity = (product_id, qty) => {
        setForm(prev => ({
            ...prev,
            items: prev.items.map(i => i.product_id === product_id ? { ...i, quantity: qty } : i)
        }));
    };

    const updateItemNotes = (product_id, notes) => {
        setForm(prev => ({
            ...prev,
            items: prev.items.map(i => i.product_id === product_id ? { ...i, notes: notes } : i)
        }));
    };

    const removeItem = (product_id) => {
        setForm(prev => ({
            ...prev,
            items: prev.items.filter(i => i.product_id !== product_id)
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!form.client_id) {
            return toast.warning(t('production.clientWarning'));
        }

        if (form.items.length === 0) {
            return toast.warning(t('production.itemsWarning'));
        }

        // Prevenir errores de MySQL con fechas vacías (Strict Mode)
        const payload = {
            ...form,
            estimated_delivery: form.estimated_delivery || null
        };

        try {
            if (isEditing) {
                await API.put(`/production/${form.id}`, payload);
                toast.success(t('production.updateSuccess'));
            } else {
                await API.post('/production', payload);
                toast.success(t('production.createSuccess'));
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.error || t('production.saveError'));
        }
    };

    const advanceOrder = async (id, currentStatus, requiresAssembly) => {
        let nextStatus = NEXT_STATUS[currentStatus];
        if (currentStatus === 'BENDING' && requiresAssembly) nextStatus = 'ASSEMBLY';
        if (!nextStatus) return;
        try {
            await API.put(`/production/${id}/advance`, { to_status: nextStatus, notes: t('production.advanceAutoNotes') });
            toast.success(t('production.advanceSuccess', { status: STATUS_LABELS[nextStatus] }));
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.error || t('production.advanceError'));
        }
    };

    const handleDelete = async (order) => {
        if (window.confirm(t('production.deleteConfirm', { order: order.order_number, client: order.client_name }))) {
            try {
                await API.delete(`/production/${order.id}`);
                toast.success(t('production.deleteSuccess'));
                loadData();
            } catch (err) {
                toast.error(err.response?.data?.error || t('production.deleteError'));
            }
        }
    };

    const handleRequisitionRequest = async (orderId) => {
        try {
            const res = await API.post(`/requisitions/generate/${orderId}`);
            if (res.status === 201 || res.status === 200) {
                toast.success(res.data.message || t('production.requisitionReady'));

                // Obtener el PDF protegido retornando un Blob
                const pdfRes = await API.get(`/requisitions/${res.data.requisitionId}/pdf`, { responseType: 'blob' });
                const fileURL = URL.createObjectURL(new Blob([pdfRes.data], { type: 'application/pdf' }));
                window.open(fileURL, '_blank');

                loadData();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || t('production.requisitionError'));
        }
    };

    return (
        <>
            <div className="content-header mb-3 d-flex align-items-center justify-content-between">
                <div>
                    <h1 style={{ fontWeight: 700 }}><i className="fas fa-industry mr-2 text-danger"></i>{t('production.pageTitle')}</h1>
                    <small className="text-muted">{t('production.pageSubtitle')}</small>
                </div>
                {hasRole('ADMIN', 'SUPERVISOR', 'VENTAS') && (
                    <button className="btn btn-danger" onClick={openCreateModal}>
                        <i className="fas fa-plus mr-1"></i>{t('production.btnNewOrder')}
                    </button>
                )}
            </div>

            {/* Panel de búsqueda */}
            <div className="card mb-3">
                <div className="card-body py-2">
                    <div className="row align-items-end g-2">
                        {/* Campo texto */}
                        <div className="col-md-4">
                            <label className="mb-1" style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                <i className="fas fa-search mr-1"></i>{t('production.searchLabel', 'Order / Client')}
                            </label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder={t('production.searchPlaceholder', 'OP-2026-00001 or client name...')}
                                value={search}
                                onChange={e => handleSearchChange(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearchBtn()}
                            />
                        </div>
                        {/* Fecha desde */}
                        <div className="col-md-2">
                            <label className="mb-1" style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                <i className="fas fa-calendar mr-1"></i>{t('production.dateFrom', 'From')}
                            </label>
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={dateFrom}
                                onChange={e => handleDateFromChange(e.target.value)}
                            />
                        </div>
                        {/* Fecha hasta */}
                        <div className="col-md-2">
                            <label className="mb-1" style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                <i className="fas fa-calendar mr-1"></i>{t('production.dateTo', 'To')}
                            </label>
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={dateTo}
                                onChange={e => handleDateToChange(e.target.value)}
                            />
                        </div>
                        {/* Botones */}
                        <div className="col-md-4 d-flex gap-2">
                            <button
                                className="btn btn-sm btn-danger"
                                onClick={handleSearchBtn}
                                style={{ minWidth: 90, fontWeight: 600 }}
                            >
                                <i className="fas fa-search mr-1"></i>{t('production.btnSearch', 'Search')}
                            </button>
                            {(search || dateFrom || dateTo) && (
                                <button
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={handleClearSearch}
                                    title={t('production.btnClear', 'Clear filters')}
                                >
                                    <i className="fas fa-times mr-1"></i>{t('production.btnClear', 'Clear')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros por etapa de pieza — iguales a My Station */}
            <div className="card mb-3">
                <div className="card-body py-2 d-flex gap-2 flex-wrap" style={{ overflowX: 'auto' }}>
                    <button
                        className={`btn btn-sm mr-1 ${filterStage === '' ? 'btn-dark' : 'btn-outline-dark'}`}
                        onClick={() => setFilterStage('')}
                    >
                        {t('production.filterAll')}
                    </button>
                    {[
                        { key: 'DESIGN',   label: t('workQueue.stageDesign') },
                        { key: 'CUTTING',  label: t('workQueue.stageCutting') },
                        { key: 'BENDING',  label: t('workQueue.stageBending') },
                        { key: 'ASSEMBLY', label: t('workQueue.stageAssembly') },
                        { key: 'WELDING',  label: t('workQueue.stageWelding') },
                        { key: 'CLEANING', label: t('workQueue.stageCleaning') },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            className={`btn btn-sm mr-1 ${filterStage === key ? 'btn-success font-weight-bold' : 'btn-outline-secondary'}`}
                            onClick={() => setFilterStage(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? <div className="text-center pt-5"><i className="fas fa-spinner fa-spin fa-3x text-secondary"></i></div> : (
                <div className="card">
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead>
                                    <tr>
                                        <th>{t('production.colOrderNo')}</th><th>{t('production.colClient')}</th><th>{t('production.colProduct')}</th><th>{t('production.colQty')}</th>
                                        <th>{t('production.colStatus')}</th><th>{t('production.colPriority')}</th><th>{t('production.colEstDelivery')}</th><th>{t('production.colActions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.length === 0 ? (
                                        <tr><td colSpan="7" className="text-center py-4 text-muted">{t('production.noRecords')}</td></tr>
                                    ) : orders.map(o => (
                                        <tr key={o.id}>
                                            <td><strong style={{ color: '#e94560' }}>{o.order_number}</strong></td>
                                            <td>{o.client_name}</td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <i className="fas fa-layer-group text-secondary mr-2"></i>
                                                    <strong>{o.total_items}</strong> <span className="text-muted ml-1" style={{ fontSize: '0.9rem' }}>{t('production.lblPieces')}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge badge-${STATUS_COLORS[o.status] || 'secondary'}`} style={{ padding: '5px 10px', borderRadius: '6px' }}>
                                                    {o.status === 'READY_FOR_DELIVERY' ? t('production.statusReady') : (o.status === 'IN_PROGRESS' ? t('production.statusInProgress') : STATUS_LABELS[o.status] || o.status)}
                                                </span>
                                                {o.total_items > 0 && o.status !== 'DRAFT' && o.status !== 'CANCELLED' && (
                                                    <div className="progress mt-1" style={{ height: '5px', borderRadius: '5px' }}>
                                                        <div className="progress-bar bg-success" role="progressbar" style={{ width: `${o.progress}%` }} aria-valuenow={o.progress} aria-valuemin="0" aria-valuemax="100"></div>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`badge badge-${PRIORITY_BADGES[o.priority]}`} style={{ padding: '5px 10px', borderRadius: '6px' }}>
                                                    {o.priority}
                                                </span>
                                            </td>
                                            <td>{o.estimated_delivery ? new Date(o.estimated_delivery).toLocaleDateString() : '—'}</td>
                                            <td>
                                                {/* Botón de Historial de Producción */}
                                                <button
                                                    className="btn btn-sm btn-outline-info mr-1"
                                                    title="Ver historial de producción"
                                                    onClick={() => setHistoryModal({ id: o.id, order_number: o.order_number })}
                                                >
                                                    <i className="fas fa-history"></i>
                                                </button>

                                                {/* Botón de Requisición */}
                                                {(o.status === 'PENDING_MATERIAL' || o.status === 'IN_PROGRESS' || o.status === 'DRAFT') && hasRole('ADMIN', 'SUPERVISOR') && (
                                                    <button className="btn btn-sm btn-outline-warning mr-1" onClick={() => handleRequisitionRequest(o.id)} title={t('production.btnReqMaterial')}>
                                                        <i className="fas fa-clipboard-list"></i>
                                                    </button>
                                                )}

                                                {hasRole('ADMIN', 'SUPERVISOR', 'VENTAS') && (
                                                    <>
                                                        <button className="btn btn-sm btn-outline-primary mr-1" onClick={() => openEditModal(o)} title={t('production.btnEditOrder')}>
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(o)} title={t('production.btnDeleteOrder')}>
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </>
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

            {/* Modal Crear/Editar Orden */}
            {showModal && (
                <div className="modal d-block" style={{ background: 'rgba(15,23,42,0.4)', overflowY: 'auto' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title font-weight-bold">{isEditing ? t('production.modalEditTitle') : t('production.modalNewTitle')}</h5>
                                <button type="button" className="close" onClick={() => setShowModal(false)}><span>&times;</span></button>
                            </div>
                            <form onSubmit={handleSave}>
                                <div className="modal-body">
                                    <div className="row">
                                        <div className="col-12">
                                            <div className="row">
                                                <div className="col-md-6 form-group">
                                                    <label>{t('production.lblClient')} <span className="text-danger">*</span></label>
                                                    <div className="input-group">
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            readOnly
                                                            value={selectedClient ? selectedClient.company_name : ''}
                                                            placeholder={t('production.searchClientPlaceholder')}
                                                        />
                                                        <div className="input-group-append">
                                                            <button
                                                                className="btn btn-danger"
                                                                type="button"
                                                                onClick={() => setShowClientModal(true)}
                                                            >
                                                                <i className="fas fa-search"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-md-3 form-group">
                                                    <label>{t('production.lblEstDelivery')}</label>
                                                    <input type="date" className="form-control" value={form.estimated_delivery} onChange={e => setForm({ ...form, estimated_delivery: e.target.value })} />
                                                </div>
                                                <div className="col-md-3 form-group">
                                                    <label>{t('production.lblPriority')}</label>
                                                    <select className="form-control" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                                        <option value="LOW">{t('production.priorityLow')}</option>
                                                        <option value="NORMAL">{t('production.priorityNormal')}</option>
                                                        <option value="HIGH">{t('production.priorityHigh')}</option>
                                                        <option value="URGENT">{t('production.priorityUrgent')}</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* GRID DETALLE DE PIEZAS */}
                                    <div className="card mt-3" style={{ border: '1px solid #e9ecef', boxShadow: 'none' }}>
                                        <div className="card-header bg-light d-flex justify-content-between align-items-center">
                                            <h6 className="m-0 font-weight-bold text-dark"><i className="fas fa-cubes mr-2"></i>{t('production.lblItemsToMfg')}</h6>
                                            {!isEditing && (
                                                <button type="button" className="btn btn-sm btn-dark" onClick={() => setShowProductModal(true)}>
                                                    <i className="fas fa-plus mr-1"></i> {t('production.btnAddPiece')}
                                                </button>
                                            )}
                                        </div>
                                        <div className="card-body p-0">
                                            <div className="table-responsive">
                                                <table className="table table-sm table-striped mb-0">
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: '40%' }}>{t('production.colItemRef')}</th>
                                                            <th style={{ width: '15%' }} className="text-center">{t('production.colItemQty')}</th>
                                                            <th style={{ width: '35%' }}>{t('production.colItemNotes')}</th>
                                                            <th style={{ width: '10%' }} className="text-center">{t('production.colItemRemove')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {form.items.length === 0 ? (
                                                            <tr>
                                                                <td colSpan="4" className="text-center text-muted p-4">
                                                                    {t('production.itemsEmpty')}
                                                                </td>
                                                            </tr>
                                                        ) : form.items.map((it, idx) => (
                                                            <tr key={idx}>
                                                                <td className="align-middle">
                                                                    <strong>{it.name}</strong><br />
                                                                    <small className="text-muted">{it.part_number}</small>
                                                                    {it.requires_assembly && <span className="badge badge-warning ml-2">{t('production.badgeAssembly')}</span>}
                                                                </td>
                                                                <td className="align-middle px-3">
                                                                    <input
                                                                        type="number"
                                                                        className="form-control form-control-sm text-center"
                                                                        min="1"
                                                                        value={it.quantity}
                                                                        onChange={(e) => updateItemQuantity(it.product_id, parseInt(e.target.value) || 1)}
                                                                        disabled={isEditing} // En la V1 edición bloqueamos cambiar cant. de lineas activas
                                                                    />
                                                                </td>
                                                                <td className="align-middle">
                                                                    <input
                                                                        type="text"
                                                                        className="form-control form-control-sm"
                                                                        placeholder={t('production.notesPlaceholder')}
                                                                        value={it.notes}
                                                                        onChange={(e) => updateItemNotes(it.product_id, e.target.value)}
                                                                        disabled={isEditing}
                                                                    />
                                                                </td>
                                                                <td className="align-middle text-center">
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-outline-danger"
                                                                        onClick={() => removeItem(it.product_id)}
                                                                        disabled={isEditing}
                                                                    >
                                                                        <i className="fas fa-times"></i>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row mt-3">
                                        <div className="col-md-12 form-group">
                                            <label>{t('production.lblGlobalNotes')}</label>
                                            <textarea className="form-control" rows="2" placeholder={t('production.globalNotesPlaceholder')} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}></textarea>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('production.btnCancel')}</button>
                                    <button type="submit" className="btn btn-danger"><i className="fas fa-save mr-1"></i>{isEditing ? t('production.btnSaveEdit') : t('production.btnEmitOrder')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <ModalClientSearch
                show={showClientModal}
                onClose={() => setShowClientModal(false)}
                onSelect={handleClientSelect}
            />

            <ModalProductSearch
                show={showProductModal}
                onClose={() => setShowProductModal(false)}
                onSelect={handleProductSelect}
            />

            {historyModal && (
                <ProductionHistoryModal
                    orderId={historyModal.id}
                    orderNumber={historyModal.order_number}
                    onClose={() => setHistoryModal(null)}
                />
            )}
        </>
    );
}
