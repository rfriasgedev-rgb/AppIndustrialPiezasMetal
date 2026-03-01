import React, { useState, useEffect } from 'react';
import API from '../api/client';

export default function ModalProductSearch({ show, onClose, onSelect }) {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show) {
            setSearchTerm('');
            fetchProducts('');
        }
    }, [show]);

    const fetchProducts = async (search) => {
        setLoading(true);
        try {
            const { data } = await API.get('/products');
            if (search) {
                const lowerSearch = search.toLowerCase();
                setProducts(data.filter(p =>
                    p.name.toLowerCase().includes(lowerSearch) ||
                    (p.part_number && p.part_number.toLowerCase().includes(lowerSearch)) ||
                    (p.description && p.description.toLowerCase().includes(lowerSearch))
                ));
            } else {
                setProducts(data);
            }
        } catch (error) {
            console.error("Error cargando productos:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        fetchProducts(e.target.value);
    };

    if (!show) return null;

    return (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content" style={{ borderRadius: '12px', border: 'none' }}>

                    {/* Header */}
                    <div className="modal-header" style={{ background: '#16213e', color: '#fff', borderRadius: '12px 12px 0 0' }}>
                        <h5 className="modal-title font-weight-bold">
                            <i className="fas fa-cubes mr-2 text-danger"></i> Catálogo Maestro de Piezas
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
                                    <span className="input-group-text bg-white"><i className="fas fa-search text-danger"></i></span>
                                </div>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Buscar por Nombre de Pieza, Número de Parte o Descripción Técnica..."
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
                            ) : products.length > 0 ? (
                                <table className="table table-hover table-striped mb-0">
                                    <thead className="thead-light sticky-top" style={{ zIndex: 1 }}>
                                        <tr>
                                            <th style={{ width: '15%' }}>No. Parte</th>
                                            <th style={{ width: '30%' }}>Nombre de Pieza</th>
                                            <th style={{ width: '35%' }}>Descripción Breve</th>
                                            <th style={{ width: '10%' }} className="text-center">Ensamblaje</th>
                                            <th style={{ width: '10%' }} className="text-center">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map(p => (
                                            <tr key={p.id}>
                                                <td className="align-middle text-muted font-weight-bold">{p.part_number || 'N/A'}</td>
                                                <td className="align-middle text-primary" style={{ fontWeight: 600 }}>{p.name}</td>
                                                <td className="align-middle text-muted small">{p.description?.substring(0, 60)} {p.description?.length > 60 ? '...' : ''}</td>
                                                <td className="align-middle text-center">
                                                    {p.requires_assembly ?
                                                        <span className="badge badge-warning">Requiere</span> :
                                                        <span className="badge badge-secondary">No</span>
                                                    }
                                                </td>
                                                <td className="align-middle text-center">
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
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
                                    <i className="fas fa-boxes fa-3x mb-3 text-light"></i>
                                    <h5>No se encontraron piezas en el catálogo maestro.</h5>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
