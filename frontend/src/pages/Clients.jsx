import { useEffect, useState } from 'react';
import API from '../api/client';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

export default function Clients() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const { hasRole } = useAuth();

    // Novedades para el Modal de Crear/Editar
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ id: null, company_name: '', contact_name: '', email: '', phone: '', address: '', tax_id: '', credit_limit: 0, is_active: true });

    const fetchClients = () => {
        API.get('/clients').then(r => { setClients(r.data); setLoading(false); });
    };
    useEffect(() => { fetchClients(); }, []);

    const filtered = clients.filter(c =>
        c.company_name.toLowerCase().includes(search.toLowerCase()) ||
        (c.contact_name || '').toLowerCase().includes(search.toLowerCase())
    );

    const openCreateModal = () => {
        setIsEditing(false);
        setForm({ id: null, company_name: '', contact_name: '', email: '', phone: '', address: '', tax_id: '', credit_limit: 0, is_active: true });
        setShowModal(true);
    };

    const openEditModal = (client) => {
        setIsEditing(true);
        setForm({
            id: client.id,
            company_name: client.company_name,
            contact_name: client.contact_name || '',
            email: client.email || '',
            phone: client.phone || '',
            address: client.address || '',
            tax_id: client.tax_id || '',
            credit_limit: parseFloat(client.credit_limit) || 0,
            is_active: client.is_active
        });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await API.put(`/clients/${form.id}`, form);
                toast.success('Cliente actualizado exitosamente.');
            } else {
                await API.post('/clients', form);
                toast.success('Cliente creado exitosamente.');
            }
            setShowModal(false);
            fetchClients();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al guardar el cliente.');
        }
    };

    const handleDelete = async (client) => {
        if (window.confirm(`¿Estás seguro de eliminar el cliente "${client.company_name}"?\nEsta acción no se puede deshacer.`)) {
            try {
                await API.delete(`/clients/${client.id}`);
                toast.success('Cliente eliminado exitosamente.');
                fetchClients();
            } catch (err) {
                toast.error(err.response?.data?.error || 'Error al eliminar el cliente.');
            }
        }
    };

    return (
        <>
            <div className="content-header mb-3 d-flex align-items-center justify-content-between">
                <div>
                    <h1 style={{ fontWeight: 700 }}><i className="fas fa-users mr-2 text-danger"></i>Clientes</h1>
                    <small className="text-muted">Gestión de clientes y cuentas</small>
                </div>
                {hasRole('ADMIN', 'VENTAS') && (
                    <button className="btn btn-danger" onClick={openCreateModal}><i className="fas fa-plus mr-1"></i>Nuevo Cliente</button>
                )}
            </div>

            <div className="card mb-3" style={{ borderRadius: '12px' }}>
                <div className="card-body py-2">
                    <input
                        className="form-control" placeholder="Buscar cliente por nombre o contacto..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        style={{ borderRadius: '8px' }}
                    />
                </div>
            </div>
            {loading ? <div className="text-center pt-5"><i className="fas fa-spinner fa-spin fa-3x text-secondary"></i></div> : (
                <div className="card" style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead style={{ background: '#1a1a2e', color: '#fff' }}>
                                    <tr><th>Empresa</th><th>Contacto</th><th>Correo</th><th>Teléfono</th><th>Límite Crédito</th><th>Saldo Pendiente</th><th>Estado</th>{hasRole('ADMIN', 'VENTAS') && <th className="text-center">Acciones</th>}</tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan="8" className="text-center py-4 text-muted">No se encontraron clientes.</td></tr>
                                    ) : filtered.map(c => (
                                        <tr key={c.id}>
                                            <td><strong>{c.company_name}</strong>{c.tax_id && <><br /><small className="text-muted">RUC/NIT: {c.tax_id}</small></>}</td>
                                            <td>{c.contact_name || '—'}</td>
                                            <td>{c.email || '—'}</td>
                                            <td>{c.phone || '—'}</td>
                                            <td>${parseFloat(c.credit_limit || 0).toLocaleString('es', { minimumFractionDigits: 2 })}</td>
                                            <td>
                                                <strong style={{ color: parseFloat(c.outstanding_balance) > 0 ? '#dc3545' : '#28a745' }}>
                                                    ${parseFloat(c.outstanding_balance || 0).toLocaleString('es', { minimumFractionDigits: 2 })}
                                                </strong>
                                            </td>
                                            <td>
                                                <span className={`badge badge-${c.is_active ? 'success' : 'secondary'}`}>
                                                    {c.is_active ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            {hasRole('ADMIN', 'VENTAS') && (
                                                <td className="text-center">
                                                    <button className="btn btn-sm btn-outline-primary mr-2" onClick={() => openEditModal(c)} title="Editar Cliente">
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c)} title="Eliminar Cliente">
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Crear/Editar Cliente */}
            {showModal && (
                <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content" style={{ borderRadius: '12px' }}>
                            <div className="modal-header" style={{ background: '#1a1a2e', color: '#fff', borderRadius: '12px 12px 0 0' }}>
                                <h5 className="modal-title">{isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}</h5>
                                <button type="button" className="close text-white" onClick={() => setShowModal(false)}><span>&times;</span></button>
                            </div>
                            <form onSubmit={handleSave}>
                                <div className="modal-body">
                                    <div className="row">
                                        <div className="col-md-6 form-group">
                                            <label>Nombre de la Empresa / Razón Social <span className="text-danger">*</span></label>
                                            <input className="form-control" required value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} />
                                        </div>
                                        <div className="col-md-6 form-group">
                                            <label>RUC / NIT</label>
                                            <input className="form-control" value={form.tax_id} onChange={e => setForm({ ...form, tax_id: e.target.value })} />
                                        </div>
                                        <div className="col-md-6 form-group">
                                            <label>Persona de Contacto</label>
                                            <input className="form-control" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
                                        </div>
                                        <div className="col-md-6 form-group">
                                            <label>Teléfono</label>
                                            <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                        </div>
                                        <div className="col-md-6 form-group">
                                            <label>Correo Electrónico</label>
                                            <input type="email" className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                        </div>
                                        <div className="col-md-6 form-group">
                                            <label>Límite de Crédito ($)</label>
                                            <input type="number" step="0.01" className="form-control" value={form.credit_limit} onChange={e => setForm({ ...form, credit_limit: e.target.value })} />
                                        </div>
                                        <div className="col-md-12 form-group">
                                            <label>Dirección</label>
                                            <textarea className="form-control" rows="2" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}></textarea>
                                        </div>
                                        {isEditing && (
                                            <div className="col-md-6 form-group">
                                                <label>Estado</label>
                                                <select className="form-control" value={form.is_active ? '1' : '0'} onChange={e => setForm({ ...form, is_active: e.target.value === '1' })}>
                                                    <option value="1">Activo</option>
                                                    <option value="0">Inactivo</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-danger"><i className="fas fa-save mr-1"></i>{isEditing ? 'Guardar Cambios' : 'Crear Cliente'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
