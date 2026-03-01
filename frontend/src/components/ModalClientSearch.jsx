import React, { useState, useEffect } from 'react';
import API from '../api/client';

export default function ModalClientSearch({ show, onClose, onSelect }) {
    const [clients, setClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show) {
            setSearchTerm('');
            fetchClients('');
        }
    }, [show]);

    const fetchClients = async (search) => {
        setLoading(true);
        try {
            // Nota: El backend de clientes podría necesitar soporte para ?search= en el futuro
            // Por ahora filtramos en frontend si la lista base no es masiva.
            const { data } = await API.get('/clients');
            if (search) {
                const lowerSearch = search.toLowerCase();
                setClients(data.filter(c =>
                    c.company_name.toLowerCase().includes(lowerSearch) ||
                    (c.tax_id && c.tax_id.toLowerCase().includes(lowerSearch))
                ));
            } else {
                setClients(data);
            }
        } catch (error) {
            console.error("Error cargando clientes:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        fetchClients(e.target.value);
    };

    if (!show) return null;

    return (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content" style={{ borderRadius: '12px', border: 'none' }}>

                    {/* Header */}
                    <div className="modal-header" style={{ background: '#16213e', color: '#fff', borderRadius: '12px 12px 0 0' }}>
                        <h5 className="modal-title font-weight-bold">
                            <i className="fas fa-search mr-2 text-danger"></i> Buscar Cliente
                        </h5>
                        <button type="button" className="close text-white" onClick={onClose}>
                            <span>&times;</span>
                        </button>
                    </div>

                    {/* Body con Barra de Búsqueda Fija */}
                    <div className="modal-body p-0">
                        <div className="p-3 border-bottom" style={{ backgroundColor: '#f8f9fa' }}>
                            <div className="input-group">
                                <div className="input-group-prepend">
                                    <span className="input-group-text bg-white"><i className="fas fa-search"></i></span>
                                </div>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Buscar por Razón Social o RIF/NIT..."
                                    value={searchTerm}
                                    onChange={handleSearch}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Grid de Resultados */}
                        <div className="p-0" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {loading ? (
                                <div className="text-center p-4"><i className="fas fa-spinner fa-spin fa-2x text-muted"></i></div>
                            ) : clients.length > 0 ? (
                                <table className="table table-hover table-striped mb-0">
                                    <thead className="thead-light sticky-top">
                                        <tr>
                                            <th>Razón Social</th>
                                            <th>Identificación Tributaria</th>
                                            <th className="text-center">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clients.map(c => (
                                            <tr key={c.id}>
                                                <td className="align-middle">
                                                    <strong>{c.company_name}</strong>
                                                </td>
                                                <td className="align-middle text-muted">{c.tax_id || 'N/A'}</td>
                                                <td className="align-middle text-center">
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        style={{ borderRadius: '20px', fontWeight: 'bold' }}
                                                        onClick={() => onSelect(c)}
                                                    >
                                                        <i className="fas fa-check mr-1"></i> Seleccionar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center p-5 text-muted">
                                    <i className="fas fa-box-open fa-3x mb-3 text-light"></i>
                                    <h5>No se encontraron clientes</h5>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
