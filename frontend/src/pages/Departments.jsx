import { useState, useEffect } from 'react';
import { hrService } from '../services/hr.service';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

export default function Departments() {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '', description: '' });

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const data = await hrService.getDepartments();
      setDepartments(data);
    } catch (error) {
      toast.error(t('departments.loadError'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await hrService.updateDepartment(formData.id, formData);
        toast.success(t('departments.updateSuccess'));
      } else {
        await hrService.createDepartment(formData);
        toast.success(t('departments.createSuccess'));
      }
      setShowModal(false);
      loadDepartments();
    } catch (error) {
       toast.error(error.response?.data?.error || t('departments.saveError'));
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: t('departments.deleteConfirmTitle'),
      text: t('departments.deleteConfirmText'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('departments.btnYesDelete'),
      cancelButtonText: t('departments.btnCancel')
    });

    if (result.isConfirmed) {
      try {
        await hrService.deleteDepartment(id);
        toast.success(t('departments.deleteSuccess'));
        loadDepartments();
      } catch (error) {
        toast.error(t('departments.deleteError'));
      }
    }
  };

  const openForm = (dept = null) => {
    if (dept) {
      setFormData(dept);
    } else {
      setFormData({ id: null, name: '', description: '' });
    }
    setShowModal(true);
  };

  return (
    <div className="container-fluid fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold m-0"><i className="fas fa-building me-2"></i> {t('departments.pageTitle')}</h2>
        <button className="btn btn-primary shadow-sm" onClick={() => openForm()}>
          <i className="fas fa-plus me-1"></i> {t('departments.btnNew')}
        </button>
      </div>

      <div className="card shadow-sm border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4">{t('departments.colName')}</th>
                  <th>{t('departments.colDesc')}</th>
                  <th className="text-end pe-4">{t('departments.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept.id}>
                    <td className="ps-4 fw-medium">{dept.name}</td>
                    <td>{dept.description}</td>
                    <td className="text-end pe-4">
                      <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => openForm(dept)}>
                        <i className="fas fa-edit"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(dept.id)}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {departments.length === 0 && (
                  <tr><td colSpan="3" className="text-center py-4 text-muted">{t('departments.noRecords')}</td></tr>
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
                <h5 className="modal-title fw-bold">{formData.id ? t('departments.modalEditTitle') : t('departments.modalNewTitle')}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-medium">{t('departments.lblDeptName')}</label>
                    <input type="text" className="form-control" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder={t('departments.lblNamePlaceholder')} />
                  </div>
                  <div className="mb-4">
                    <label className="form-label fw-medium">{t('departments.lblDescription')}</label>
                    <textarea className="form-control" rows="3" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder={t('departments.descPlaceholder')}></textarea>
                  </div>
                  <div className="d-flex gap-2 justify-content-end">
                    <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>{t('departments.btnCancel')}</button>
                    <button type="submit" className="btn btn-primary px-4">{t('departments.btnSave')}</button>
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
