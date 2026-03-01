import { useEffect, useState } from 'react';
import API from '../api/client';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import ModalInventorySearch from '../components/ModalInventorySearch';

export default function Products() {
    const [products, setProducts] = useState([]);
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
        is_active: true, image: null, image_url: '',
        materials: [] // Array of { item_id, name, part_number, unit_measure, quantity_required }
    });

    const [imagePreview, setImagePreview] = useState(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const BASE_URL = API_URL.replace('/api', '');

    const fetchProducts = () => {
        API.get('/products').then(r => { setProducts(r.data); setLoading(false); });
    };
    useEffect(() => { fetchProducts(); }, []);

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.part_number || '').toLowerCase().includes(search.toLowerCase())
    );

    const openCreateModal = () => {
        setIsEditing(false);
        setForm({
            id: null, name: '', part_number: '', description: '',
            requires_assembly: false, standard_hours: 0, sale_price: 0,
            is_active: true, image: null, image_url: '',
            materials: []
        });
        setImagePreview(null);
        setShowModal(true);
    };

    const openEditModal = async (product) => {
        setIsEditing(true);
        try {
            // Obtenemos el producto completo con sus materiales desde el backend
            const { data } = await API.get(`/products/${product.id}`);
            setForm({
                id: data.id,
                name: data.name,
                part_number: data.part_number || '',
                description: data.description || '',
                requires_assembly: data.requires_assembly == 1 || data.requires_assembly === true,
                standard_hours: data.standard_hours || 0,
                sale_price: parseFloat(data.sale_price) || 0,
                is_active: data.is_active == 1 || data.is_active === true,
                image: null,
                image_url: data.image_url || '',
                materials: data.materials || []
            });
            setImagePreview(data.image_url ? `${BASE_URL}${data.image_url}` : null);
            setShowModal(true);
        } catch (err) {
            toast.error('Error al cargar datos del producto.');
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setForm({ ...form, image: file });
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('name', form.name);
            formData.append('part_number', form.part_number);
            formData.append('description', form.description);
            formData.append('requires_assembly', form.requires_assembly);
            formData.append('standard_hours', form.standard_hours);
            formData.append('sale_price', form.sale_price);

            // Enviar listado de materiales como string JSON para procesar en multer
            if (form.materials && form.materials.length > 0) {
                formData.append('materials', JSON.stringify(form.materials));
            } else {
                formData.append('materials', JSON.stringify([]));
            }

            if (isEditing) {
                formData.append('is_active', form.is_active);
            }
            if (form.image) {
                formData.append('image', form.image);
            }

            if (isEditing) {
                await API.put(`/products/${form.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Producto actualizado exitosamente.');
            } else {
                await API.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Producto creado exitosamente.');
            }
            setShowModal(false);
            fetchProducts();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al guardar el producto.');
        }
    };

    const handleDelete = async (product) => {
        if (window.confirm(`¿Estás seguro de eliminar el producto "${product.name}"?\nEsta acción no se puede deshacer.`)) {
            try {
                await API.delete(`/products/${product.id}`);
                toast.success('Producto eliminado exitosamente.');
                fetchProducts();
            } catch (err) {
                toast.error(err.response?.data?.error || 'Error al eliminar el producto.');
            }
        }
    };

    const handleMaterialSelect = (item) => {
        if (form.materials.some(m => m.item_id === item.id)) {
            toast.warning(`El material "${item.name}" ya está en la lista.`);
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
                    quantity_required: 1 // Por defecto
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
                    <h1 style={{ fontWeight: 700 }}><i className="fas fa-layer-group mr-2 text-danger"></i>Maestro de Piezas</h1>
                    <small className="text-muted">Catálogo de piezas y productos fabricados</small>
                </div>
                {hasRole('ADMIN', 'VENTAS', 'SUPERVISOR') && (
                    <button className="btn btn-danger" onClick={openCreateModal}><i className="fas fa-plus mr-1"></i>Nuevo Producto</button>
                )}
            </div>

            <div className="card mb-3" style={{ borderRadius: '12px' }}>
                <div className="card-body py-2">
                    <input
                        className="form-control" placeholder="Buscar pieza por nombre o N° de parte..."
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
                                        <th style={{ width: '60px' }}>Imagen</th>
                                        <th>Nombre</th>
                                        <th>N° Parte</th>
                                        <th>Requiere Ensamblaje</th>
                                        <th>Est. Horas</th>
                                        <th>Estado</th>
                                        {hasRole('ADMIN', 'VENTAS', 'SUPERVISOR') && <th className="text-center">Acciones</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan="7" className="text-center py-4 text-muted">No se encontraron productos.</td></tr>
                                    ) : filtered.map(p => (
                                        <tr key={p.id}>
                                            <td>
                                                {p.image_url ? (
                                                    <img src={`${BASE_URL}${p.image_url}`} alt={p.name} style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ccc' }} />
                                                ) : (
                                                    <div style={{ width: '45px', height: '45px', background: '#e9ecef', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#adb5bd' }}>
                                                        <i className="fas fa-image"></i>
                                                    </div>
                                                )}
                                            </td>
                                            <td><strong>{p.name}</strong><br /><small className="text-muted">{p.description}</small></td>
                                            <td>{p.part_number || '—'}</td>
                                            <td>
                                                <span className={`badge badge-${p.requires_assembly ? 'info' : 'secondary'}`}>
                                                    {p.requires_assembly ? 'Sí' : 'No'}
                                                </span>
                                            </td>
                                            <td>{p.standard_hours} hrs</td>
                                            <td>
                                                <span className={`badge badge-${p.is_active ? 'success' : 'secondary'}`}>
                                                    {p.is_active ? 'Catálogo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            {hasRole('ADMIN', 'VENTAS', 'SUPERVISOR') && (
                                                <td className="text-center">
                                                    <button className="btn btn-sm btn-outline-primary mr-2" onClick={() => openEditModal(p)} title="Editar Producto">
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(p)} title="Eliminar Producto">
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
                                <h5 className="modal-title">{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</h5>
                                <button type="button" className="close text-white" onClick={() => setShowModal(false)}><span>&times;</span></button>
                            </div>
                            <form onSubmit={handleSave} encType="multipart/form-data">
                                <div className="modal-body">
                                    <div className="row">
                                        <div className="col-md-8">
                                            <div className="row">
                                                <div className="col-md-12 form-group">
                                                    <label>Nombre del Producto / Pieza <span className="text-danger">*</span></label>
                                                    <input className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                                </div>
                                                <div className="col-md-12 form-group">
                                                    <label>Número de Parte (SKU)</label>
                                                    <input className="form-control" value={form.part_number} onChange={e => setForm({ ...form, part_number: e.target.value })} />
                                                </div>
                                                <div className="col-md-12 form-group">
                                                    <label>Descripción</label>
                                                    <textarea className="form-control" rows="2" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}></textarea>
                                                </div>

                                                <div className="col-md-6 form-group mt-3">
                                                    <div className="custom-control custom-switch">
                                                        <input type="checkbox" className="custom-control-input" id="requiresAssembly" checked={form.requires_assembly} onChange={e => setForm({ ...form, requires_assembly: e.target.checked })} />
                                                        <label className="custom-control-label" htmlFor="requiresAssembly">Requiere Ensamblaje</label>
                                                    </div>
                                                </div>

                                                <div className="col-md-6 form-group">
                                                    <label>Horas Estándar (Fabricación)</label>
                                                    <input type="number" step="0.5" className="form-control" value={form.standard_hours} onChange={e => setForm({ ...form, standard_hours: parseFloat(e.target.value) || 0 })} />
                                                </div>
                                                <div className="col-md-6 form-group">
                                                    <label>Precio de Venta Base ($)</label>
                                                    <input type="number" step="0.01" className="form-control" value={form.sale_price} onChange={e => setForm({ ...form, sale_price: parseFloat(e.target.value) || 0 })} />
                                                </div>
                                                {isEditing && (
                                                    <div className="col-md-6 form-group">
                                                        <label>Estado</label>
                                                        <select className="form-control" value={form.is_active ? '1' : '0'} onChange={e => setForm({ ...form, is_active: e.target.value === '1' })}>
                                                            <option value="1">Activo / En Catálogo</option>
                                                            <option value="0">Obsoleto / Inactivo</option>
                                                        </select>
                                                    </div>
                                                )}
                                            </div>

                                            {/* SECCIÓN BOM (LISTA DE MATERIALES) */}
                                            <div className="card mt-4 shadow-sm" style={{ border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                                                <div className="card-header bg-light d-flex justify-content-between align-items-center">
                                                    <h6 className="mb-0 font-weight-bold"><i className="fas fa-list-ol mr-2 text-primary"></i>Lista de Materiales (BOM)</h6>
                                                    <button type="button" className="btn btn-sm btn-primary font-weight-bold" onClick={() => setShowInventoryModal(true)}>
                                                        <i className="fas fa-plus mr-1"></i> Añadir Insumo
                                                    </button>
                                                </div>
                                                <div className="card-body p-0">
                                                    {form.materials.length === 0 ? (
                                                        <div className="text-center p-4 text-muted border-bottom">
                                                            <i className="fas fa-box-open fa-2x mb-2 text-light"></i>
                                                            <p className="mb-0">Este producto no tiene materiales asignados (BOM vacío).</p>
                                                        </div>
                                                    ) : (
                                                        <table className="table table-sm table-striped mb-0">
                                                            <thead className="thead-light">
                                                                <tr>
                                                                    <th style={{ width: '45%' }}>Material / Código</th>
                                                                    <th style={{ width: '25%' }} className="text-center">Cant. Requerida</th>
                                                                    <th style={{ width: '20%' }} className="text-center">Unidad</th>
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
                                                <label>Fotografía de Pieza</label>
                                                <div className="border rounded p-2 mb-2" style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', overflow: 'hidden' }}>
                                                    {imagePreview ? (
                                                        <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                                    ) : (
                                                        <div className="text-muted"><i className="fas fa-camera fa-3x mb-2 d-block"></i> Sin Imagen</div>
                                                    )}
                                                </div>
                                                <div className="custom-file text-left">
                                                    <input type="file" className="custom-file-input" id="customFile" accept="image/*" onChange={handleImageChange} />
                                                    <label className="custom-file-label" htmlFor="customFile" data-browse="Elegir" style={{ overflow: 'hidden' }}>
                                                        {form.image ? form.image.name : 'Seleccionar archivo...'}
                                                    </label>
                                                </div>
                                                <small className="form-text text-muted">Formatos soportados: JPG, PNG, WEBP (Max: 5MB)</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-danger"><i className="fas fa-save mr-1"></i>{isEditing ? 'Guardar Cambios' : 'Crear Producto'}</button>
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
