import React, { useState, useEffect } from 'react';
import API from '../api/client';

export default function ModalInventorySearch({ show, onClose, onSelect }) {
    const [items, setItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show) {
            setSearchTerm('');
            fetchItems('');
        }
    }, [show]);

    const fetchItems = async (search) => {
        setLoading(true);
        try {
            const { data } = await API.get('/inventory');
            if (search) {
                const lowerSearch = search.toLowerCase();
                setItems(data.filter(p =>
                    p.name.toLowerCase().includes(lowerSearch) ||
                    (p.sku && p.sku.toLowerCase().includes(lowerSearch)) ||
                    (p.category && p.category.toLowerCase().includes(lowerSearch))
                ));
            } else {
                setItems(data);
            }
        } catch (error) {
            console.error("Error cargando inventario:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        fetchItems(e.target.value);
    };

    if (!show) return null;

    return (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content" style={{ borderRadius: '12px', border: 'none' }}>

                    {/* Header */}
                    <div className="modal-header" style={{ background: '#007bff', color: '#fff', borderRadius: '12px 12px 0 0' }}>
                        <h5 className="modal-title font-weight-bold">
                            <i className="fas fa-boxes mr-2 text-warning"></i> Inventario de Materiales
                        </h5>
                        <button type="button" className="close text-white" onClick={onClose}>
                            <span>&times;</span>
                        </button>
                    </div>

                    {/* Body con Barra de Búsqueda Fija */}
                    <div className="modal-body p-0">
                        <div className="p-3 border-bottom" style={{ backgroundColor: '#f8f9fa' }}>
                            <div className="input-group input-group-lg">
                                <div className="input-group-prepend">
                                    <span className="input-group-text bg-white"><i className="fas fa-search text-primary"></i></span>
                                </div>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Buscar por Nombre del Material, Código (SKU) o Categoría..."
                                    value={searchTerm}
                                    onChange={handleSearch}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Grid de Resultados */}
                        <div className="p-0" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                            {loading ? (
                                <div className="text-center p-4"><i className="fas fa-spinner fa-spin fa-2x text-muted"></i></div>
                            ) : items.length > 0 ? (
                                <table className="table table-hover table-striped mb-0">
                                    <thead className="thead-light sticky-top" style={{ zIndex: 1 }}>
                                        <tr>
                                            <th style={{ width: '15%' }}>No. Artículo</th>
                                            <th style={{ width: '30%' }}>Nombre de Material</th>
                                            <th style={{ width: '25%' }}>Categoría</th>
                                            <th style={{ width: '10%' }} className="text-center">Stock Disp.</th>
                                            <th style={{ width: '10%' }} className="text-center">Unidad</th>
                                            <th style={{ width: '10%' }} className="text-center">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map(p => (
                                            <tr key={p.id}>
                                                <td className="align-middle text-muted font-weight-bold">{p.sku || 'N/A'}</td>
                                                <td className="align-middle text-primary" style={{ fontWeight: 600 }}>{p.name}</td>
                                                <td className="align-middle text-muted small">{p.category}</td>
                                                <td className="align-middle text-center font-weight-bold">
                                                    <span className={p.quantity_available <= p.reorder_point ? 'text-danger' : 'text-success'}>
                                                        {parseFloat(p.quantity_available).toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="align-middle text-center">{p.unit_of_measure}</td>
                                                <td className="align-middle text-center">
                                                    <button
                                                        className="btn btn-sm btn-outline-primary"
                                                        style={{ borderRadius: '20px', fontWeight: 'bold' }}
                                                        onClick={() => onSelect(p)}
                                                    >
                                                        <i className="fas fa-plus mr-1"></i> Añadir
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center p-5 text-muted">
                                    <i className="fas fa-box-open fa-3x mb-3 text-light"></i>
                                    <h5>No se encontraron materiales en el inventario.</h5>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
