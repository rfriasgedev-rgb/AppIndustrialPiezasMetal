import { useState, useEffect } from 'react';
import { hrService } from '../services/hr.service';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

export default function Schedules() {
  const { t } = useTranslation();
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
      toast.error(t('schedules.loadError'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await hrService.updateSchedule(formData.id, formData);
        toast.success(t('schedules.updateSuccess'));
      } else {
        await hrService.createSchedule(formData);
        toast.success(t('schedules.createSuccess'));
      }
      setShowModal(false);
      loadSchedules();
    } catch (error) {
       toast.error(error.response?.data?.error || t('schedules.saveError'));
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: t('schedules.deleteConfirmTitle'),
      text: t('schedules.deleteConfirmText'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('schedules.btnYesDelete'),
      cancelButtonText: t('schedules.btnCancel')
    });

    if (result.isConfirmed) {
      try {
        await hrService.deleteSchedule(id);
        toast.success(t('schedules.deleteSuccess'));
        loadSchedules();
      } catch (error) {
        toast.error(t('schedules.deleteError'));
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
        <h2 className="fw-bold m-0"><i className="fas fa-clock me-2"></i> {t('schedules.pageTitle')}</h2>
        <button className="btn btn-primary shadow-sm" onClick={() => openForm()}>
          <i className="fas fa-plus me-1"></i> {t('schedules.btnNew')}
        </button>
      </div>

      <div className="card shadow-sm border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4">{t('schedules.colShift')}</th>
                  <th>{t('schedules.colStartTime')}</th>
                  <th>{t('schedules.colEndTime')}</th>
                  <th className="text-end pe-4">{t('schedules.colActions')}</th>
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
                  <tr><td colSpan="4" className="text-center py-4 text-muted">{t('schedules.noRecords')}</td></tr>
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
                <h5 className="modal-title fw-bold">{formData.id ? t('schedules.modalEditTitle') : t('schedules.modalNewTitle')}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-medium">{t('schedules.lblName')}</label>
                    <input type="text" className="form-control" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="row mb-4">
                    <div className="col">
                       <label className="form-label fw-medium">{t('schedules.lblStartTime')}</label>
                       <input type="time" className="form-control" required value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                    </div>
                    <div className="col">
                       <label className="form-label fw-medium">{t('schedules.lblEndTime')}</label>
                       <input type="time" className="form-control" required value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                    </div>
                  </div>
                  <div className="d-flex gap-2 justify-content-end">
                    <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>{t('schedules.btnCancel')}</button>
                    <button type="submit" className="btn btn-primary px-4">{t('schedules.btnSave')}</button>
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
