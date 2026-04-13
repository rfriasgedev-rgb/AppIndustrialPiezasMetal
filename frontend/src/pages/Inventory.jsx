import { useEffect, useState } from 'react';
import API from '../api/client';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function Inventory() {
    const { t } = useTranslation();
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterCat, setFilterCat] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const { hasRole } = useAuth();

    // CRUD State
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({
        id: null, category_id: '', name: '', sku: '', description: '',
        quantity_available: 0, reorder_point: 0, unit_cost: 0, location: '', is_active: true, unit_of_measure_id: ''
    });

    const fetchData = () => {
        Promise.all([API.get('/inventory'), API.get('/inventory/categories'), API.get('/units')]).then(([r1, r2, r3]) => {
            setItems(r1.data); setCategories(r2.data); setUnits(r3.data); setLoading(false);
        }).catch(err => toast.error(t('inventory.fetchError')));
    };
    useEffect(() => { fetchData(); }, []);

    const filtered = items.filter(i => {
        const matchesCategory = filterCat ? i.category_id == filterCat : true;
        const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (i.sku && i.sku.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    const openCreateModal = () => {
        setIsEditing(false);
        setForm({
            id: null, category_id: '', name: '', sku: '', description: '',
            quantity_available: 0, reorder_point: 0, unit_cost: 0, location: '', is_active: true, unit_of_measure_id: ''
        });
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setIsEditing(true);
        setForm({
            id: item.id,
            category_id: item.category_id,
            name: item.name,
            sku: item.sku || '',
            description: item.description || '',
            quantity_available: parseFloat(item.quantity_available),
            reorder_point: parseFloat(item.reorder_point) || 0,
            unit_cost: parseFloat(item.unit_cost) || 0,
            location: item.location || '',
            unit_of_measure_id: item.unit_of_measure_id || '',
            is_active: item.is_active === 1 || item.is_active === true
        });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await API.put(`/inventory/${form.id}`, form);
                toast.success(t('inventory.updateSuccess'));
            } else {
                await API.post('/inventory', form);
                toast.success(t('inventory.createSuccess'));
            }
            setShowModal(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.error || t('inventory.saveError'));
        }
    };

    const handleDelete = async (item) => {
        const result = await Swal.fire({
            title: t('inventory.deleteConfirmTitle'),
            text: t('inventory.deleteConfirmText', { name: item.name }),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: t('inventory.btnYesDelete'),
            cancelButtonText: t('inventory.btnCancel')
        });

        if (result.isConfirmed) {
            try {
                await API.delete(`/inventory/${item.id}`);
                Swal.fire(t('inventory.deletedTitle'), t('inventory.deletedText'), 'success');
                fetchData();
            } catch (err) {
                Swal.fire(t('inventory.errorTitle'), err.response?.data?.error || t('inventory.deleteError'), 'error');
            }
        }
    };

    return (
        <>
            <div className="content-header mb-3 d-flex align-items-center justify-content-between">
                <div>
                    <h1 style={{ fontWeight: 700 }}><i className="fas fa-boxes mr-2 text-danger"></i>{t('inventory.pageTitle')}</h1>
                    <small className="text-muted">{t('inventory.pageSubtitle')}</small>
                </div>
                {hasRole('ADMIN', 'ALMACENISTA') && (
                    <button className="btn btn-danger" onClick={openCreateModal}><i className="fas fa-plus mr-1"></i>{t('inventory.btnNewItem')}</button>
                )}
            </div>

            <div className="row mb-3">
                {categories.map(cat => {
                    const catItems = items.filter(i => i.category_id === cat.id);
                    const totalQty = catItems.reduce((s, i) => s + parseFloat(i.quantity_available || 0), 0);
                    const lowStock = catItems.filter(i => parseFloat(i.quantity_available) <= parseFloat(i.reorder_point)).length;
                    return (
                        <div className="col-md-2 col-sm-4 mb-2" key={cat.id}>
                            <div
                                className={`card text-center p-2 ${filterCat == cat.id ? 'border-danger' : ''}`}
                                style={{ borderRadius: '10px', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
                                onClick={() => setFilterCat(filterCat == cat.id ? '' : cat.id)}
                            >
                                <div style={{ fontWeight: 700, color: '#e94560' }}>{cat.name}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{totalQty.toFixed(1)} <small style={{ fontSize: '0.7rem', color: '#888' }}>{cat.unit_of_measure}</small></div>
                                {lowStock > 0 && <small className="text-danger"><i className="fas fa-exclamation-triangle mr-1"></i>{lowStock} {t('inventory.lowStock')}</small>}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="row mb-3">
                <div className="col-md-6 col-lg-4">
                    <div className="input-group">
                        <div className="input-group-prepend">
                            <span className="input-group-text bg-white border-right-0" style={{ borderRadius: '10px 0 0 10px' }}>
                                <i className="fas fa-search text-muted"></i>
                            </span>
                        </div>
                        <input
                            type="text"
                            className="form-control border-left-0"
                            placeholder={t('inventory.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ borderRadius: '0 10px 10px 0', boxShadow: 'none' }}
                        />
                    </div>
                </div>
            </div>

            {loading ? <div className="text-center pt-5"><i className="fas fa-spinner fa-spin fa-3x text-secondary"></i></div> : (
                <div className="card" style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead style={{ background: '#1a1a2e', color: '#fff' }}>
                                    <tr>
                                        <th>{t('inventory.colName')}</th><th>{t('inventory.colCategory')}</th><th>{t('inventory.colSKU')}</th><th>{t('inventory.colAvailable')}</th>
                                        <th>{t('inventory.colReserved')}</th><th>{t('inventory.colMin')}</th><th>{t('inventory.colStatus')}</th><th>{t('inventory.colUnitCost')}</th>
                                        {hasRole('ADMIN', 'ALMACENISTA') && <th className="text-center">{t('inventory.colActions')}</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan="8" className="text-center py-4 text-muted">{t('inventory.noRecords')}</td></tr>
                                    ) : filtered.map(item => {
                                        const isLow = parseFloat(item.quantity_available) <= parseFloat(item.reorder_point);
                                        return (
                                            <tr key={item.id} style={isLow ? { background: '#fff3cd' } : {}}>
                                                <td><strong>{item.name}</strong>{item.location && <><br /><small className="text-muted"><i className="fas fa-map-marker-alt mr-1"></i>{item.location}</small></>}</td>
                                                <td><span className="badge badge-dark">{item.category_name}</span></td>
                                                <td><code>{item.sku || '—'}</code></td>
                                                <td><strong style={{ color: isLow ? '#dc3545' : '#28a745' }}>{parseFloat(item.quantity_available).toFixed(2)}</strong> {item.unit_of_measure}</td>
                                                <td>{parseFloat(item.quantity_reserved || 0).toFixed(2)} {item.unit_of_measure}</td>
                                                <td>{parseFloat(item.reorder_point || 0).toFixed(2)} {item.unit_of_measure}</td>
                                                <td>
                                                    {item.is_active === 1 || item.is_active === true
                                                        ? <span className="badge badge-success"><i className="fas fa-check mr-1"></i>{t('inventory.active')}</span>
                                                        : <span className="badge badge-danger"><i className="fas fa-ban mr-1"></i>{t('inventory.inactive')}</span>}
                                                </td>
                                                <td>${parseFloat(item.unit_cost || 0).toFixed(2)}</td>
                                                {hasRole('ADMIN', 'ALMACENISTA') && (
                                                    <td className="text-center">
                                                        <button className="btn btn-sm btn-outline-primary mr-1" onClick={() => openEditModal(item)} title={t('inventory.btnEdit')}><i className="fas fa-edit"></i></button>
                                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item)} title={t('inventory.btnDelete')}><i className="fas fa-trash"></i></button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Crear/Editar Item */}
            {showModal && (
                <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content" style={{ borderRadius: '12px' }}>
                            <div className="modal-header" style={{ background: '#1a1a2e', color: '#fff', borderRadius: '12px 12px 0 0' }}>
                                <h5 className="modal-title">{isEditing ? t('inventory.modalEditTitle') : t('inventory.modalNewTitle')}</h5>
                                <button type="button" className="close text-white" onClick={() => setShowModal(false)}><span>&times;</span></button>
                            </div>
                            <form onSubmit={handleSave}>
                                <div className="modal-body">
                                    <div className="row">
                                        <div className="col-md-6 form-group">
                                            <label>{t('inventory.modalMaterialName')} <span className="text-danger">*</span></label>
                                            <input type="text" className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                        </div>
                                        <div className="col-md-6 form-group">
                                            <label>{t('inventory.colCategory')} <span className="text-danger">*</span></label>
                                            <select className="form-control" required value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                                                <option value="">{t('inventory.dropdownSelect')}</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="col-md-4 form-group">
                                            <label>{t('inventory.modalSKU')}</label>
                                            <input type="text" className="form-control" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
                                        </div>
                                        <div className="col-md-4 form-group">
                                            <label>{t('inventory.colMin')}</label>
                                            <input type="number" step="0.01" className="form-control" value={form.reorder_point} onChange={e => setForm({ ...form, reorder_point: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                        <div className="col-md-4 form-group">
                                            <label>{t('inventory.colUnitCost')} ($)</label>
                                            <input type="number" step="0.01" className="form-control" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: parseFloat(e.target.value) || 0 })} />
                                        </div>

                                        {!isEditing && (
                                            <div className="col-md-4 form-group">
                                                <label>{t('inventory.modalInitialStock')}</label>
                                                <input type="number" step="0.01" className="form-control" value={form.quantity_available} onChange={e => setForm({ ...form, quantity_available: parseFloat(e.target.value) || 0 })} />
                                                <small className="text-muted">{t('inventory.modalStockWarning')}</small>
                                            </div>
                                        )}

                                        <div className="col-md-4 form-group">
                                            <label>{t('inventory.modalLocation')}</label>
                                            <input type="text" className="form-control" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                                        </div>
                                        <div className="col-md-4 form-group">
                                            <label>{t('inventory.modalUnit')} <span className="text-danger">*</span></label>
                                            <select className="form-control" required value={form.unit_of_measure_id} onChange={e => setForm({ ...form, unit_of_measure_id: e.target.value })}>
                                                <option value="">{t('inventory.dropdownUnit')}</option>
                                                {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
                                            </select>
                                        </div>
                                        {isEditing ? (
                                            <div className="col-md-4 form-group">
                                                <label>{t('inventory.colStatus')}</label>
                                                <select className="form-control" value={form.is_active ? '1' : '0'} onChange={e => setForm({ ...form, is_active: e.target.value === '1' })}>
                                                    <option value="1">{t('inventory.active')}</option>
                                                    <option value="0">{t('inventory.inactive')}</option>
                                                </select>
                                            </div>
                                        ) : (
                                            <div className="col-md-4"></div>
                                        )}

                                        <div className="col-md-12 form-group">
                                            <label>{t('inventory.modalDescription')}</label>
                                            <textarea className="form-control" rows="2" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}></textarea>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer d-flex justify-content-between">
                                    <small className="text-muted"><i className="fas fa-info-circle mr-1"></i> {t('inventory.modalFooterNote')}</small>
                                    <div>
                                        <button type="button" className="btn btn-secondary mr-2" onClick={() => setShowModal(false)}>{t('inventory.btnCancel')}</button>
                                        <button type="submit" className="btn btn-danger"><i className="fas fa-save mr-1"></i>{isEditing ? t('inventory.btnSave') : t('inventory.btnCreate')}</button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
