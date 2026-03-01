import { useEffect, useState } from 'react';
import API from '../api/client';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';

export default function MaterialCategories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const { hasRole } = useAuth();

    // CRUD State
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ id: null, name: '', description: '', unit_of_measure: '' });

    const fetchCategories = () => {
        setLoading(true);
        API.get('/categories')
            .then(res => {
                setCategories(res.data);
                setLoading(false);
            })
            .catch(err => {
                toast.error('Error cargando categorías.');
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const openCreateModal = () => {
        setIsEditing(false);
        setForm({ id: null, name: '', description: '', unit_of_measure: '' });
        setShowModal(true);
    };

    const openEditModal = (cat) => {
        setIsEditing(true);
        setForm({
            id: cat.id,
            name: cat.name,
            description: cat.description || '',
            unit_of_measure: cat.unit_of_measure || ''
        });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await API.put(`/categories/${form.id}`, form);
                toast.success('Categoría actualizada.');
            } else {
                await API.post('/categories', form);
                toast.success('Categoría creada exitosamente.');
            }
            setShowModal(false);
            fetchCategories();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al guardar categoría.');
        }
    };

    const handleDelete = async (id, name) => {
        const result = await Swal.fire({
            title: '¿Confirmar eliminación?',
            text: `¿Eliminar permanentemente la categoría "${name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Eliminar'
        });

        if (result.isConfirmed) {
            try {
                await API.delete(`/categories/${id}`);
                Swal.fire('Eliminado', 'Categoría eliminada.', 'success');
                fetchCategories();
            } catch (err) {
                Swal.fire('Error', err.response?.data?.error || 'No se pudo eliminar.', 'error');
            }
        }
    };

    return (
        <>
            <div className="content-header mb-3 d-flex align-items-center justify-content-between">
                <div>
                    <h1 style={{ fontWeight: 700 }}><i className="fas fa-cubes mr-2" style={{ color: '#e94560' }}></i>Categorías de Material</h1>
                    <small className="text-muted">Administración de Familias de Materia Prima</small>
                </div>
                {hasRole('ADMIN') && (
                    <button className="btn btn-danger" onClick={openCreateModal}>
                        <i className="fas fa-plus mr-1"></i> Nueva Categoría
                    </button>
                )}
            </div>

            <div className="card" style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover mb-0">
                            <thead style={{ background: '#1a1a2e', color: '#fff' }}>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre de Categoría</th>
                                    <th>Descripción</th>
                                    <th>Unidad Base Predeterminada</th>
                                    {hasRole('ADMIN') && <th className="text-center">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" className="text-center py-4"><i className="fas fa-spinner fa-spin text-secondary"></i></td></tr>
                                ) : categories.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center py-4 text-muted">No hay categorías registradas.</td></tr>
                                ) : (
                                    categories.map(cat => (
                                        <tr key={cat.id}>
                                            <td className="text-muted">{cat.id}</td>
                                            <td><strong>{cat.name}</strong></td>
                                            <td>{cat.description || <span className="text-muted italic">Sin descripción</span>}</td>
                                            <td><span className="badge badge-secondary">{cat.unit_of_measure}</span></td>
                                            {hasRole('ADMIN') && (
                                                <td className="text-center">
                                                    <button className="btn btn-sm btn-outline-primary mr-2" onClick={() => openEditModal(cat)} title="Editar">
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(cat.id, cat.name)} title="Eliminar">
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Crear/Editar */}
            {showModal && (
                <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content" style={{ borderRadius: '12px' }}>
                            <div className="modal-header" style={{ background: '#1a1a2e', color: '#fff', borderRadius: '12px 12px 0 0' }}>
                                <h5 className="modal-title">{isEditing ? 'Editar Categoría' : 'Nueva Categoría'}</h5>
                                <button type="button" className="close text-white" onClick={() => setShowModal(false)}>&times;</button>
                            </div>
                            <form onSubmit={handleSave}>
                                <div className="modal-body">
                                    <div className="form-group mb-3">
                                        <label>Nombre <span className="text-danger">*</span></label>
                                        <input type="text" className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Acero" />
                                    </div>
                                    <div className="form-group mb-3">
                                        <label>Descripción</label>
                                        <textarea className="form-control" rows="2" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}></textarea>
                                    </div>
                                    <div className="form-group mb-3">
                                        <label>Unidad de Medida (Antigua ref.) <span className="text-danger">*</span></label>
                                        <input type="text" className="form-control" required value={form.unit_of_measure} onChange={e => setForm({ ...form, unit_of_measure: e.target.value })} placeholder="Ej: kg" />
                                        <small className="text-muted">Valor por defecto si el material no trae una unidad en ID, requerimiento legacy.</small>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-danger"><i className="fas fa-save mr-1"></i>Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
