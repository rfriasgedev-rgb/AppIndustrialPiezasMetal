import { useState, useEffect } from 'react';
import { hrService } from '../services/hr.service';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

export default function ProductionLines() {
  const [lines, setLines] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '', description: '', leader_employee_id: '', employee_ids: [] });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [linesData, empData] = await Promise.all([
        hrService.getProductionLines(),
        hrService.getEmployees()
      ]);
      setLines(linesData);
      setEmployees(empData.filter(e => e.is_active)); // Only active employees can be assigned
    } catch (error) {
      toast.error('Error cargando datos');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await hrService.updateProductionLine(formData.id, formData);
        toast.success('Línea actualizada');
      } else {
        await hrService.createProductionLine(formData);
        toast.success('Línea creada');
      }
      setShowModal(false);
      loadAllData();
    } catch (error) {
       toast.error(error.response?.data?.error || 'Error al guardar');
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Eliminar línea?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await hrService.deleteProductionLine(id);
        toast.success('Línea eliminada');
        loadAllData();
      } catch (error) {
        toast.error('Error al eliminar');
      }
    }
  };

  const openForm = (item = null) => {
    if (item) {
      setFormData({
        ...item,
        leader_employee_id: item.leader_employee_id || '',
        employee_ids: item.employees ? item.employees.map(e => e.employee_id) : []
      });
    } else {
      setFormData({ id: null, name: '', description: '', leader_employee_id: '', employee_ids: [] });
    }
    setShowModal(true);
  };

  const toggleEmployee = (empId) => {
    setFormData(prev => {
        const ids = prev.employee_ids.includes(empId)
            ? prev.employee_ids.filter(id => id !== empId)
            : [...prev.employee_ids, empId];
        return { ...prev, employee_ids: ids };
    });
  };

  return (
    <div className="container-fluid fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold m-0"><i className="fas fa-network-wired me-2"></i> Líneas de Producción</h2>
        <button className="btn btn-primary shadow-sm" onClick={() => openForm()}>
          <i className="fas fa-plus me-1"></i> Nueva Línea
        </button>
      </div>

      <div className="row">
        {lines.map((line) => (
          <div className="col-md-6 mb-4" key={line.id}>
            <div className="card shadow-sm border-0 rounded-4 h-100">
                <div className="card-header bg-white border-bottom-0 pt-4 pb-0 d-flex justify-content-between">
                    <h5 className="fw-bold text-primary mb-0">{line.name}</h5>
                    <div>
                        <button className="btn btn-sm btn-light text-secondary me-2" onClick={() => openForm(line)}>
                            <i className="fas fa-edit"></i>
                        </button>
                        <button className="btn btn-sm btn-light text-danger" onClick={() => handleDelete(line.id)}>
                            <i className="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div className="card-body pt-2">
                    <p className="text-muted small mb-3">{line.description}</p>
                    
                    <div className="mb-3 px-3 py-2 bg-light rounded-3">
                        <small className="d-block text-muted fw-bold mb-1">LÍDER DE LÍNEA</small>
                        {line.leader_first_name ? 
                            <span><i className="fas fa-star text-warning me-1"></i> {line.leader_first_name} {line.leader_last_name}</span> : 
                            <span className="text-muted fst-italic">Sin asignar</span>
                        }
                    </div>

                    <h6 className="fw-bold mb-3"><i className="fas fa-users text-secondary me-2"></i> Personal de apoyo ({line.employees?.length || 0})</h6>
                    {line.employees && line.employees.length > 0 ? (
                        <ul className="list-group list-group-flush border-top">
                            {line.employees.map(emp => (
                                <li key={emp.employee_id} className="list-group-item px-0 py-2 d-flex justify-content-between align-items-center">
                                    <span>{emp.first_name} {emp.last_name}</span>
                                    <span className="badge bg-secondary">{emp.role_name}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted text-center py-2 bg-light rounded-3">No hay empleados asignados</p>
                    )}
                </div>
            </div>
          </div>
        ))}
        {lines.length === 0 && (
            <div className="col-12"><p className="text-center text-muted">No hay líneas de producción registradas.</p></div>
        )}
      </div>

      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold">{formData.id ? 'Editar' : 'Nueva'} Línea</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="row mb-3">
                    <div className="col-md-6">
                        <label className="form-label fw-medium">Nombre de Línea</label>
                        <input type="text" className="form-control" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej. Línea 1" />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-medium">Líder de Línea</label>
                        <select className="form-select" value={formData.leader_employee_id} onChange={e => setFormData({...formData, leader_employee_id: e.target.value})}>
                            <option value="">(Sin asignar)</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} - {emp.role_name}</option>
                            ))}
                        </select>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="form-label fw-medium">Descripción</label>
                    <textarea className="form-control" rows="2" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                  </div>

                  <hr className="my-4"/>
                  <h6 className="fw-bold mb-3">Establecer Personal de Línea</h6>
                  
                  <div className="bg-light p-3 rounded-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      <div className="row">
                          {employees.map(emp => (
                              <div className="col-md-6 mb-2" key={emp.id}>
                                  <div className="form-check border p-2 rounded bg-white">
                                    <input 
                                        className="form-check-input ms-1" 
                                        type="checkbox" 
                                        id={`emp_${emp.id}`}
                                        checked={formData.employee_ids.includes(emp.id)}
                                        onChange={() => toggleEmployee(emp.id)}
                                    />
                                    <label className="form-check-label w-100 ms-2" htmlFor={`emp_${emp.id}`}>
                                        {emp.first_name} {emp.last_name} <br/>
                                        <small className="text-secondary">{emp.role_name} | Dept: {emp.department_name}</small>
                                    </label>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="d-flex gap-2 justify-content-end mt-4">
                    <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary px-4">Guardar</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
