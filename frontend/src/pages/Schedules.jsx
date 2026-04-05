import { useState, useEffect } from 'react';
import { hrService } from '../services/hr.service';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

export default function Schedules() {
  const [schedules, setSchedules] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '', start_time: '', end_time: '' });

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const data = await hrService.getSchedules();
      setSchedules(data);
    } catch (error) {
      toast.error('Error cargando horarios');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await hrService.updateSchedule(formData.id, formData);
        toast.success('Horario actualizado');
      } else {
        await hrService.createSchedule(formData);
        toast.success('Horario creado');
      }
      setShowModal(false);
      loadSchedules();
    } catch (error) {
       toast.error(error.response?.data?.error || 'Error al guardar');
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Eliminar horario?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await hrService.deleteSchedule(id);
        toast.success('Horario eliminado');
        loadSchedules();
      } catch (error) {
        toast.error('Error al eliminar');
      }
    }
  };

  const openForm = (item = null) => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({ id: null, name: '', start_time: '', end_time: '' });
    }
    setShowModal(true);
  };

  return (
    <div className="container-fluid fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold m-0"><i className="fas fa-clock me-2"></i> Horarios</h2>
        <button className="btn btn-primary shadow-sm" onClick={() => openForm()}>
          <i className="fas fa-plus me-1"></i> Nuevo Horario
        </button>
      </div>

      <div className="card shadow-sm border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4">Turno</th>
                  <th>Hora Entrada</th>
                  <th>Hora Salida</th>
                  <th className="text-end pe-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((item) => (
                  <tr key={item.id}>
                    <td className="ps-4 fw-medium">{item.name}</td>
                    <td>{item.start_time}</td>
                    <td>{item.end_time}</td>
                    <td className="text-end pe-4">
                      <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => openForm(item)}>
                        <i className="fas fa-edit"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item.id)}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {schedules.length === 0 && (
                  <tr><td colSpan="4" className="text-center py-4 text-muted">No hay horarios registrados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold">{formData.id ? 'Editar' : 'Nuevo'} Horario</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-medium">Nombre (Ej. Mañana)</label>
                    <input type="text" className="form-control" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="row mb-4">
                    <div className="col">
                       <label className="form-label fw-medium">Hora de Entrada</label>
                       <input type="time" className="form-control" required value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                    </div>
                    <div className="col">
                       <label className="form-label fw-medium">Hora de Salida</label>
                       <input type="time" className="form-control" required value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                    </div>
                  </div>
                  <div className="d-flex gap-2 justify-content-end">
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
