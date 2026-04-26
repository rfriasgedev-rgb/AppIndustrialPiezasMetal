import { useEffect, useState } from 'react';
import API from '../api/client';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import ModalInventorySearch from '../components/ModalInventorySearch';

export default function Products() {
    const { t } = useTranslation();
    const [products, setProducts] = useState([]);
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const { hasRole } = useAuth();

    // Novedades para el Modal
    const [showModal, setShowModal] = useState(false);
    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [form, setForm] = useState({
        id: null, name: '', part_number: '', description: '',
        requires_assembly: false, standard_hours: 0, sale_price: 0,
        unit_of_measure_id: '',
        is_active: true, image_data: null,
        materials: []
    });

    const [imagePreview, setImagePreview] = useState(null);

    const fetchProducts = () => {
        API.get('/products').then(r => { setProducts(r.data); setLoading(false); });
    };
    const fetchUnits = () => {
        API.get('/units').then(r => setUnits(r.data));
    };
    useEffect(() => { 
        fetchProducts(); 
        fetchUnits();
    }, []);

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.part_number || '').toLowerCase().includes(search.toLowerCase())
    );

    const openCreateModal = () => {
        setIsEditing(false);
        setForm({
            id: null, name: '', part_number: '', description: '',
            requires_assembly: false, standard_hours: 0, sale_price: 0,
            unit_of_measure_id: '',
            is_active: true, image_data: null,
            materials: []
        });
        setImagePreview(null);
        setShowModal(true);
    };

    const openEditModal = async (product) => {
        setIsEditing(true);
        try {
            const { data } = await API.get(`/products/${product.id}`);
            setForm({
                id: data.id,
                name: data.name,
                part_number: data.part_number || '',
                description: data.description || '',
                requires_assembly: data.requires_assembly == 1 || data.requires_assembly === true,
                standard_hours: data.standard_hours || 0,
                sale_price: parseFloat(data.sale_price) || 0,
                unit_of_measure_id: data.unit_of_measure_id || '',
                is_active: data.is_active == 1 || data.is_active === true,
                image_data: null, // no re-enviamos la imagen salvo que se cambie
                materials: data.materials || []
            });
            // La imagen guardada es base64 directo — mostrarla como preview
            setImagePreview(data.image_url || null);
            setShowModal(true);
        } catch (err) {
            toast.error(t('products.fetchError'));
        }
    };

    // Convierte el archivo seleccionado a base64
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.warning(t('products.imageTooLarge') || 'La imagen no debe superar 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result; // data:image/...;base64,...
            setForm(prev => ({ ...prev, image_data: base64 }));
            setImagePreview(base64);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: form.name,
                part_number: form.part_number,
                description: form.description,
                requires_assembly: form.requires_assembly,
                standard_hours: form.standard_hours,
                sale_price: form.sale_price,
                unit_of_measure_id: form.unit_of_measure_id || null,
                materials: form.materials,
            };

            if (isEditing) {
                payload.is_active = form.is_active;
            }

            // Solo enviamos image_data si el usuario seleccionó una nueva imagen
            if (form.image_data) {
                payload.image_data = form.image_data;
            }

            if (isEditing) {
                await API.put(`/products/${form.id}`, payload);
                toast.success(t('products.updateSuccess'));
            } else {
                await API.post('/products', payload);
                toast.success(t('products.createSuccess'));
            }
            setShowModal(false);
            fetchProducts();
        } catch (err) {
            toast.error(err.response?.data?.error || t('products.saveError'));
        }
    };

    const handleDelete = async (product) => {
        if (window.confirm(t('products.deleteConfirm', { name: product.name }))) {
            try {
                await API.delete(`/products/${product.id}`);
                toast.success(t('products.deleteSuccess'));
                fetchProducts();
            } catch (err) {
                toast.error(err.response?.data?.error || t('products.deleteError'));
            }
        }
    };

    const handleMaterialSelect = (item) => {
        if (form.materials.some(m => m.item_id === item.id)) {
            toast.warning(t('products.materialDuplicate', { name: item.name }));
            return;
        }
        setForm(prev => ({
            ...prev,
            materials: [
                ...prev.materials,
                {
                    item_id: item.id,
                    name: item.name,
                    part_number: item.sku,
                    unit_measure: item.unit_of_measure,
                    quantity_required: 1
                }
            ]
        }));
        setShowInventoryModal(false);
    };

    const updateMaterialQuantity = (item_id, qty) => {
        setForm(prev => ({
            ...prev,
            materials: prev.materials.map(m => m.item_id === item_id ? { ...m, quantity_required: qty } : m)
        }));
    };

    const removeMaterial = (item_id) => {
        setForm(prev => ({
            ...prev,
            materials: prev.materials.filter(m => m.item_id !== item_id)
        }));
    };

    return (
        <>
            <div className="content-header mb-3 d-flex align-items-center justify-content-between">
                <div>
                    <h1 style={{ fontWeight: 700 }}><i className="fas fa-layer-group mr-2 text-danger"></i>{t('products.pageTitle')}</h1>
                    <small className="text-muted">{t('products.pageSubtitle')}</small>
                </div>
                {hasRole('ADMIN', 'VENTAS', 'SUPERVISOR') && (
                    <button className="btn btn-danger" onClick={openCreateModal}><i className="fas fa-plus mr-1"></i>{t('products.btnNewProduct')}</button>
                )}
            </div>

            <div className="card mb-3" style={{ borderRadius: '12px' }}>
                <div className="card-body py-2">
                    <input
                        className="form-control" placeholder={t('products.searchPlaceholder')}
                        value={search} onChange={e => setSearch(e.target.value)}
                        style={{ borderRadius: '8px' }}
                    />
                </div>
            </div>
            {loading ? <div className="text-center pt-5"><i className="fas fa-spinner fa-spin fa-3x text-secondary"></i></div> : (
                <div className="card" style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle">
                                <thead style={{ background: '#1a1a2e', color: '#fff' }}>
                                    <tr>
                                        <th style={{ width: '60px' }}>{t('products.colImage')}</th>
                                        <th>{t('products.colName')}</th>
                                        <th>{t('products.colPartNumber')}</th>
                                        <th>{t('products.colUnit')}</th>
                                        <th>{t('products.colRequiresAssembly')}</th>
                                        <th>{t('products.colStandardHours')}</th>
                                        <th>{t('products.colStatus')}</th>
                                        {hasRole('ADMIN', 'VENTAS', 'SUPERVISOR') && <th className="text-center">{t('products.colActions')}</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan="7" className="text-center py-4 text-muted">{t('products.noRecords')}</td></tr>
                                    ) : filtered.map(p => (
                                        <tr key={p.id}>
                                            <td>
                                                {p.image_url ? (
                                                    <img
                                                        src={p.image_url}
                                                        alt={p.name}
                                                        style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ccc' }}
                                                    />
                                                ) : (
                                                    <div style={{ width: '45px', height: '45px', background: '#e9ecef', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#adb5bd' }}>
                                                        <i className="fas fa-image"></i>
                                                    </div>
                                                )}
                                            </td>
                                            <td><strong>{p.name}</strong><br /><small className="text-muted">{p.description}</small></td>
                                            <td>{p.part_number || '—'}</td>
                                            <td className="text-center"><span className="badge badge-light border">{p.unit_measure || '—'}</span></td>
                                            <td>
                                                <span className={`badge badge-${p.requires_assembly ? 'info' : 'secondary'}`}>
                                                    {p.requires_assembly ? t('products.yes') : t('products.no')}
                                                </span>
                                            </td>
                                            <td>{p.standard_hours} hrs</td>
                                            <td>
                                                <span className={`badge badge-${p.is_active ? 'success' : 'secondary'}`}>
                                                    {p.is_active ? t('products.catalog') : t('products.inactive')}
                                                </span>
                                            </td>
                                            {hasRole('ADMIN', 'VENTAS', 'SUPERVISOR') && (
                                                <td className="text-center">
                                                    <button className="btn btn-sm btn-outline-primary mr-2" onClick={() => openEditModal(p)} title={t('products.btnEdit')}>
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(p)} title={t('products.btnDelete')}>
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

            {/* Modal Crear/Editar Producto */}
            {showModal && (
                <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content" style={{ borderRadius: '12px' }}>
                            <div className="modal-header" style={{ background: '#1a1a2e', color: '#fff', borderRadius: '12px 12px 0 0' }}>
                                <h5 className="modal-title">{isEditing ? t('products.modalEditTitle') : t('products.modalNewTitle')}</h5>
                                <button type="button" className="close text-white" onClick={() => setShowModal(false)}><span>&times;</span></button>
                            </div>
                            <form onSubmit={handleSave}>
                                <div className="modal-body">
                                    <div className="row">
                                        <div className="col-md-8">
                                            <div className="row">
                                                <div className="col-md-12 form-group">
                                                    <label>{t('products.lblProductName')} <span className="text-danger">*</span></label>
                                                    <input className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                                </div>
                                                <div className="col-md-6 form-group">
                                                    <label>{t('products.lblSKU')}</label>
                                                    <input className="form-control" value={form.part_number} onChange={e => setForm({ ...form, part_number: e.target.value })} />
                                                </div>
                                                <div className="col-md-6 form-group">
                                                    <label>{t('products.lblUnit')} <span className="text-danger">*</span></label>
                                                    <select className="form-control" required value={form.unit_of_measure_id} onChange={e => setForm({ ...form, unit_of_measure_id: e.target.value })}>
                                                        <option value="">{t('products.selectUnit') || 'Seleccionar...'}</option>
                                                        {units.map(u => (
                                                            <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="col-md-12 form-group">
                                                    <label>{t('products.lblDescription')}</label>
                                                    <textarea className="form-control" rows="2" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}></textarea>
                                                </div>

                                                <div className="col-md-6 form-group mt-3">
                                                    <div className="custom-control custom-switch">
                                                        <input type="checkbox" className="custom-control-input" id="requiresAssembly" checked={form.requires_assembly} onChange={e => setForm({ ...form, requires_assembly: e.target.checked })} />
                                                        <label className="custom-control-label" htmlFor="requiresAssembly">{t('products.lblRequiresAssembly')}</label>
                                                    </div>
                                                </div>

                                                <div className="col-md-6 form-group">
                                                    <label>{t('products.lblStandardHours')}</label>
                                                    <input type="number" step="0.5" className="form-control" value={form.standard_hours} onChange={e => setForm({ ...form, standard_hours: parseFloat(e.target.value) || 0 })} />
                                                </div>
                                                <div className="col-md-6 form-group">
                                                    <label>{t('products.lblSalePrice')}</label>
                                                    <input type="number" step="0.01" className="form-control" value={form.sale_price} onChange={e => setForm({ ...form, sale_price: parseFloat(e.target.value) || 0 })} />
                                                </div>
                                                {isEditing && (
                                                    <div className="col-md-6 form-group">
                                                        <label>{t('products.lblStatus')}</label>
                                                        <select className="form-control" value={form.is_active ? '1' : '0'} onChange={e => setForm({ ...form, is_active: e.target.value === '1' })}>
                                                            <option value="1">{t('products.statusActive')}</option>
                                                            <option value="0">{t('products.statusInactive')}</option>
                                                        </select>
                                                    </div>
                                                )}
                                            </div>

                                            {/* SECCIÓN BOM (LISTA DE MATERIALES) */}
                                            <div className="card mt-4 shadow-sm" style={{ border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                                                <div className="card-header bg-light d-flex justify-content-between align-items-center">
                                                    <h6 className="mb-0 font-weight-bold"><i className="fas fa-list-ol mr-2 text-primary"></i>{t('products.bomTitle')}</h6>
                                                    <button type="button" className="btn btn-sm btn-primary font-weight-bold" onClick={() => setShowInventoryModal(true)}>
                                                        <i className="fas fa-plus mr-1"></i> {t('products.btnAddMaterial')}
                                                    </button>
                                                </div>
                                                <div className="card-body p-0" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                                    {form.materials.length === 0 ? (
                                                        <div className="text-center p-4 text-muted border-bottom">
                                                            <i className="fas fa-box-open fa-2x mb-2 text-light"></i>
                                                            <p className="mb-0">{t('products.bomEmpty')}</p>
                                                        </div>
                                                    ) : (
                                                        <table className="table table-sm table-striped mb-0">
                                                            <thead className="thead-light">
                                                                <tr>
                                                                    <th style={{ width: '45%' }}>{t('products.colMaterial')}</th>
                                                                    <th style={{ width: '25%' }} className="text-center">{t('products.colQtyReq')}</th>
                                                                    <th style={{ width: '20%' }} className="text-center">{t('products.colUnit')}</th>
                                                                    <th style={{ width: '10%' }} className="text-center"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {form.materials.map(mat => (
                                                                    <tr key={mat.item_id}>
                                                                        <td className="align-middle border-top">
                                                                            <strong>{mat.name}</strong><br />
                                                                            <small className="text-muted">{mat.part_number || 'S/N'}</small>
                                                                        </td>
                                                                        <td className="align-middle border-top text-center">
                                                                            <input
                                                                                type="number"
                                                                                className="form-control form-control-sm text-center font-weight-bold mx-auto"
                                                                                style={{ width: '90px' }}
                                                                                min="0.001"
                                                                                step="0.001"
                                                                                value={mat.quantity_required}
                                                                                onChange={e => updateMaterialQuantity(mat.item_id, parseFloat(e.target.value) || 0)}
                                                                                required
                                                                            />
                                                                        </td>
                                                                        <td className="align-middle border-top text-center text-muted">
                                                                            {mat.unit_measure}
                                                                        </td>
                                                                        <td className="align-middle border-top text-center">
                                                                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeMaterial(mat.item_id)}>
                                                                                <i className="fas fa-times"></i>
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            </div>

                                        </div>
                                        <div className="col-md-4">
                                            <div className="form-group text-center">
                                                <label>{t('products.lblPhoto')}</label>
                                                <div className="border rounded p-2 mb-2" style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', overflow: 'hidden' }}>
                                                    {imagePreview ? (
                                                        <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                                    ) : (
                                                        <div className="text-muted"><i className="fas fa-camera fa-3x mb-2 d-block"></i> {t('products.noImage')}</div>
                                                    )}
                                                </div>
                                                <div className="custom-file text-left">
                                                    <input type="file" className="custom-file-input" id="customFile" accept="image/*" onChange={handleImageChange} />
                                                    <label className="custom-file-label" htmlFor="customFile" data-browse="Elegir" style={{ overflow: 'hidden' }}>
                                                        {form.image_data ? t('products.imageSelected') || 'Imagen seleccionada ✓' : t('products.fileSelect')}
                                                    </label>
                                                </div>
                                                <small className="form-text text-muted">{t('products.supportedFormats')}</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('products.btnCancel')}</button>
                                    <button type="submit" className="btn btn-danger"><i className="fas fa-save mr-1"></i>{isEditing ? t('products.btnSave') : t('products.btnCreate')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal para Buscar Inventario */}
            <ModalInventorySearch
                show={showInventoryModal}
                onClose={() => setShowInventoryModal(false)}
                onSelect={handleMaterialSelect}
            />
        </>
    );
}
