import { useEffect, useState } from 'react';
import API from '../api/client';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import ModalClientSearch from '../components/ModalClientSearch';
import ModalProductSearch from '../components/ModalProductSearch';

const STATUS_LABELS = {
    DRAFT: 'Borrador', PENDING_MATERIAL: 'Esperando Material', CUTTING: 'Corte',
    BENDING: 'Doblado', ASSEMBLY: 'Ensamblaje', CLEANING: 'Limpieza',
    PAINTING: 'Pintura', QUALITY_CHECK: 'Control Calidad', READY_FOR_DELIVERY: 'Listo p/Entrega',
    DELIVERED: 'Entregado', CANCELLED: 'Cancelado',
};
const STATUS_COLORS = {
    DRAFT: 'secondary', PENDING_MATERIAL: 'warning', CUTTING: 'primary',
    BENDING: 'info', ASSEMBLY: 'purple', CLEANING: 'teal', PAINTING: 'danger',
    QUALITY_CHECK: 'warning', READY_FOR_DELIVERY: 'success', DELIVERED: 'dark', CANCELLED: 'danger',
};
const PRIORITY_BADGES = { LOW: 'secondary', NORMAL: 'info', HIGH: 'warning', URGENT: 'danger' };
const NEXT_STATUS = {
    DRAFT: 'PENDING_MATERIAL', PENDING_MATERIAL: 'CUTTING', CUTTING: 'BENDING',
    BENDING: 'CLEANING', ASSEMBLY: 'CLEANING', CLEANING: 'PAINTING',
    PAINTING: 'QUALITY_CHECK', QUALITY_CHECK: 'READY_FOR_DELIVERY', READY_FOR_DELIVERY: 'DELIVERED',
};

export default function Production() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const { hasRole } = useAuth();

    // Novedades para el Modal
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Search Modals State
    const [showClientModal, setShowClientModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);

    // Almacena objetos para pintar nombre en UI pero mandar IDs al Backend
    const [selectedClient, setSelectedClient] = useState(null);

    const [form, setForm] = useState({
        id: null, client_id: '', priority: 'NORMAL', estimated_delivery: '', notes: '',
        items: [] // { product_id, name, part_number, requires_assembly, quantity, notes }
    });

    const loadData = async () => {
        try {
            const params = filterStatus ? `?status=${filterStatus}` : '';
            const [oRes] = await Promise.all([
                API.get(`/production${params}`)
            ]);
            setOrders(oRes.data);
            setLoading(false);
        } catch (error) {
            toast.error('Error al cargar datos. Verifica la conexión.');
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [filterStatus]);

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
            toast.error('No se pudo cargar el detalle de la orden');
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
            toast.warning('Esta pieza ya está en la orden. Puedes modificar su cantidad en la tabla.');
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
            return toast.warning('Debe seleccionar un Cliente conectando con la Lupa.');
        }

        if (form.items.length === 0) {
            return toast.warning('Debe agregar al menos una pieza a fabricar a la orden.');
        }

        // Prevenir errores de MySQL con fechas vacías (Strict Mode)
        const payload = {
            ...form,
            estimated_delivery: form.estimated_delivery || null
        };

        try {
            if (isEditing) {
                await API.put(`/production/${form.id}`, payload);
                toast.success('Orden de producción actualizada.');
            } else {
                await API.post('/production', payload);
                toast.success('Nueva orden de producción creada.');
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al guardar la orden.');
        }
    };

    const advanceOrder = async (id, currentStatus, requiresAssembly) => {
        let nextStatus = NEXT_STATUS[currentStatus];
        if (currentStatus === 'BENDING' && requiresAssembly) nextStatus = 'ASSEMBLY';
        if (!nextStatus) return;
        try {
            await API.put(`/production/${id}/advance`, { to_status: nextStatus, notes: `Avance automático desde UI` });
            toast.success(`Orden avanzada a: ${STATUS_LABELS[nextStatus]}`);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al avanzar la orden.');
        }
    };

    const handleDelete = async (order) => {
        if (window.confirm(`¿Estás seguro de eliminar la orden ${order.order_number} de ${order.client_name}?\nEsta acción no se puede deshacer.`)) {
            try {
                await API.delete(`/production/${order.id}`);
                toast.success('Orden eliminada exitosamente.');
                loadData();
            } catch (err) {
                toast.error(err.response?.data?.error || 'Error al eliminar la orden.');
            }
        }
    };

    const handleRequisitionRequest = async (orderId) => {
        try {
            const res = await API.post(`/requisitions/generate/${orderId}`);
            if (res.status === 201 || res.status === 200) {
                toast.success(res.data.message || 'Requisición lista.');

                // Obtener el PDF protegido retornando un Blob
                const pdfRes = await API.get(`/requisitions/${res.data.requisitionId}/pdf`, { responseType: 'blob' });
                const fileURL = URL.createObjectURL(new Blob([pdfRes.data], { type: 'application/pdf' }));
                window.open(fileURL, '_blank');

                loadData();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al generar la requisición de materiales.');
        }
    };

    return (
        <>
            <div className="content-header mb-3 d-flex align-items-center justify-content-between">
                <div>
                    <h1 style={{ fontWeight: 700 }}><i className="fas fa-industry mr-2 text-danger"></i>Órdenes de Producción</h1>
                    <small className="text-muted">Gestión y seguimiento del flujo de producción</small>
                </div>
                {hasRole('ADMIN', 'SUPERVISOR', 'VENTAS') && (
                    <button className="btn btn-danger" onClick={openCreateModal}>
                        <i className="fas fa-plus mr-1"></i>Nueva Orden
                    </button>
                )}
            </div>

            {/* Filtros por estado */}
            <div className="card mb-3">
                <div className="card-body py-2 d-flex gap-2 flex-wrap">
                    <button className={`btn btn-sm ${filterStatus === '' ? 'btn-dark' : 'btn-outline-dark'} mr-1`} onClick={() => setFilterStatus('')}>Todas</button>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <button key={k} className={`btn btn-sm mr-1 ${filterStatus === k ? 'btn-danger' : 'btn-outline-secondary'}`} onClick={() => setFilterStatus(k)}>{v}</button>
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
                                        <th>N° Orden</th><th>Cliente</th><th>Pieza/Producto</th><th>Cant.</th>
                                        <th>Estado</th><th>Prioridad</th><th>Entrega Est.</th><th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.length === 0 ? (
                                        <tr><td colSpan="7" className="text-center py-4 text-muted">No hay órdenes registradas.</td></tr>
                                    ) : orders.map(o => (
                                        <tr key={o.id}>
                                            <td><strong style={{ color: '#e94560' }}>{o.order_number}</strong></td>
                                            <td>{o.client_name}</td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <i className="fas fa-layer-group text-secondary mr-2"></i>
                                                    <strong>{o.total_items}</strong> <span className="text-muted ml-1" style={{ fontSize: '0.9rem' }}>Piezas</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge badge-${STATUS_COLORS[o.status] || 'secondary'}`} style={{ padding: '5px 10px', borderRadius: '6px' }}>
                                                    {o.status === 'READY_FOR_DELIVERY' ? 'Listo p/Entrega' : (o.status === 'IN_PROGRESS' ? 'En Producción' : STATUS_LABELS[o.status] || o.status)}
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
                                                {/* Botón de Avanzar quitado en lista general porque ahora el avance es por Ítem en el Detalle */}
                                                <a href={`/production/${o.id}`} className="btn btn-sm btn-outline-info mr-1" title="Ver Detalle y Flujo">
                                                    <i className="fas fa-project-diagram"></i>
                                                </a>

                                                {/* Botón de Requisición */}
                                                {(o.status === 'PENDING_MATERIAL' || o.status === 'IN_PROGRESS' || o.status === 'DRAFT') && hasRole('ADMIN', 'SUPERVISOR') && (
                                                    <button className="btn btn-sm btn-outline-warning mr-1" onClick={() => handleRequisitionRequest(o.id)} title="Solicitar Materiales (Generar Requisición)">
                                                        <i className="fas fa-clipboard-list"></i>
                                                    </button>
                                                )}

                                                {hasRole('ADMIN', 'SUPERVISOR', 'VENTAS') && (
                                                    <>
                                                        <button className="btn btn-sm btn-outline-primary mr-1" onClick={() => openEditModal(o)} title="Editar Orden">
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(o)} title="Eliminar Orden">
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
                                <h5 className="modal-title font-weight-bold">{isEditing ? 'Editar Orden de Producción' : 'Nueva Orden de Producción'}</h5>
                                <button type="button" className="close" onClick={() => setShowModal(false)}><span>&times;</span></button>
                            </div>
                            <form onSubmit={handleSave}>
                                <div className="modal-body">
                                    <div className="row">
                                        <div className="col-12">
                                            <div className="row">
                                                <div className="col-md-6 form-group">
                                                    <label>Cliente Asignado <span className="text-danger">*</span></label>
                                                    <div className="input-group">
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            readOnly
                                                            value={selectedClient ? selectedClient.company_name : ''}
                                                            placeholder="Click en la lupa para buscar..."
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
                                                    <label>Fecha Est. Entrega</label>
                                                    <input type="date" className="form-control" value={form.estimated_delivery} onChange={e => setForm({ ...form, estimated_delivery: e.target.value })} />
                                                </div>
                                                <div className="col-md-3 form-group">
                                                    <label>Prioridad Global</label>
                                                    <select className="form-control" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                                        <option value="LOW">Baja</option>
                                                        <option value="NORMAL">Normal</option>
                                                        <option value="HIGH">Alta</option>
                                                        <option value="URGENT">Urgente</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* GRID DETALLE DE PIEZAS */}
                                    <div className="card mt-3" style={{ border: '1px solid #e9ecef', boxShadow: 'none' }}>
                                        <div className="card-header bg-light d-flex justify-content-between align-items-center">
                                            <h6 className="m-0 font-weight-bold text-dark"><i className="fas fa-cubes mr-2"></i>Piezas a Fabricar</h6>
                                            {!isEditing && (
                                                <button type="button" className="btn btn-sm btn-dark" onClick={() => setShowProductModal(true)}>
                                                    <i className="fas fa-plus mr-1"></i> Añadir Pieza del Catálogo
                                                </button>
                                            )}
                                        </div>
                                        <div className="card-body p-0">
                                            <div className="table-responsive">
                                                <table className="table table-sm table-striped mb-0">
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: '40%' }}>Producto / Referencia</th>
                                                            <th style={{ width: '15%' }} className="text-center">Cant.</th>
                                                            <th style={{ width: '35%' }}>Notas Específicas</th>
                                                            <th style={{ width: '10%' }} className="text-center">Quitar</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {form.items.length === 0 ? (
                                                            <tr>
                                                                <td colSpan="4" className="text-center text-muted p-4">
                                                                    Usa el botón "Añadir Pieza" para componer la orden.
                                                                </td>
                                                            </tr>
                                                        ) : form.items.map((it, idx) => (
                                                            <tr key={idx}>
                                                                <td className="align-middle">
                                                                    <strong>{it.name}</strong><br />
                                                                    <small className="text-muted">{it.part_number}</small>
                                                                    {it.requires_assembly && <span className="badge badge-warning ml-2">Ensamblaje</span>}
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
                                                                        placeholder="Notas de corte, color..."
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
                                            <label>Notas Globales de la Orden (Despacho, Facturación, etc.)</label>
                                            <textarea className="form-control" rows="2" placeholder="Ej: Entregar primero las piezas urgentes." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}></textarea>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-danger"><i className="fas fa-save mr-1"></i>{isEditing ? 'Guardar Cambios de Cabecera' : 'Emitir Orden'}</button>
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
        </>
    );
}
